"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// GH-504 "Booking mode" — instant confirm vs owner approval, per listing.
export default function BookingModeSelect({ itemId, bookingMode }: { itemId: string; bookingMode: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      Booking mode
      <select
        value={bookingMode}
        disabled={loading}
        onChange={async (e) => {
          setLoading(true);
          await fetch(`/api/items/${itemId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingMode: e.target.value }),
          });
          setLoading(false);
          router.refresh();
        }}
        className="rounded-lg border border-slate-300 px-2 py-1"
      >
        <option value="INSTANT">Instant confirm</option>
        <option value="APPROVAL">Requires my approval</option>
      </select>
    </label>
  );
}
