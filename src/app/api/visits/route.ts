import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { confirmVisitFromHold } from "@/lib/scheduling";

// GH-506 "Mutual match" — turning a hold into a real Visit record. Instant
// vs approval-required is decided inside confirmVisitFromHold based on the
// listing's bookingMode, per GH-504.
export async function POST(request: Request) {
  try {
    const seeker = await requireUser("SEEKER");
    const body = await request.json();
    const { holdId, idempotencyKey } = body;
    if (!holdId) {
      return NextResponse.json({ error: "Missing holdId." }, { status: 400 });
    }
    const visit = await confirmVisitFromHold({ holdId, seekerId: seeker.id, idempotencyKey: idempotencyKey ?? holdId });
    return NextResponse.json({ visit });
  } catch (e) {
    return handleApiError(e);
  }
}
