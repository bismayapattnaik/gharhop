import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { acceptReschedule } from "@/lib/scheduling";

// Seeker accepts the owner's proposed alternate time. Declining reuses the
// existing /cancel endpoint — no separate route needed for that direction.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const seeker = await requireUser("SEEKER");
    const { id } = await params;
    const visit = await acceptReschedule({ visitId: id, seekerId: seeker.id });
    return NextResponse.json({ visit });
  } catch (e) {
    return handleApiError(e);
  }
}
