import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { grantWelcomeCreditIfNew } from "@/lib/billing";
import type { Role } from "@prisma/client";

// Mock OTP: this is a prototype, so any phone number "logs in" without
// actually sending an SMS (PRD GH-101 describes the real OTP flow — that
// needs an SMS/DLT provider contract, which is out of scope for the demo).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = String(body.phone ?? "").trim();
    const name = String(body.name ?? "").trim();
    const role = body.role as Role;

    if (!phone || phone.length < 6) {
      return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
    }
    if (!["SEEKER", "OWNER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Choose a role." }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      if (!name) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
      user = await prisma.user.create({ data: { phone, name, role } });
      // GharHop Free's one welcome Rush Credit (business plan section 3).
      if (role === "SEEKER") await grantWelcomeCreditIfNew(user.id);
    }

    await createSession(user.id);
    return NextResponse.json({ user });
  } catch (e) {
    return handleApiError(e);
  }
}
