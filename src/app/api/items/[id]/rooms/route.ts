import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

// Room-organized photo sets for the Room Tour ("Living Room", "Bedroom", ...).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id } = await params;
    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { property: true, rooms: true } });
    if (!item) throw new NotFoundError("Listing not found");
    if (item.property.ownerId !== owner.id) throw new ForbiddenError("Not your listing");

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Room name is required." }, { status: 400 });
    if (item.rooms.length >= 12) return NextResponse.json({ error: "Max 12 rooms per listing." }, { status: 400 });

    const room = await prisma.room.create({
      data: { inventoryItemId: id, name, displayOrder: item.rooms.length },
    });
    return NextResponse.json({ room });
  } catch (e) {
    return handleApiError(e);
  }
}
