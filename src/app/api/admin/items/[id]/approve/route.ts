import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { notify } from "@/lib/notifications";

// GH-A102 "Verification queue" — admin approves a PENDING_VERIFICATION
// listing, publishing it to seeker search.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser("ADMIN");
    const { id } = await params;
    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { property: true } });
    if (!item) throw new NotFoundError("Listing not found");
    if (item.status !== "PENDING_VERIFICATION") throw new ConflictError("This listing isn't awaiting review.");

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: { status: "ACTIVE", lastConfirmedAt: new Date(), rejectionReason: null },
    });
    await notify(item.property.ownerId, "LISTING_APPROVED", `Your listing "${item.property.title}" was approved and is now live.`, `/owner/items/${id}`);
    return NextResponse.json({ item: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
