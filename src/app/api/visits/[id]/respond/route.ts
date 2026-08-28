import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ownerRespond } from "@/lib/scheduling";

// GH-405 "Request inbox" — owner accepts or declines a REQUESTED visit
// (only relevant when the listing's bookingMode is APPROVAL).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id } = await params;
    const body = await request.json();
    const action = body.action === "accept" ? "accept" : "reject";
    const visit = await ownerRespond({ visitId: id, ownerId: owner.id, action });
    return NextResponse.json({ visit });
  } catch (e) {
    return handleApiError(e);
  }
}
