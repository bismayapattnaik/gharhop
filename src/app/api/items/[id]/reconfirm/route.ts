import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError, ConflictError } from "@/lib/errors";
import { ownerEntitlements } from "@/lib/billing";
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

    const isSubmission = item.status === "DRAFT" || item.status === "REJECTED";
    const nextStatus: ListingStatus = isSubmission ? "PENDING_VERIFICATION" : "ACTIVE";

    if (isSubmission) {
      // Owner plan A/B cap (business plan section 4): List Free is capped
      // at one active/in-review listing; FastFill raises that to two.
      const entitlements = await ownerEntitlements(owner.id);
      const activeCount = await prisma.inventoryItem.count({
        where: { property: { ownerId: owner.id }, status: { in: ["ACTIVE", "PENDING_VERIFICATION"] } },
      });
      if (activeCount >= entitlements.maxActiveListings) {
        throw new ConflictError(
          `Your plan allows ${entitlements.maxActiveListings} active listing${entitlements.maxActiveListings === 1 ? "" : "s"} at a time — upgrade to FastFill (₹999/30 days) for more, or pause another listing first.`
        );
      }
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: { lastConfirmedAt: new Date(), status: nextStatus, rejectionReason: null },
    });
    return NextResponse.json({ item: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
