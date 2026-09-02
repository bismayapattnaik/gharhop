import type { InventoryType } from "@prisma/client";

// Demo photos, auto-assigned by inventory type so every listing has
// something realistic to show before an owner uploads real ones (see
// src/app/api/items/[id]/photos/route.ts for the real-upload path — it
// replaces this set the first time an owner uploads).
export const DEMO_PHOTOS: Record<InventoryType, string[]> = {
  FLAT: ["/photos/flat-1.jpg", "/photos/flat-2.jpg", "/photos/flat-3.jpg", "/photos/flat-4.jpg"],
  ROOM: ["/photos/room-1.jpg", "/photos/room-2.jpg", "/photos/room-3.jpg", "/photos/room-4.jpg"],
  PG_BED: ["/photos/pgbed-1.jpg", "/photos/pgbed-2.jpg", "/photos/pgbed-3.jpg", "/photos/pgbed-4.jpg", "/photos/pgbed-5.jpg"],
};

export function defaultPhotosFor(type: InventoryType): string {
  return JSON.stringify(DEMO_PHOTOS[type]);
}

export function parsePhotos(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}
