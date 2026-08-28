"use client";

import { useState } from "react";

export default function InterestButtons({ itemId, initialAction }: { itemId: string; initialAction?: string | null }) {
  const [action, setAction] = useState(initialAction ?? null);

  async function act(next: "SHORTLIST" | "PASS") {
    setAction(next);
    await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryItemId: itemId, action: next }),
    }).catch(() => {});
  }

  return (
    <div className="flex gap-2 text-sm">
      <button
        onClick={() => act("PASS")}
        className={`rounded-full border px-3 py-1.5 ${action === "PASS" ? "border-slate-500 bg-slate-100" : "border-slate-300 hover:bg-slate-50"}`}
      >
        ✕ Pass
      </button>
      <button
        onClick={() => act("SHORTLIST")}
        className={`rounded-full border px-3 py-1.5 ${action === "SHORTLIST" ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-300 hover:bg-slate-50"}`}
      >
        ♥ Shortlisted
      </button>
    </div>
  );
}
