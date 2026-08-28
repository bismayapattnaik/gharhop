import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { proposeReschedule } from "@/lib/scheduling";

// GH-604 "Reschedule" / the launch plan's "counter-proposal" booking mode —
// owner can't make the requested time and proposes a different open slot.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id } = await params;
    const body = await request.json();
    if (!body.newSlotId) {
      return NextResponse.json({ error: "Missing newSlotId." }, { status: 400 });
    }
    const visit = await proposeReschedule({ visitId: id, ownerId: owner.id, newSlotId: body.newSlotId });
    return NextResponse.json({ visit });
  } catch (e) {
    return handleApiError(e);
  }
}
