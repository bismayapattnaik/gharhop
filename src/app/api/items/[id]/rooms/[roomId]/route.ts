import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { deleteUploadedFile } from "@/lib/uploads";

async function verifyRoomOwnership(itemId: string, roomId: string, ownerId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { inventoryItem: { include: { property: true } }, photos: true },
  });
  if (!room || room.inventoryItemId !== itemId) throw new NotFoundError("Room not found");
  if (room.inventoryItem.property.ownerId !== ownerId) throw new ForbiddenError("Not your listing");
  return room;
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; roomId: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id, roomId } = await params;
    const room = await verifyRoomOwnership(id, roomId, owner.id);

    await Promise.all(room.photos.map((p) => deleteUploadedFile(p.url)));
    await prisma.roomPhoto.deleteMany({ where: { roomId } });
    await prisma.room.delete({ where: { id: roomId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
