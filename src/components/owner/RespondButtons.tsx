"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RespondButtons({ visitId }: { visitId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "reject") {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/visits/${visitId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not respond.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={loading}
        onClick={() => respond("accept")}
        className="rounded-full bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        Accept
      </button>
      <button
        disabled={loading}
        onClick={() => respond("reject")}
        className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Decline
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
