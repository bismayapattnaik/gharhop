import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { property: true, slots: { orderBy: { startTime: "asc" } } },
    });
    if (!item) throw new NotFoundError("Listing not found");
    return NextResponse.json({ item });
  } catch (e) {
    return handleApiError(e);
  }
}

// Owner edits price/status (GH-O203/GH-O504 "close unit" etc.), never a
// silent change to already-confirmed visit times (global rule, section 9).
// Admins can also pause/close a listing as an operational override — the
// "minimum admin dashboard" from the launch plan.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();

    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { property: true } });
    if (!item) throw new NotFoundError("Listing not found");
    if (user.role === "OWNER" && item.property.ownerId !== user.id) throw new ForbiddenError("Not your listing");
    if (user.role !== "OWNER" && user.role !== "ADMIN") throw new ForbiddenError("Owners or admins only");

    // Admins get a narrower surface — pause/reactivate/mark-rented only,
    // never price or booking-mode changes on someone else's listing.
    const allowed =
      user.role === "ADMIN"
        ? (["status"] as const)
        : (["rentAmount", "depositAmount", "furnishing", "occupancyPolicy", "status", "bookingMode", "freshnessTtlHours"] as const);
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const updated = await prisma.inventoryItem.update({ where: { id }, data });
    return NextResponse.json({ item: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
