"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Minimum admin dashboard: force-confirm a stalled request or cancel a
// visit outright — the ops override path when an owner has gone quiet.
export default function AdminVisitActions({ visitId, status }: { visitId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(path: string, body?: object) {
    setLoading(true);
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    setLoading(false);
    router.refresh();
  }

  const cancellable = ["REQUESTED", "CONFIRMED", "CHECKED_IN"].includes(status);
  if (!cancellable && status !== "REQUESTED") return null;

  return (
    <div className="flex gap-1.5">
      {status === "REQUESTED" && (
        <button
          disabled={loading}
          onClick={() => act(`/api/admin/visits/${visitId}/confirm`)}
          className="rounded-full border border-blue-300 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          Force-confirm
        </button>
      )}
      {cancellable && (
        <button
          disabled={loading}
          onClick={() => act(`/api/visits/${visitId}/cancel`, { reason: "Cancelled by GharHop support" })}
          className="rounded-full border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
