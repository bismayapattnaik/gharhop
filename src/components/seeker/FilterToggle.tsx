"use client";

import { useState } from "react";

// Keeps the header uncluttered (matches the reference: a search/filter icon
// next to the greeting rather than a permanently-open filter form). Takes
// the greeting row as its own slot so the collapsible panel below can span
// full width regardless of where the toggle button sits.
export default function FilterToggle({
  greeting,
  children,
  active,
}: {
  greeting: React.ReactNode;
  children: React.ReactNode;
  active: boolean;
}) {
  const [open, setOpen] = useState(active);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        {greeting}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Filters"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
            open || active
              ? "border-orange-500/40 bg-orange-500/15 text-orange-400"
              : "border-neutral-700 bg-neutral-800 text-neutral-400"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
