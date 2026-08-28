import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ownerRespond } from "@/lib/scheduling";
import { ForbiddenError } from "@/lib/errors";

// GH-405 "Request inbox" — owner accepts or declines a REQUESTED visit
// (only relevant when the listing's bookingMode is APPROVAL). Admins can
// also act here as an operational override (minimum admin dashboard).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (user.role !== "OWNER" && user.role !== "ADMIN") throw new ForbiddenError("Owners or admins only");
    const { id } = await params;
    const body = await request.json();
    const action = body.action === "accept" ? "accept" : "reject";
    const visit = await ownerRespond({ visitId: id, actorId: user.id, action, adminOverride: user.role === "ADMIN" });
    return NextResponse.json({ visit });
  } catch (e) {
    return handleApiError(e);
  }
}
