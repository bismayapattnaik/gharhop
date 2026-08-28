import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { completeVisit } from "@/lib/scheduling";

// GH-608 "Completion" — either party can mark it; disputes stay reviewable
// (not modeled in the prototype, but the outcome is never silently assumed).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const visit = await completeVisit(id);
    return NextResponse.json({ visit });
  } catch (e) {
    return handleApiError(e);
  }
}
