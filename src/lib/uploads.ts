import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

// Shared by the flat item-cover-photo upload and the per-room Room Tour
// upload — same validation, same local-disk destination (see README for
// the "needs real object storage before production" note).
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_TARGET = 8;
export const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    return `Unsupported file type: ${file.type || "unknown"}. Use JPEG, PNG or WebP.`;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return "File too large — max 5MB per photo.";
  }
  return null;
}

/** subDir is relative to public/uploads/, e.g. "<itemId>" or "<itemId>/rooms/<roomId>". */
export async function saveUploadedImage(file: File, subDir: string): Promise<string> {
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(UPLOADS_ROOT, subDir);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${subDir.replace(/\\/g, "/")}/${filename}`;
}

export async function deleteUploadedFile(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const resolved = path.resolve(path.join(process.cwd(), "public", url));
  if (!resolved.startsWith(UPLOADS_ROOT)) return; // containment check — no path traversal
  await unlink(resolved).catch(() => {});
}
