"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/seeker",
    label: "Discover",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <path
          d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5Z"
          stroke="currentColor"
          strokeWidth={active ? 0 : 1.8}
          fill={active ? "currentColor" : "none"}
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/seeker/visits",
    label: "My Visits",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth={1.8} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
        <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur lg:absolute">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              active ? "text-teal-700" : "text-slate-400"
            }`}
          >
            {tab.icon(active)}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
