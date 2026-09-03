import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { validateImageFile, saveUploadedImage, deleteUploadedFile, MAX_PHOTOS_PER_TARGET } from "@/lib/uploads";

async function verifyRoomOwnership(itemId: string, roomId: string, ownerId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { inventoryItem: { include: { property: true } }, photos: true },
  });
  if (!room || room.inventoryItemId !== itemId) throw new NotFoundError("Room not found");
  if (room.inventoryItem.property.ownerId !== ownerId) throw new ForbiddenError("Not your listing");
  return room;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; roomId: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id, roomId } = await params;
    const room = await verifyRoomOwnership(id, roomId, owner.id);

    const form = await request.formData();
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    if (room.photos.length + files.length > MAX_PHOTOS_PER_TARGET) {
      return NextResponse.json({ error: `Max ${MAX_PHOTOS_PER_TARGET} photos per room.` }, { status: 400 });
    }
    for (const file of files) {
      const error = validateImageFile(file);
      if (error) return NextResponse.json({ error }, { status: 400 });
    }

    let order = room.photos.length;
    const created = [];
    for (const file of files) {
      const url = await saveUploadedImage(file, `${id}/rooms/${roomId}`);
      created.push(await prisma.roomPhoto.create({ data: { roomId, url, displayOrder: order++ } }));
    }
    return NextResponse.json({ photos: created });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; roomId: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id, roomId } = await params;
    await verifyRoomOwnership(id, roomId, owner.id);

    const body = await request.json();
    const photoId = String(body.photoId ?? "");
    const photo = await prisma.roomPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.roomId !== roomId) throw new NotFoundError("Photo not found");

    await deleteUploadedFile(photo.url);
    await prisma.roomPhoto.delete({ where: { id: photoId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
