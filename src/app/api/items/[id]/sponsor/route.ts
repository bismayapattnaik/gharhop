import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

// Owner-sponsored premium visits (business plan section 9) — an owner
// opts a listing in/out of free within-the-week booking for seekers;
// GharHop only charges the owner once a resulting visit is confirmed
// (see chargeSponsoredVisit in lib/billing.ts).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id } = await params;
    const body = await request.json();

    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { property: true } });
    if (!item) throw new NotFoundError("Listing not found");
    if (item.property.ownerId !== owner.id) throw new ForbiddenError("Not your listing");

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: { sponsoredVisitEnabled: Boolean(body.enabled) },
    });
    return NextResponse.json({ item: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
