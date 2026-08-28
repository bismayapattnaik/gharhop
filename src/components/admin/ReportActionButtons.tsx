"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReportActionButtons({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function set(status: string) {
    setLoading(true);
    await fetch(`/api/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button disabled={loading} onClick={() => set("ACTIONED")} className="rounded-full bg-red-600 px-3 py-1 text-xs text-white disabled:opacity-50">
        Action
      </button>
      <button disabled={loading} onClick={() => set("NO_VIOLATION")} className="rounded-full border border-slate-300 px-3 py-1 text-xs disabled:opacity-50">
        No violation
      </button>
    </div>
  );
}
