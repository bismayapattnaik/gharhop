"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatInr } from "@/lib/format";

// Owner-sponsored visits (business plan section 9) — toggling this on lets
// seekers book this listing's within-the-week slots for free; GharHop
// charges the owner only once they confirm the resulting visit.
export default function SponsorToggle({ itemId, enabled, feeInr }: { itemId: string; enabled: boolean; feeInr: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span className="text-slate-700">Sponsor priority visits — {formatInr(feeInr)} per confirmed visit, within-the-week slots only</span>
      <input
        type="checkbox"
        checked={enabled}
        disabled={loading}
        onChange={async (e) => {
          setLoading(true);
          await fetch(`/api/items/${itemId}/sponsor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: e.target.checked }),
          });
          setLoading(false);
          router.refresh();
        }}
        className="h-4 w-4"
      />
    </label>
  );
}
