"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface RoomPhoto {
  id: string;
  url: string;
}
interface RoomData {
  id: string;
  name: string;
  photos: RoomPhoto[];
}

export default function RoomManager({ itemId, rooms }: { itemId: string; rooms: RoomData[] }) {
  const router = useRouter();
  const [newRoomName, setNewRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch(`/api/items/${itemId}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoomName.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add room.");
      return;
    }
    setNewRoomName("");
    router.refresh();
  }

  async function deleteRoom(roomId: string) {
    await fetch(`/api/items/${itemId}/rooms/${roomId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {rooms.length === 0 && (
        <p className="text-sm text-slate-400">
          No rooms yet — add one (e.g. &quot;Living Room&quot;) to start building a Room Tour.
        </p>
      )}
      {rooms.map((room) => (
        <RoomCard key={room.id} itemId={itemId} room={room} onDeleteRoom={() => deleteRoom(room.id)} />
      ))}

      <form onSubmit={addRoom} className="flex items-center gap-2">
        <input
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="Room name, e.g. Living Room"
          className="input max-w-xs"
        />
        <button disabled={creating} type="submit" className="rounded-full bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50">
          {creating ? "Adding…" : "+ Add room"}
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function RoomCard({ itemId, room, onDeleteRoom }: { itemId: string; room: RoomData; onDeleteRoom: () => void }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("photos", f));
    try {
      const res = await fetch(`/api/items/${itemId}/rooms/${room.id}/photos`, { method: "POST", body: form });
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

  async function removePhoto(photoId: string) {
    await fetch(`/api/items/${itemId}/rooms/${room.id}/photos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId }),
    });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-slate-800">{room.name}</p>
        <button onClick={onDeleteRoom} className="text-xs text-red-500 underline">
          Delete room
        </button>
      </div>

      {room.photos.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {room.photos.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded asset */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => removePhoto(p.id)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

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
        className="mt-2 rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "+ Add photos"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
