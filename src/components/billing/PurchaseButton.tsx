"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Mock checkout — same "any input succeeds" spirit as the mock-OTP login
// (lib/auth.ts): no real payment gateway, but every click hits a real API
// route that records an Order + ledger entry (lib/billing.ts).
export default function PurchaseButton({
  endpoint,
  body,
  label,
  doneLabel = "Done ✓",
  className,
}: {
  endpoint: string;
  body?: Record<string, unknown>;
  label: string;
  doneLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <div>
      <button
        disabled={loading || done}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const res = await fetch(endpoint, {
            method: "POST",
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
          });
          const data = await res.json().catch(() => ({}));
          setLoading(false);
          if (!res.ok) {
            setError(data.error ?? "Could not complete that purchase.");
            return;
          }
          setDone(true);
          router.refresh();
        }}
        className={
          className ??
          "w-full rounded-full bg-gradient-to-r from-orange-500 to-pink-600 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
        }
      >
        {loading ? "Processing…" : done ? doneLabel : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
