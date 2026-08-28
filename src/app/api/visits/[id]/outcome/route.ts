import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { submitOutcome } from "@/lib/scheduling";
import type { VisitOutcome } from "@prisma/client";

// GH-801 "Outcome capture" — pass/maybe/shortlist/offer/could-not-visit.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser("SEEKER");
    const { id } = await params;
    const body = await request.json();
    const outcome = body.outcome as VisitOutcome;
    const visit = await submitOutcome(id, outcome, body.note);
    return NextResponse.json({ visit });
  } catch (e) {
    return handleApiError(e);
  }
}
