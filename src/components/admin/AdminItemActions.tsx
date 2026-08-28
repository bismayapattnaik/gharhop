"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Minimum admin dashboard: pause/reactivate/mark-rented as an operational
// override, independent of the owner ever logging in.
export default function AdminItemActions({ itemId, status }: { itemId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(next: string) {
    setLoading(true);
    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1.5">
      {status !== "PAUSED" && (
        <button disabled={loading} onClick={() => setStatus("PAUSED")} className="rounded-full border border-amber-300 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50">
          Pause
        </button>
      )}
      {status === "PAUSED" && (
        <button disabled={loading} onClick={() => setStatus("ACTIVE")} className="rounded-full border border-emerald-300 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
          Reactivate
        </button>
      )}
      {status !== "RENTED" && (
        <button disabled={loading} onClick={() => setStatus("RENTED")} className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          Mark rented
        </button>
      )}
    </div>
  );
}
