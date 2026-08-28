"use client";

import { useRef, useState } from "react";

// Honest framing: this is a drag-to-pan wide photo, not a true equirectangular
// spherical render — a real 3D/VR capture pipeline (Matterport-style) is a
// provider integration well beyond a prototype. It still gives the "look
// around the room" feel the UI promises, using the same demo photos.
export default function Panorama360({ imageUrl, title, onClose }: { imageUrl: string; title: string; onClose: () => void }) {
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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4 text-white">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-white/60">360° preview — drag to look around</p>
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
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed demo asset, no need for next/image optimization here */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt={`${title} 360 preview`}
          draggable={false}
          className="h-full max-w-none select-none"
          style={{ width: "180%", objectFit: "cover", transform: `translateX(${dragX}px)`, transition: isDragging ? "none" : "transform 150ms ease" }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5 text-xs text-white/70">
          <span className="rounded-full bg-black/40 px-3 py-1">← drag to pan →</span>
        </div>
      </div>
    </div>
  );
}
