"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// GH-O401 "Recurring availability" simplified: pick one date/time, optionally
// repeat the same weekday/time for a few more weeks.
export default function NewSlotsForm({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const date = String(form.get("date"));
    const time = String(form.get("time"));
    const duration = Number(form.get("duration")) || 60;
    const repeatWeeks = Number(form.get("repeatWeeks")) || 0;
    const capacity = Number(form.get("capacity")) || 1;

    if (!date || !time) {
      setError("Pick a date and time.");
      setLoading(false);
      return;
    }

    const base = new Date(`${date}T${time}:00`);
    const slots = [];
    for (let w = 0; w <= repeatWeeks; w++) {
      const start = new Date(base.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + duration * 60 * 1000);
      slots.push({ startTime: start.toISOString(), endTime: end.toISOString(), capacity });
    }

    try {
      const res = await fetch(`/api/items/${itemId}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add slots.");
        return;
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3">
      <label className="text-xs">
        <span className="mb-1 block text-slate-500">Date</span>
        <input name="date" type="date" required className="input" />
      </label>
      <label className="text-xs">
        <span className="mb-1 block text-slate-500">Time</span>
        <input name="time" type="time" required className="input" />
      </label>
      <label className="text-xs">
        <span className="mb-1 block text-slate-500">Duration (min)</span>
        <input name="duration" type="number" defaultValue={60} className="input w-24" />
      </label>
      <label className="text-xs">
        <span className="mb-1 block text-slate-500">Repeat weekly (extra weeks)</span>
        <input name="repeatWeeks" type="number" defaultValue={0} min={0} max={8} className="input w-24" />
      </label>
      <label className="text-xs">
        <span className="mb-1 block text-slate-500">Capacity</span>
        <input name="capacity" type="number" defaultValue={1} min={1} className="input w-20" />
      </label>
      <button disabled={loading} className="rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50">
        {loading ? "Adding…" : "Add slot(s)"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
