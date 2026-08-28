"use client";

import Link from "next/link";
import { useState } from "react";
import { formatInr, TYPE_LABEL, formatDateTime } from "@/lib/format";
import { freshnessAgeLabel } from "@/lib/freshness";
import { gradientFor } from "@/lib/visual";

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
  coverPhoto?: string | null;
}

const SWIPE_THRESHOLD = 110;
const FLY_OUT_MS = 260;
const STACK_HEIGHT = 560;

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
      <div className="mx-4 mt-6 rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 p-10 text-center text-neutral-400">
        <p className="font-medium text-neutral-200">You&apos;ve seen everything fresh near {destination}.</p>
        <p className="mt-1 text-sm">Try a different area, raise your budget, or check back — owners reconfirm availability daily.</p>
      </div>
    );
  }

  const top = deck[0];
  const likeOpacity = Math.max(0, Math.min(1, drag.x / SWIPE_THRESHOLD));
  const nopeOpacity = Math.max(0, Math.min(1, -drag.x / SWIPE_THRESHOLD));

  return (
    <div className="px-4 pt-4">
      {toast && <div className="mb-3 rounded-lg bg-orange-500/15 px-4 py-2 text-sm text-orange-300">{toast}</div>}
      <p className="mb-2 text-xs text-neutral-500">
        {deck.length} fresh {deck.length === 1 ? "match" : "matches"} near {destination}
      </p>

      <div className="relative" style={{ height: STACK_HEIGHT }}>
        {deck.slice(1, 3).map((item, i) => (
          <div
            key={item.id}
            className="absolute inset-0 rounded-3xl border border-neutral-800 bg-neutral-900"
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
          className="absolute inset-0 flex select-none flex-col overflow-hidden rounded-3xl bg-neutral-900 shadow-2xl shadow-black/50"
        >
          {/* Photo — real demo photo when assigned, gradient as fallback (PRD GH-404 media provenance is P1) */}
          <div className="relative h-[340px] w-full shrink-0 overflow-hidden" style={!top.coverPhoto ? { background: gradientFor(top.id) } : undefined}>
            {top.coverPhoto && (
              // eslint-disable-next-line @next/next/no-img-element -- fixed demo assets
              <img src={top.coverPhoto} alt={top.property.title} className="absolute inset-0 h-full w-full object-cover" />
            )}

            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
              <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {top.distanceKm.toFixed(1)} km away
              </span>
              <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                {freshnessAgeLabel(new Date(top.lastConfirmedAt))}
              </span>
            </div>

            {/* Drag feedback stamps */}
            <div
              className="absolute left-5 top-1/3 rounded-lg border-4 border-orange-400 px-3 py-1 text-3xl font-extrabold tracking-wider text-orange-400"
              style={{ opacity: likeOpacity, transform: "rotate(-12deg)" }}
            >
              LIKE
            </div>
            <div
              className="absolute right-5 top-1/3 rounded-lg border-4 border-rose-400 px-3 py-1 text-3xl font-extrabold tracking-wider text-rose-400"
              style={{ opacity: nopeOpacity, transform: "rotate(12deg)" }}
            >
              NOPE
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent px-4 pt-14 pb-10">
              <p className="truncate text-xl font-bold text-white">{top.property.title}</p>
              <p className="truncate text-sm text-white/70">
                {top.property.area} · {TYPE_LABEL[top.type]}
              </p>
            </div>
          </div>

          {/* Floating action cluster — straddles the photo/panel seam. Kept
              clear of the title/area text above via the overlay's pb-10. */}
          <div className="relative z-10 -mt-7 flex items-center justify-center gap-5">
            <button
              aria-label="Pass"
              disabled={!!leaving}
              onClick={() => resolve(top, "nope")}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 text-2xl text-rose-400 shadow-lg shadow-black/40 transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              ✕
            </button>
            <Link
              href={`/seeker/listing/${top.id}`}
              aria-label="View details"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800 text-lg text-white shadow-md shadow-black/40 transition hover:scale-105"
            >
              ⓘ
            </Link>
            <button
              aria-label="Interested"
              disabled={!!leaving}
              onClick={() => resolve(top, "like")}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 text-2xl text-white shadow-lg shadow-black/40 transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              ♥
            </button>
          </div>

          {/* Facts panel */}
          <div className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-4 pb-4 pt-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Fact label="Monthly total" value={formatInr(top.rentAmount)} />
              <Fact label="Deposit" value={formatInr(top.depositAmount)} />
              <Fact label="Configuration" value={top.configuration} />
              <Fact label="Furnishing" value={top.furnishing} />
            </div>
            <div className="rounded-lg bg-neutral-800/70 px-3 py-2 text-sm text-neutral-300">
              {top.slotCount > 0 && top.nextSlot ? (
                <>
                  Next visit slot: <span className="font-medium text-white">{formatDateTime(top.nextSlot.startTime)}</span> ·{" "}
                  {top.slotCount} open slot{top.slotCount === 1 ? "" : "s"} this week
                </>
              ) : (
                <>No open visit slots right now.</>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="font-medium text-neutral-100">{value}</p>
    </div>
  );
}
