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
        className={`rounded-full border px-3 py-1.5 text-neutral-300 ${
          action === "PASS" ? "border-neutral-500 bg-neutral-700" : "border-neutral-700 hover:bg-neutral-800"
        }`}
      >
        ✕ Pass
      </button>
      <button
        onClick={() => act("SHORTLIST")}
        className={`rounded-full border px-3 py-1.5 ${
          action === "SHORTLIST" ? "border-orange-500/50 bg-orange-500/15 text-orange-400" : "border-neutral-700 text-neutral-300 hover:bg-neutral-800"
        }`}
      >
        ♥ Shortlisted
      </button>
    </div>
  );
}
