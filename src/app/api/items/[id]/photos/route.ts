import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { parsePhotos } from "@/lib/photos";
import { validateImageFile, saveUploadedImage, deleteUploadedFile, MAX_PHOTOS_PER_TARGET } from "@/lib/uploads";

async function verifyOwnership(itemId: string, ownerId: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId }, include: { property: true } });
  if (!item) throw new NotFoundError("Listing not found");
  if (item.property.ownerId !== ownerId) throw new ForbiddenError("Not your listing");
  return item;
}

// Real owner-uploaded cover photos for the swipe-card/listing-header — see
// src/app/api/items/[id]/rooms/[roomId]/photos/route.ts for the room-organized
// Room Tour photos, which are a separate set.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id } = await params;
    const item = await verifyOwnership(id, owner.id);

    const form = await request.formData();
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const existing = parsePhotos(item.photos);
    // First real upload replaces the auto-assigned demo stock set — no
    // reason to keep showing stock photos once the owner has real ones.
    const isDemoSet = existing.length === 0 || existing.every((p) => p.startsWith("/photos/"));
    const kept = isDemoSet ? [] : existing;

    if (kept.length + files.length > MAX_PHOTOS_PER_TARGET) {
      return NextResponse.json({ error: `Max ${MAX_PHOTOS_PER_TARGET} photos per listing.` }, { status: 400 });
    }
    for (const file of files) {
      const error = validateImageFile(file);
      if (error) return NextResponse.json({ error }, { status: 400 });
    }

    const newPaths: string[] = [];
    for (const file of files) {
      newPaths.push(await saveUploadedImage(file, id));
    }

    const photos = [...kept, ...newPaths];
    const updated = await prisma.inventoryItem.update({ where: { id }, data: { photos: JSON.stringify(photos) } });
    return NextResponse.json({ item: updated });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireUser("OWNER");
    const { id } = await params;
    const item = await verifyOwnership(id, owner.id);
    const body = await request.json();
    const url = String(body.url ?? "");

    const remaining = parsePhotos(item.photos).filter((p) => p !== url);
    await deleteUploadedFile(url);

    const updated = await prisma.inventoryItem.update({ where: { id }, data: { photos: JSON.stringify(remaining) } });
    return NextResponse.json({ item: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
