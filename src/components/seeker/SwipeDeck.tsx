"use client";

import Link from "next/link";
import { useState } from "react";
import Badge from "@/components/Badge";
import { formatInr, TYPE_LABEL, formatDateTime } from "@/lib/format";
import { freshnessAgeLabel } from "@/lib/freshness";

export interface FeedItem {
  id: string;
  type: string;
  configuration: string;
  rentAmount: number;
  depositAmount: number;
  furnishing: string;
  lastConfirmedAt: string;
  distanceKm: number;
  property: { title: string; area: string };
  nextSlot?: { startTime: string } | null;
  slotCount: number;
}

export default function SwipeDeck({ items, destination }: { items: FeedItem[]; destination: string }) {
  const [deck, setDeck] = useState(items);
  const [toast, setToast] = useState<string | null>(null);

  async function act(item: FeedItem, action: "SHORTLIST" | "PASS") {
    setDeck((d) => d.filter((i) => i.id !== item.id));
    setToast(action === "SHORTLIST" ? `Shortlisted ${item.property.title} — open it to request a visit.` : null);
    await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryItemId: item.id, action }),
    }).catch(() => {});
  }

  if (deck.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        <p className="font-medium text-slate-700">You&apos;ve seen everything fresh near {destination}.</p>
        <p className="mt-1 text-sm">Try a different area, raise your budget, or check back — owners reconfirm availability daily.</p>
      </div>
    );
  }

  const top = deck[0];

  return (
    <div>
      {toast && (
        <div className="mb-4 rounded-lg bg-teal-50 px-4 py-2 text-sm text-teal-800">{toast}</div>
      )}
      <p className="mb-2 text-xs text-slate-400">{deck.length} fresh {deck.length === 1 ? "match" : "matches"} near {destination}</p>
      <div className="relative">
        {deck.slice(1, 3).map((item, i) => (
          <div
            key={item.id}
            className="absolute inset-0 rounded-2xl border border-slate-200 bg-white"
            style={{ transform: `translateY(${(i + 1) * 6}px) scale(${1 - (i + 1) * 0.02})`, zIndex: -i - 1 }}
          />
        ))}
        <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-900">{top.property.title}</p>
              <p className="text-sm text-slate-500">{top.property.area} · {top.distanceKm.toFixed(1)} km from {destination}</p>
            </div>
            <Badge status="ACTIVE" label={freshnessAgeLabel(new Date(top.lastConfirmedAt))} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400">Type</p>
              <p className="font-medium text-slate-800">{TYPE_LABEL[top.type]} · {top.configuration}</p>
            </div>
            <div>
              <p className="text-slate-400">Monthly total</p>
              <p className="font-medium text-slate-800">{formatInr(top.rentAmount)}</p>
            </div>
            <div>
              <p className="text-slate-400">Deposit</p>
              <p className="font-medium text-slate-800">{formatInr(top.depositAmount)}</p>
            </div>
            <div>
              <p className="text-slate-400">Furnishing</p>
              <p className="font-medium text-slate-800">{top.furnishing}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {top.slotCount > 0 && top.nextSlot ? (
              <>Next visit slot: <span className="font-medium text-slate-800">{formatDateTime(top.nextSlot.startTime)}</span> · {top.slotCount} open slot{top.slotCount === 1 ? "" : "s"} this week</>
            ) : (
              <>No open visit slots right now — owner hasn&apos;t published a calendar yet.</>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => act(top, "PASS")}
              aria-label="Pass"
              className="flex-1 rounded-full border border-slate-300 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              ✕ Pass
            </button>
            <button
              onClick={() => act(top, "SHORTLIST")}
              aria-label="Shortlist"
              className="flex-1 rounded-full border border-teal-600 py-2.5 font-medium text-teal-700 hover:bg-teal-50"
            >
              ♥ Interested
            </button>
          </div>
          <Link
            href={`/seeker/listing/${top.id}`}
            className="mt-3 block rounded-full bg-teal-700 py-2.5 text-center font-medium text-white hover:bg-teal-800"
          >
            View details &amp; book a visit
          </Link>
        </div>
      </div>
    </div>
  );
}
