import type { InventoryType } from "@prisma/client";

// Demo photos only — no real upload pipeline in the prototype (see README).
// Auto-assigned by inventory type so every listing, old or new, has
// something realistic to show instead of a blank card.
export const DEMO_PHOTOS: Record<InventoryType, string[]> = {
  FLAT: ["/photos/flat-1.jpg", "/photos/flat-2.jpg", "/photos/flat-3.jpg", "/photos/flat-4.jpg"],
  ROOM: ["/photos/room-1.jpg", "/photos/room-2.jpg", "/photos/room-3.jpg", "/photos/room-4.jpg"],
  PG_BED: ["/photos/pgbed-1.jpg", "/photos/pgbed-2.jpg", "/photos/pgbed-3.jpg", "/photos/pgbed-4.jpg", "/photos/pgbed-5.jpg"],
};

// The wide-ish shot from each set used for the pseudo-360 drag-to-look-around
// viewer (see components/Panorama360.tsx) — a real equirectangular panorama
// pipeline is out of scope for a prototype, so this is an honest "360°
// preview" rather than true spherical VR.
export const DEMO_PANORAMA: Record<InventoryType, string> = {
  FLAT: "/photos/flat-3.jpg",
  ROOM: "/photos/room-3.jpg",
  PG_BED: "/photos/pgbed-1.jpg",
};

export function defaultPhotosFor(type: InventoryType): string {
  return JSON.stringify(DEMO_PHOTOS[type]);
}

export function defaultPanoramaFor(type: InventoryType): string {
  return DEMO_PANORAMA[type];
}

export function parsePhotos(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}
