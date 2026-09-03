import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError, ConflictError } from "@/lib/errors";
import type { ListingStatus } from "@prisma/client";

// GH-O304 "One-tap reconfirm" for an already-ACTIVE listing just bumps the
// freshness clock. For a DRAFT or REJECTED listing this is "submit for
// review" instead — it enters the admin verification queue rather than
// going live directly (PRD section 9 listing lifecycle: DRAFT ->
// PENDING_VERIFICATION -> ACTIVE/REJECTED).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id } = await params;

    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { property: true } });
    if (!item) throw new NotFoundError("Listing not found");
    if (item.property.ownerId !== owner.id) throw new ForbiddenError("Not your listing");

    if (item.status === "PENDING_VERIFICATION") {
      throw new ConflictError("Already awaiting admin review.");
    }
    if (item.status === "RENTED") {
      throw new ConflictError("This unit is marked rented — reopen it first.");
    }

    const nextStatus: ListingStatus = item.status === "DRAFT" || item.status === "REJECTED" ? "PENDING_VERIFICATION" : "ACTIVE";

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: { lastConfirmedAt: new Date(), status: nextStatus, rejectionReason: null },
    });
    return NextResponse.json({ item: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
