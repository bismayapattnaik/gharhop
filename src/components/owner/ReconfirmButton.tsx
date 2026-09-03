"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// GH-O304 "One-tap reconfirm" for a live listing — for a DRAFT/REJECTED one
// this same action means "submit for admin review" instead (PRD section 9).
export default function ReconfirmButton({ itemId, status }: { itemId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmission = status === "DRAFT" || status === "REJECTED";

  return (
    <div>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const res = await fetch(`/api/items/${itemId}/reconfirm`, { method: "POST" });
          const data = await res.json().catch(() => ({}));
          setLoading(false);
          if (!res.ok) {
            setError(data.error ?? "Could not do that.");
            return;
          }
          router.refresh();
        }}
        className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Working…" : isSubmission ? "Submit for review" : "Still available? ✓ Confirm"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
