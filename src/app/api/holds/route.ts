import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { createHold } from "@/lib/scheduling";

// GH-505 "Temporary hold" — reserves a slot for 10 minutes so a seeker can
// finish the confirm step without losing it to another seeker.
export async function POST(request: Request) {
  try {
    const seeker = await requireUser("SEEKER");
    const body = await request.json();
    const { slotId, idempotencyKey } = body;
    if (!slotId || !idempotencyKey) {
      return NextResponse.json({ error: "Missing slotId or idempotencyKey." }, { status: 400 });
    }
    const hold = await createHold({ slotId, seekerId: seeker.id, idempotencyKey });
    return NextResponse.json({ hold });
  } catch (e) {
    return handleApiError(e);
  }
}
