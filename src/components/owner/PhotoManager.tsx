"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function PhotoManager({ itemId, photos }: { itemId: string; photos: string[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDemoSet = photos.every((p) => p.startsWith("/photos/"));

  async function upload(files: FileList) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("photos", f));
    try {
      const res = await fetch(`/api/items/${itemId}/photos`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(url: string) {
    await fetch(`/api/items/${itemId}/photos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    router.refresh();
  }

  return (
    <div>
      {isDemoSet && photos.length > 0 && (
        <p className="mb-2 text-xs text-amber-600">
          These are placeholder demo photos. Upload real ones — it&apos;ll replace the demo set.
        </p>
      )}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {photos.map((p) => (
          <div key={p} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded/demo asset, not a build-time optimizable image */}
            <img src={p} alt="" className="h-full w-full object-cover" />
            {!isDemoSet && (
              <button
                onClick={() => remove(p)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && e.target.files.length > 0 && upload(e.target.files)}
      />
      <button
        disabled={uploading}
        onClick={() => fileInput.current?.click()}
        className="mt-3 rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "+ Upload real photos"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-slate-400">JPEG/PNG/WebP, up to 5MB each, max 8 photos. The first photo becomes the room-tour cover.</p>
    </div>
  );
}
