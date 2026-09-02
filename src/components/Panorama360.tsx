"use client";

import { useRef, useState } from "react";

// Honest framing: "Room Tour" here means stepping through the owner's real
// photos with a drag-to-pan effect on each — not a true equirectangular/
// spherical render. A real 3D capture pipeline (Matterport-style photogrammetry
// or NeRF reconstruction from 2D photos) is a hard ML problem and a specialized
// capture workflow, well beyond what a prototype should fake.
export default function Panorama360({ images, title, onClose }: { images: string[]; title: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ startClientX: number; startDragX: number; pointerId: number | null }>({
    startClientX: 0,
    startDragX: 0,
    pointerId: null,
  });

  function clampedX(next: number) {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return next;
    const maxShift = Math.max(0, img.clientWidth - container.clientWidth);
    return Math.min(0, Math.max(-maxShift, next));
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startClientX: e.clientX, startDragX: dragX, pointerId: e.pointerId };
    setIsDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging || e.pointerId !== dragState.current.pointerId) return;
    const delta = e.clientX - dragState.current.startClientX;
    setDragX(clampedX(dragState.current.startDragX + delta));
  }
  function onPointerUp() {
    setIsDragging(false);
  }

  function go(delta: number) {
    setDragX(0); // reset pan position for the incoming photo
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4 text-white">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-white/60">
            Room Tour {images.length > 1 ? `— ${index + 1}/${images.length}` : ""} — drag to look around
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg hover:bg-white/20">
          ✕
        </button>
      </div>
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative flex flex-1 cursor-grab items-center overflow-hidden active:cursor-grabbing"
        style={{ touchAction: "none" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded/demo asset */}
        <img
          ref={imgRef}
          src={images[index]}
          alt={`${title} — photo ${index + 1}`}
          draggable={false}
          className="h-full max-w-none select-none"
          style={{ width: "180%", objectFit: "cover", transform: `translateX(${dragX}px)`, transition: isDragging ? "none" : "transform 150ms ease" }}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70"
            >
              ‹
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70"
            >
              ›
            </button>
          </>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5 text-xs text-white/70">
          <span className="rounded-full bg-black/40 px-3 py-1">← drag to pan →</span>
        </div>
      </div>
    </div>
  );
}
