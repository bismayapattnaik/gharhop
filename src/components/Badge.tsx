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

export default function Badge({ status, label }: { status: string; label?: string }) {
  const style = STYLES[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {label ?? status.replaceAll("_", " ")}
    </span>
  );
}
