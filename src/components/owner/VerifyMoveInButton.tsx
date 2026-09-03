"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Verified move-in (business plan section 4) — owner confirms a tenancy
// actually started on this unit. Charges the List Free move-in fee unless
// the owner holds an active FastFill subscription (lib/billing.ts).
export default function VerifyMoveInButton({ itemId, feeApplies }: { itemId: string; feeApplies: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const res = await fetch(`/api/items/${itemId}/verify-move-in`, { method: "POST" });
          const data = await res.json().catch(() => ({}));
          setLoading(false);
          if (!res.ok) {
            setError(data.error ?? "Could not verify this move-in.");
            return;
          }
          router.refresh();
        }}
        className="rounded-full bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {loading ? "Working…" : feeApplies ? "Confirm verified move-in (fee applies)" : "Confirm verified move-in"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
