import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { parsePhotos } from "@/lib/photos";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_PHOTOS = 8;
const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

async function verifyOwnership(itemId: string, ownerId: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId }, include: { property: true } });
  if (!item) throw new NotFoundError("Listing not found");
  if (item.property.ownerId !== ownerId) throw new ForbiddenError("Not your listing");
  return item;
}

// Real owner-uploaded photos (no third-party media pipeline — files land on
// local disk under public/uploads, which is fine for `next dev` but would
// need real object storage — S3-compatible, per the PRD technical blueprint
// — before any production deployment).
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

    if (kept.length + files.length > MAX_PHOTOS) {
      return NextResponse.json({ error: `Max ${MAX_PHOTOS} photos per listing.` }, { status: 400 });
    }

    for (const file of files) {
      if (!ALLOWED_TYPES[file.type]) {
        return NextResponse.json({ error: `Unsupported file type: ${file.type || "unknown"}. Use JPEG, PNG or WebP.` }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "File too large — max 5MB per photo." }, { status: 400 });
      }
    }

    const dir = path.join(UPLOADS_ROOT, id);
    await mkdir(dir, { recursive: true });

    const newPaths: string[] = [];
    for (const file of files) {
      const ext = ALLOWED_TYPES[file.type];
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(dir, filename), buffer);
      newPaths.push(`/uploads/${id}/${filename}`);
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

    if (url.startsWith("/uploads/")) {
      const resolved = path.resolve(path.join(process.cwd(), "public", url));
      if (resolved.startsWith(UPLOADS_ROOT)) {
        await unlink(resolved).catch(() => {});
      }
    }

    const updated = await prisma.inventoryItem.update({ where: { id }, data: { photos: JSON.stringify(remaining) } });
    return NextResponse.json({ item: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
