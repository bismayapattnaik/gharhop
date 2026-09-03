"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface NavLink {
  href: string;
  label: string;
}

// Owner/admin don't get a bottom tab bar like the seeker phone-frame does,
// so on a narrow viewport their top-nav links need somewhere to go instead
// of colliding with the "GharHop" logo.
export default function MobileNavMenu({ links, dark }: { links: NavLink[]; dark: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        className={`flex h-8 w-8 items-center justify-center rounded-full ${dark ? "text-neutral-400 hover:bg-neutral-800" : "text-slate-500 hover:bg-slate-100"}`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border shadow-xl ${
            dark ? "border-neutral-800 bg-neutral-900" : "border-slate-200 bg-white"
          }`}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 text-sm ${dark ? "text-neutral-200 hover:bg-neutral-800" : "text-slate-700 hover:bg-slate-50"}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
