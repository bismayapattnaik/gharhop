"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// GH-O304 "One-tap reconfirm" — this single button is the difference
// between a marketplace with real inventory and one full of ghosts.
export default function ReconfirmButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch(`/api/items/${itemId}/reconfirm`, { method: "POST" });
        setLoading(false);
        router.refresh();
      }}
      className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {loading ? "Confirming…" : "Still available? ✓ Confirm"}
    </button>
  );
}
