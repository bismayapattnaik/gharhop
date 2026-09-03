"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
}

// Client-side mirror of the rolling visit-access rule in lib/billing.ts —
// informational only (labels what a slot will cost); the server re-checks
// and enforces it for real inside createHold.
function accessLabel(
  startTime: string,
  opts: { freeWindowDays: number; lastMinuteHours: number; hasPriorityPass: boolean; sponsoredVisitEnabled: boolean; walletBalance: number }
) {
  const hoursUntil = (new Date(startTime).getTime() - Date.now()) / (60 * 60 * 1000);
  if (hoursUntil / 24 >= opts.freeWindowDays) return { text: "Free", tone: "free" as const };
  if (hoursUntil <= opts.lastMinuteHours) return { text: "Free · last-minute release", tone: "free" as const };
  if (opts.hasPriorityPass) return { text: "Included in your plan", tone: "plan" as const };
  if (opts.sponsoredVisitEnabled) return { text: "Free · sponsored by owner", tone: "free" as const };
  return { text: opts.walletBalance > 0 ? "Uses 1 Rush Credit" : "Needs a Rush Credit", tone: "credit" as const };
}

export default function SlotPicker({
  bookingMode,
  slots,
  freeWindowDays,
  lastMinuteHours,
  hasPriorityPass,
  sponsoredVisitEnabled,
  walletBalance,
}: {
  bookingMode: string;
  slots: Slot[];
  freeWindowDays: number;
  lastMinuteHours: number;
  hasPriorityPass: boolean;
  sponsoredVisitEnabled: boolean;
  walletBalance: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Slot | null>(null);
  const [hold, setHold] = useState<{ id: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!hold) return;
    const tick = () => setRemaining(Math.max(0, Math.round((new Date(hold.expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hold]);

  async function requestSlot(slot: Slot) {
    setError(null);
    setNeedsUpgrade(false);
    setLoading(true);
    setSelected(slot);
    try {
      const res = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: slot.id, idempotencyKey: `hold-${slot.id}-${crypto.randomUUID()}` }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not hold this slot.");
        setNeedsUpgrade(res.status === 402);
        setSelected(null);
        router.refresh();
        return;
      }
      setHold({ id: data.hold.id, expiresAt: data.hold.expiresAt });
    } finally {
      setLoading(false);
    }
  }

  async function confirmVisit() {
    if (!hold) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdId: hold.id, idempotencyKey: `visit-${hold.id}` }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not confirm this visit.");
        setHold(null);
        setSelected(null);
        router.refresh();
        return;
      }
      setSuccess(
        data.visit.status === "CONFIRMED"
          ? "Visit confirmed! It's on your visits page with a calendar entry and reminders."
          : "Visit requested — the owner has a response SLA. You'll be notified once they confirm."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg bg-emerald-500/15 p-4 text-emerald-300">
        <p className="font-medium">{success}</p>
        <a href="/seeker/visits" className="mt-2 inline-block text-sm underline">
          Go to My Visits →
        </a>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-lg bg-neutral-800 p-4 text-sm text-neutral-400">
        No open visit slots right now. Check back — owners publish new slots regularly.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot) => {
          const access = accessLabel(slot.startTime, { freeWindowDays, lastMinuteHours, hasPriorityPass, sponsoredVisitEnabled, walletBalance });
          return (
            <button
              key={slot.id}
              disabled={loading}
              onClick={() => requestSlot(slot)}
              className={`rounded-lg border px-3 py-2 text-left text-sm text-neutral-200 ${
                selected?.id === slot.id ? "border-orange-500 bg-orange-500/10" : "border-neutral-700 hover:border-orange-500/50"
              }`}
            >
              <span className="block">{formatDateTime(slot.startTime)}</span>
              <span
                className={`mt-0.5 block text-xs ${
                  access.tone === "free" ? "text-emerald-400" : access.tone === "plan" ? "text-blue-400" : "text-amber-400"
                }`}
              >
                {access.text}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
          {needsUpgrade && (
            <>
              {" "}
              <a href="/seeker/plans" className="underline">
                See plans →
              </a>
            </>
          )}
        </p>
      )}

      {hold && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-300">
            Slot held for you — expires in{" "}
            <span className="font-semibold">
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
            </span>
          </p>
          <button
            onClick={confirmVisit}
            disabled={loading || remaining <= 0}
            className="mt-2 w-full rounded-full bg-gradient-to-r from-orange-500 to-pink-600 py-2 font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            {bookingMode === "INSTANT" ? "Confirm visit" : "Request visit (owner will confirm)"}
          </button>
        </div>
      )}
    </div>
  );
}
