import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError } from "@/lib/errors";
import { verifyMoveIn } from "@/lib/billing";

// Verified move-in (business plan section 4) — the owner (or admin, as an
// operational override) confirms a tenancy actually started on this unit.
// Charges the owner's move-in fee unless they hold an active FastFill
// subscription (see verifyMoveIn in lib/billing.ts).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (user.role !== "OWNER" && user.role !== "ADMIN") throw new ForbiddenError("Owners or admins only");
    const { id } = await params;
    const item = await verifyMoveIn(id, user.id, user.role === "ADMIN");
    return NextResponse.json({ item });
  } catch (e) {
    return handleApiError(e);
  }
}
