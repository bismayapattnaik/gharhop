import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

// GH-O401 "Recurring availability" — simplified to accept a batch of
// explicit start/end times generated client-side (see NewSlotsForm), rather
// than a full recurrence-rule engine.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id } = await params;
    const body = await request.json();
    const slots: Array<{ startTime: string; endTime: string; capacity?: number }> = body.slots ?? [];

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ error: "No slots provided." }, { status: 400 });
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { property: true } });
    if (!item) throw new NotFoundError("Listing not found");
    if (item.property.ownerId !== owner.id) throw new ForbiddenError("Not your listing");

    const created = await prisma.availabilitySlot.createMany({
      data: slots.map((s) => ({
        inventoryItemId: id,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        capacity: s.capacity ?? 1,
      })),
    });

    return NextResponse.json({ count: created.count });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const slots = await prisma.availabilitySlot.findMany({
      where: { inventoryItemId: id },
      orderBy: { startTime: "asc" },
    });
    return NextResponse.json({ slots });
  } catch (e) {
    return handleApiError(e);
  }
}
