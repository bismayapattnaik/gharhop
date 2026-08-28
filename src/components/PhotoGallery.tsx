"use client";

import { useState } from "react";

// Just the photo layer — the parent stacks back-button/badge/title overlays
// on top of this (absolute inset-0), so this only owns the image + nav.
export default function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const safePhotos = photos.length > 0 ? photos : [];
  if (safePhotos.length === 0) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed demo assets */}
      <img src={safePhotos[index]} alt={alt} className="absolute inset-0 h-full w-full object-cover" />

      {safePhotos.length > 1 && (
        <>
          <button
            aria-label="Previous photo"
            onClick={() => setIndex((i) => (i - 1 + safePhotos.length) % safePhotos.length)}
            className="absolute inset-y-0 left-0 z-10 w-1/3 opacity-0"
          />
          <button
            aria-label="Next photo"
            onClick={() => setIndex((i) => (i + 1) % safePhotos.length)}
            className="absolute inset-y-0 right-0 z-10 w-1/3 opacity-0"
          />
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center gap-1.5">
            {safePhotos.map((p, i) => (
              <span key={p} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
