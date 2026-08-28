import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { markNoShow } from "@/lib/scheduling";

// GH-609 "No-show" — recorded by the counterparty (owner marks a seeker
// no-show, seeker marks a host no-show). Feeds the reliability score.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await request.json();
    const who = body.who === "host" ? "host" : "seeker";
    await markNoShow(id, who);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
