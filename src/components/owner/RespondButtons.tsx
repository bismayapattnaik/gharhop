"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";

interface AlternateSlot {
  id: string;
  startTime: string;
}

export default function RespondButtons({ visitId, alternateSlots = [] }: { visitId: string; alternateSlots?: AlternateSlot[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);

  async function call(path: string, body?: object) {
    setLoading(true);
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not respond.");
      return;
    }
    router.refresh();
  }

  if (proposing) {
    if (alternateSlots.length === 0) {
      return <p className="text-xs text-slate-500">No other open slots on this listing yet — add one first.</p>;
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        {alternateSlots.map((slot) => (
          <button
            key={slot.id}
            disabled={loading}
            onClick={() => call(`/api/visits/${visitId}/propose-reschedule`, { newSlotId: slot.id })}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-teal-500 hover:text-teal-700 disabled:opacity-50"
          >
            {formatDateTime(slot.startTime)}
          </button>
        ))}
        <button onClick={() => setProposing(false)} className="text-xs text-slate-400 underline">
          Cancel
        </button>
        {error && <p className="w-full text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={loading}
        onClick={() => call(`/api/visits/${visitId}/respond`, { action: "accept" })}
        className="rounded-full bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        Accept
      </button>
      <button
        disabled={loading}
        onClick={() => setProposing(true)}
        className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Propose new time
      </button>
      <button
        disabled={loading}
        onClick={() => call(`/api/visits/${visitId}/respond`, { action: "reject" })}
        className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Decline
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
