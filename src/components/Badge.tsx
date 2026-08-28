const STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  STALE: "bg-red-100 text-red-700",
  DRAFT: "bg-slate-100 text-slate-600",
  PAUSED: "bg-amber-100 text-amber-700",
  RENTED: "bg-slate-200 text-slate-500",
  OPEN: "bg-emerald-100 text-emerald-700",
  HELD: "bg-amber-100 text-amber-700",
  BOOKED: "bg-blue-100 text-blue-700",
  BLOCKED: "bg-slate-100 text-slate-500",
  CANCELLED: "bg-slate-100 text-slate-500",
  REQUESTED: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  CHECKED_IN: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED_BY_SEEKER: "bg-slate-100 text-slate-500",
  CANCELLED_BY_HOST: "bg-red-100 text-red-700",
  NO_SHOW_SEEKER: "bg-red-100 text-red-700",
  NO_SHOW_HOST: "bg-red-100 text-red-700",
  EXPIRED: "bg-slate-100 text-slate-500",
  OPEN_REPORT: "bg-red-100 text-red-700",
};

// Dark-tone palette for the seeker mobile screens (bg-neutral-950 pages) —
// pastel badges disappear on dark backgrounds, so this swaps to
// translucent-on-dark chips instead of restyling every call site.
const DARK_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  STALE: "bg-red-500/15 text-red-400",
  DRAFT: "bg-neutral-700/50 text-neutral-300",
  PAUSED: "bg-amber-500/15 text-amber-400",
  RENTED: "bg-neutral-700/50 text-neutral-400",
  OPEN: "bg-emerald-500/15 text-emerald-400",
  HELD: "bg-amber-500/15 text-amber-400",
  BOOKED: "bg-blue-500/15 text-blue-400",
  BLOCKED: "bg-neutral-700/50 text-neutral-400",
  CANCELLED: "bg-neutral-700/50 text-neutral-400",
  REQUESTED: "bg-amber-500/15 text-amber-400",
  CONFIRMED: "bg-blue-500/15 text-blue-400",
  CHECKED_IN: "bg-indigo-500/15 text-indigo-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-400",
  CANCELLED_BY_SEEKER: "bg-neutral-700/50 text-neutral-400",
  CANCELLED_BY_HOST: "bg-red-500/15 text-red-400",
  NO_SHOW_SEEKER: "bg-red-500/15 text-red-400",
  NO_SHOW_HOST: "bg-red-500/15 text-red-400",
  EXPIRED: "bg-neutral-700/50 text-neutral-400",
  OPEN_REPORT: "bg-red-500/15 text-red-400",
};

export default function Badge({ status, label, tone = "light" }: { status: string; label?: string; tone?: "light" | "dark" }) {
  const palette = tone === "dark" ? DARK_STYLES : STYLES;
  const fallback = tone === "dark" ? "bg-neutral-700/50 text-neutral-300" : "bg-slate-100 text-slate-600";
  const style = palette[status] ?? fallback;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {label ?? status.replaceAll("_", " ")}
    </span>
  );
}
