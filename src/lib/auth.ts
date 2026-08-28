import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Role, User } from "@prisma/client";

// Prototype-only session secret. Move to a real secret manager (see PRD
// section 11 "Security engineering baseline") before this goes anywhere
// past a local demo.
const SESSION_SECRET = "gharhop-prototype-secret-do-not-use-in-prod";
const COOKIE_NAME = "gharhop_session";

function sign(value: string): string {
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
  return `${value}.${sig}`;
}

function verify(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
  return sig === expected ? value : null;
}

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return verify(raw);
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser(role?: Role): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Not signed in", 401);
  }
  if (role && user.role !== role) {
    throw new AuthError(`Requires ${role} role`, 403);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
