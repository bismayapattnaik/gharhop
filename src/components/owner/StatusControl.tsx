"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const OPTIONS = ["ACTIVE", "PAUSED", "RENTED"];

// GH-O504 "Close unit" — owner-driven status, separate from the
// system-computed ACTIVE/STALE freshness state.
export default function StatusControl({ itemId, status }: { itemId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const current = OPTIONS.includes(status) ? status : "ACTIVE";

  return (
    <select
      value={current}
      disabled={loading}
      onChange={async (e) => {
        setLoading(true);
        await fetch(`/api/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: e.target.value }),
        });
        setLoading(false);
        router.refresh();
      }}
      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
    >
      {OPTIONS.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
