"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function VerificationActions({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setLoading(true);
    await fetch(`/api/admin/items/${itemId}/approve`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  async function reject() {
    if (!reason.trim()) {
      setError("Give the owner a reason.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/items/${itemId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not reject.");
      return;
    }
    router.refresh();
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (shown to owner)"
            className="rounded border border-slate-300 px-2 py-1 text-xs"
          />
          <button disabled={loading} onClick={reject} className="rounded-full bg-red-600 px-2.5 py-1 text-xs text-white disabled:opacity-50">
            Confirm reject
          </button>
          <button onClick={() => setRejecting(false)} className="text-xs text-slate-400 underline">
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <button disabled={loading} onClick={approve} className="rounded-full border border-emerald-300 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
        Approve
      </button>
      <button disabled={loading} onClick={() => setRejecting(true)} className="rounded-full border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50">
        Reject
      </button>
    </div>
  );
}
