import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

// GH-O304 "One-tap reconfirm" — the single most important owner action in
// the whole product. Bumps lastConfirmedAt so the listing survives the
// freshness TTL, and promotes DRAFT -> ACTIVE the first time it's used.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id } = await params;

    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { property: true } });
    if (!item) throw new NotFoundError("Listing not found");
    if (item.property.ownerId !== owner.id) throw new ForbiddenError("Not your listing");

    const nextStatus = item.status === "DRAFT" ? "ACTIVE" : item.status === "RENTED" ? "RENTED" : "ACTIVE";

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: { lastConfirmedAt: new Date(), status: nextStatus },
    });
    return NextResponse.json({ item: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
