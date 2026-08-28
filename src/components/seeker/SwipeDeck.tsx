"use client";

import Link from "next/link";
import { useState } from "react";
import { formatInr, TYPE_LABEL, formatDateTime } from "@/lib/format";
import { freshnessAgeLabel } from "@/lib/freshness";
import { gradientFor, TYPE_EMOJI } from "@/lib/visual";

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

const SWIPE_THRESHOLD = 110;
const FLY_OUT_MS = 260;

export default function SwipeDeck({ items, destination }: { items: FeedItem[]; destination: string }) {
  const [deck, setDeck] = useState(items);
  const [toast, setToast] = useState<string | null>(null);

  // Drag state for the top card only — the card underneath never moves.
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<"like" | "nope" | null>(null);
  const [pointerId, setPointerId] = useState<number | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  function fireInterest(item: FeedItem, action: "SHORTLIST" | "PASS") {
    setToast(action === "SHORTLIST" ? `Shortlisted ${item.property.title} — open it to request a visit.` : null);
    fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryItemId: item.id, action }),
    }).catch(() => {});
  }

  function resolve(item: FeedItem, direction: "like" | "nope") {
    if (leaving) return; // one swipe animation at a time
    setDragging(false);
    setLeaving(direction);
    setDrag({ x: direction === "like" ? 700 : -700, y: drag.y - 40 });
    fireInterest(item, direction === "like" ? "SHORTLIST" : "PASS");
    setTimeout(() => {
      setDeck((d) => d.filter((i) => i.id !== item.id));
      setDrag({ x: 0, y: 0 });
      setLeaving(null);
    }, FLY_OUT_MS);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (leaving) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setPointerId(e.pointerId);
    setStartPos({ x: e.clientX, y: e.clientY });
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || e.pointerId !== pointerId) return;
    setDrag({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
  }

  function onPointerUp(top: FeedItem) {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerId !== pointerId) return;
      setDragging(false);
      setPointerId(null);
      if (Math.abs(drag.x) > SWIPE_THRESHOLD) {
        resolve(top, drag.x > 0 ? "like" : "nope");
      } else {
        setDrag({ x: 0, y: 0 });
      }
    };
  }

  if (deck.length === 0) {
    return (
      <div className="mx-4 mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        <p className="font-medium text-slate-700">You&apos;ve seen everything fresh near {destination}.</p>
        <p className="mt-1 text-sm">Try a different area, raise your budget, or check back — owners reconfirm availability daily.</p>
      </div>
    );
  }

  const top = deck[0];
  const likeOpacity = Math.max(0, Math.min(1, drag.x / SWIPE_THRESHOLD));
  const nopeOpacity = Math.max(0, Math.min(1, -drag.x / SWIPE_THRESHOLD));

  return (
    <div className="px-4 pt-4">
      {toast && <div className="mb-3 rounded-lg bg-teal-50 px-4 py-2 text-sm text-teal-800">{toast}</div>}
      <p className="mb-2 text-xs text-slate-400">
        {deck.length} fresh {deck.length === 1 ? "match" : "matches"} near {destination}
      </p>

      <div className="relative" style={{ height: 520 }}>
        {deck.slice(1, 3).map((item, i) => (
          <div
            key={item.id}
            className="absolute inset-0 rounded-3xl border border-slate-200 bg-white shadow-sm"
            style={{ transform: `translateY(${(i + 1) * 8}px) scale(${1 - (i + 1) * 0.03})`, zIndex: 10 - i }}
          />
        ))}

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp(top)}
          onPointerCancel={() => {
            setDragging(false);
            setDrag({ x: 0, y: 0 });
          }}
          style={{
            transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 14}deg)`,
            transition: dragging ? "none" : "transform 260ms ease, opacity 260ms ease",
            opacity: leaving ? 0 : 1,
            touchAction: "none",
            zIndex: 20,
          }}
          className="absolute inset-0 flex select-none flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg"
        >
          {/* Photo header — gradient placeholder until real media is wired up (PRD GH-404) */}
          <div className="relative h-56 w-full overflow-hidden" style={{ background: gradientFor(top.id) }}>
            <span className="pointer-events-none absolute -bottom-6 -right-4 text-[9rem] leading-none opacity-15">
              {TYPE_EMOJI[top.type]}
            </span>
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
              <span className="rounded-full bg-black/30 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {top.distanceKm.toFixed(1)} km away
              </span>
              <span className="rounded-full bg-black/30 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {freshnessAgeLabel(new Date(top.lastConfirmedAt))}
              </span>
            </div>

            {/* Tinder-style LIKE / NOPE stamps, tied to live drag distance */}
            <div
              className="absolute left-4 top-16 rounded-lg border-4 border-emerald-400 px-3 py-1 text-2xl font-extrabold tracking-wider text-emerald-400"
              style={{ opacity: likeOpacity, transform: "rotate(-12deg)" }}
            >
              LIKE
            </div>
            <div
              className="absolute right-4 top-16 rounded-lg border-4 border-red-400 px-3 py-1 text-2xl font-extrabold tracking-wider text-red-400"
              style={{ opacity: nopeOpacity, transform: "rotate(12deg)" }}
            >
              NOPE
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
              <p className="text-lg font-bold text-white">{top.property.title}</p>
              <p className="text-sm text-white/80">{top.property.area} · {TYPE_LABEL[top.type]}</p>
            </div>
          </div>

          {/* Facts panel */}
          <div className="flex-1 space-y-2.5 overflow-y-auto p-3.5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Fact label="Monthly total" value={formatInr(top.rentAmount)} />
              <Fact label="Deposit" value={formatInr(top.depositAmount)} />
              <Fact label="Configuration" value={top.configuration} />
              <Fact label="Furnishing" value={top.furnishing} />
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {top.slotCount > 0 && top.nextSlot ? (
                <>
                  Next visit slot: <span className="font-medium text-slate-800">{formatDateTime(top.nextSlot.startTime)}</span> ·{" "}
                  {top.slotCount} open slot{top.slotCount === 1 ? "" : "s"} this week
                </>
              ) : (
                <>No open visit slots right now.</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Round action buttons — mirror the drag gesture for accessibility (GH-402) */}
      <div className="mt-5 flex items-center justify-center gap-6">
        <button
          aria-label="Pass"
          disabled={!!leaving}
          onClick={() => resolve(top, "nope")}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-200 bg-white text-2xl text-red-500 shadow-sm transition hover:scale-105 hover:bg-red-50 active:scale-95 disabled:opacity-50"
        >
          ✕
        </button>
        <Link
          href={`/seeker/listing/${top.id}`}
          className="flex h-11 items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-medium text-white shadow-sm hover:bg-teal-800"
        >
          Details &amp; book
        </Link>
        <button
          aria-label="Interested"
          disabled={!!leaving}
          onClick={() => resolve(top, "like")}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-teal-200 bg-white text-2xl text-teal-600 shadow-sm transition hover:scale-105 hover:bg-teal-50 active:scale-95 disabled:opacity-50"
        >
          ♥
        </button>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
