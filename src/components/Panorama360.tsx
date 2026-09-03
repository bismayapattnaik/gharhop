"use client";

import { useRef, useState } from "react";

export interface TourRoom {
  name: string;
  photos: string[];
}

// Honest framing: "Room Tour" here means stepping through the owner's real
// photos, grouped by room, with a drag-to-pan effect on each — not a true
// equirectangular/spherical render. A real 3D capture pipeline (Matterport-
// style photogrammetry or NeRF reconstruction from 2D photos) is a hard ML
// problem and a specialized capture workflow, well beyond what a prototype
// should fake.
export default function Panorama360({ rooms, title, onClose }: { rooms: TourRoom[]; title: string; onClose: () => void }) {
  const [roomIndex, setRoomIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ startClientX: number; startDragX: number; pointerId: number | null }>({
    startClientX: 0,
    startDragX: 0,
    pointerId: null,
  });

  const room = rooms[roomIndex];
  const photo = room?.photos[photoIndex];

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

  function goPhoto(delta: number) {
    if (!room) return;
    setDragX(0);
    setPhotoIndex((i) => (i + delta + room.photos.length) % room.photos.length);
  }

  function selectRoom(i: number) {
    setDragX(0);
    setPhotoIndex(0);
    setRoomIndex(i);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4 text-white">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-white/60">
            Room Tour{room ? ` — ${room.name}` : ""} {room && room.photos.length > 1 ? `(${photoIndex + 1}/${room.photos.length})` : ""} — drag to look around
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
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded/demo asset
          <img
            ref={imgRef}
            src={photo}
            alt={`${title} — ${room.name} photo ${photoIndex + 1}`}
            draggable={false}
            className="h-full max-w-none select-none"
            style={{ width: "180%", objectFit: "cover", transform: `translateX(${dragX}px)`, transition: isDragging ? "none" : "transform 150ms ease" }}
          />
        )}

        {room && room.photos.length > 1 && (
          <>
            <button
              onClick={() => goPhoto(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70"
            >
              ‹
            </button>
            <button
              onClick={() => goPhoto(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70"
            >
              ›
            </button>
          </>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5 text-xs text-white/70">
          <span className="rounded-full bg-black/40 px-3 py-1">← drag to pan →</span>
        </div>
      </div>

      {rooms.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-white/10 bg-black p-3">
          {rooms.map((r, i) => (
            <button
              key={r.name}
              onClick={() => selectRoom(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                i === roomIndex ? "bg-white text-black" : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
