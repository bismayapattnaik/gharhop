"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// PRD GH-707 "Notification center" — event-triggered only (no time-based
// reminders; that needs a background scheduler this prototype doesn't have).
export default function NotificationBell({ dark }: { dark?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    // Fetch-on-mount + poll: the setState calls happen after the fetch's
    // await, not synchronously in the effect body, but the linter's static
    // analysis flags the call site regardless — standard data-fetching
    // pattern, not an actual render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      setUnreadCount(0);
      await fetch("/api/notifications/read-all", { method: "POST" });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
          dark ? "text-neutral-400 hover:bg-neutral-800" : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M6 8a6 6 0 1 1 12 0c0 3 1 4.5 1.5 5.5H4.5C5 12.5 6 11 6 8Z"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinejoin="round"
          />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-600 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 z-50 mt-2 w-72 rounded-xl border shadow-xl ${
            dark ? "border-neutral-800 bg-neutral-900" : "border-slate-200 bg-white"
          }`}
        >
          <div className={`border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide ${dark ? "border-neutral-800 text-neutral-500" : "border-slate-100 text-slate-500"}`}>
            Notifications
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className={`px-3 py-6 text-center text-sm ${dark ? "text-neutral-500" : "text-slate-400"}`}>Nothing yet.</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setOpen(false);
                  if (n.link) router.push(n.link);
                }}
                className={`block w-full border-b px-3 py-2.5 text-left text-sm last:border-b-0 ${
                  dark ? "border-neutral-800 hover:bg-neutral-800" : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <p className={dark ? "text-neutral-200" : "text-slate-700"}>{n.message}</p>
                <p className={`mt-0.5 text-xs ${dark ? "text-neutral-500" : "text-slate-400"}`}>{timeAgo(n.createdAt)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
