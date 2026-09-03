import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { notify } from "@/lib/notifications";

// GH-A102 "Verification queue" — admin rejects a PENDING_VERIFICATION
// listing with a reason; owner can edit and resubmit (reconfirm -> back to
// PENDING_VERIFICATION, per src/app/api/items/[id]/reconfirm/route.ts).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser("ADMIN");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = String(body.reason ?? "").trim();
    if (!reason) {
      return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { property: true } });
    if (!item) throw new NotFoundError("Listing not found");
    if (item.status !== "PENDING_VERIFICATION") throw new ConflictError("This listing isn't awaiting review.");

    const updated = await prisma.inventoryItem.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason } });
    await notify(item.property.ownerId, "LISTING_REJECTED", `Your listing "${item.property.title}" was rejected: ${reason}`, `/owner/items/${id}`);
    return NextResponse.json({ item: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
