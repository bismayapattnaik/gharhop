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
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id } = await params;
    const body = await request.json();

    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { property: true } });
    if (!item) throw new NotFoundError("Listing not found");
    if (item.property.ownerId !== owner.id) throw new ForbiddenError("Not your listing");

    const allowed = ["rentAmount", "depositAmount", "furnishing", "occupancyPolicy", "status", "bookingMode", "freshnessTtlHours"] as const;
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
