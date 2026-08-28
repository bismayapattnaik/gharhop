import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { AuthError } from "@/lib/auth";

export function handleApiError(e: unknown) {
  if (e instanceof AuthError || e instanceof AppError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
