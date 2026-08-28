"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
}

export default function SlotPicker({ bookingMode, slots }: { bookingMode: string; slots: Slot[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Slot | null>(null);
  const [hold, setHold] = useState<{ id: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!hold) return;
    const tick = () => setRemaining(Math.max(0, Math.round((new Date(hold.expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hold]);

  async function requestSlot(slot: Slot) {
    setError(null);
    setLoading(true);
    setSelected(slot);
    try {
      const res = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: slot.id, idempotencyKey: `hold-${slot.id}-${crypto.randomUUID()}` }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not hold this slot.");
        setSelected(null);
        router.refresh();
        return;
      }
      setHold({ id: data.hold.id, expiresAt: data.hold.expiresAt });
    } finally {
      setLoading(false);
    }
  }

  async function confirmVisit() {
    if (!hold) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdId: hold.id, idempotencyKey: `visit-${hold.id}` }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not confirm this visit.");
        setHold(null);
        setSelected(null);
        router.refresh();
        return;
      }
      setSuccess(
        data.visit.status === "CONFIRMED"
          ? "Visit confirmed! It's on your visits page with a calendar entry and reminders."
          : "Visit requested — the owner has a response SLA. You'll be notified once they confirm."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg bg-emerald-50 p-4 text-emerald-800">
        <p className="font-medium">{success}</p>
        <a href="/seeker/visits" className="mt-2 inline-block text-sm underline">
          Go to My Visits →
        </a>
      </div>
    );
  }

  if (slots.length === 0) {
    return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No open visit slots right now. Check back — owners publish new slots regularly.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot) => (
          <button
            key={slot.id}
            disabled={loading}
            onClick={() => requestSlot(slot)}
            className={`rounded-lg border px-3 py-2 text-left text-sm ${
              selected?.id === slot.id ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:border-teal-400"
            }`}
          >
            {formatDateTime(slot.startTime)}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {hold && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            Slot held for you — expires in <span className="font-semibold">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span>
          </p>
          <button
            onClick={confirmVisit}
            disabled={loading || remaining <= 0}
            className="mt-2 w-full rounded-full bg-teal-700 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {bookingMode === "INSTANT" ? "Confirm visit" : "Request visit (owner will confirm)"}
          </button>
        </div>
      )}
    </div>
  );
}
