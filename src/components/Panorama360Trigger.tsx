"use client";

import { useState } from "react";
import Panorama360, { type TourRoom } from "@/components/Panorama360";

export default function Panorama360Trigger({ rooms, title }: { rooms: TourRoom[]; title: string }) {
  const [open, setOpen] = useState(false);
  const hasPhotos = rooms.some((r) => r.photos.length > 0);
  if (!hasPhotos) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-black/60"
      >
        <span aria-hidden>🔄</span> Room Tour
      </button>
      {open && <Panorama360 rooms={rooms.filter((r) => r.photos.length > 0)} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
