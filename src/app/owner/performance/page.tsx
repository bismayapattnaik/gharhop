import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { derivedStatus } from "@/lib/freshness";

export default async function OwnerPerformancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=OWNER");
  if (user.role !== "OWNER") redirect("/");

  const items = await prisma.inventoryItem.findMany({
    where: { property: { ownerId: user.id } },
    include: { visits: true, interests: true },
  });

  const activeCount = items.filter((i) => derivedStatus(i) === "ACTIVE").length;
  const staleCount = items.filter((i) => derivedStatus(i) === "STALE").length;
  const shortlists = items.reduce((sum, i) => sum + i.interests.filter((int) => int.action === "SHORTLIST").length, 0);
  const visits = items.flatMap((i) => i.visits);
  const confirmed = visits.filter((v) => ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(v.status)).length;
  const completed = visits.filter((v) => v.status === "COMPLETED").length;
  const noShowSeeker = visits.filter((v) => v.status === "NO_SHOW_SEEKER").length;
  const seriousNextStep = visits.filter((v) => v.outcome && ["OFFER", "SHORTLIST"].includes(v.outcome)).length;

  const completionRate = confirmed > 0 ? Math.round((completed / confirmed) * 100) : 0;
  const seriousRate = completed > 0 ? Math.round((seriousNextStep / completed) * 100) : 0;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Performance</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Active listings" value={activeCount} />
        <Stat label="Stale listings" value={staleCount} warn={staleCount > 0} />
        <Stat label="Shortlists received" value={shortlists} />
        <Stat label="Confirmed visits" value={confirmed} />
        <Stat label="Completed visits" value={completed} />
        <Stat label="Visit completion rate" value={`${completionRate}%`} warn={confirmed > 0 && completionRate < 60} />
        <Stat label="Seeker no-shows" value={noShowSeeker} warn={noShowSeeker > 0} />
        <Stat label="Serious next-step rate" value={`${seriousRate}%`} warn={completed > 0 && seriousRate < 15} />
      </div>
      <p className="mt-6 text-xs text-slate-400">
        PRD decision gates: ≥60% visit completion, ≥15% serious next-step rate, &lt;1% severe fraud. Numbers below
        those thresholds are flagged in red the same way the concierge pilot scorecard does.
      </p>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${warn ? "text-red-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
