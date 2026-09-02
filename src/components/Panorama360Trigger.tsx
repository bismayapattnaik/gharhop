"use client";

import { useState } from "react";
import Panorama360 from "@/components/Panorama360";

export default function Panorama360Trigger({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState(false);
  if (images.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-black/60"
      >
        <span aria-hidden>🔄</span> Room Tour
      </button>
      {open && <Panorama360 images={images} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
