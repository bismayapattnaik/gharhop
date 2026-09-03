import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { derivedStatus, freshnessAgeLabel } from "@/lib/freshness";
import Badge from "@/components/Badge";
import ReportActionButtons from "@/components/admin/ReportActionButtons";
import AdminItemActions from "@/components/admin/AdminItemActions";
import AdminVisitActions from "@/components/admin/AdminVisitActions";
import VerificationActions from "@/components/admin/VerificationActions";
import { formatDateTime, formatInr, TYPE_LABEL } from "@/lib/format";

export default async function AdminConsolePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=ADMIN");
  if (user.role !== "ADMIN") redirect("/");

  const [items, visits, reports, seekerCount, ownerCount, recentOrders] = await Promise.all([
    prisma.inventoryItem.findMany({ include: { property: { include: { owner: true } } } }),
    prisma.visit.findMany({
      include: { seeker: true, inventoryItem: { include: { property: true } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.trustReport.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where: { role: "SEEKER" } }),
    prisma.user.count({ where: { role: "OWNER" } }),
    prisma.order.findMany({ where: { status: "SUCCEEDED" }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);

  // Company-level metric (business plan section 19): net revenue by
  // engine, not just order count — a mock ledger since there's no real
  // payment gateway, but real Order rows, not a spreadsheet.
  const revenueByType = recentOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.type] = (acc[o.type] ?? 0) + o.amountInr;
    return acc;
  }, {});
  const totalRevenue = Object.values(revenueByType).reduce((a, b) => a + b, 0);

  const stale = items.filter((i) => derivedStatus(i) === "STALE");
  const active = items.filter((i) => derivedStatus(i) === "ACTIVE");
  const pendingVerification = items.filter((i) => i.status === "PENDING_VERIFICATION");
  const completedVisits = visits.filter((v) => v.status === "COMPLETED").length;
  const confirmedVisits = visits.filter((v) => ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(v.status)).length;
  const severeFraud = reports.filter((r) => r.category === "Fraud").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ops console</h1>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Active listings" value={active.length} />
          <Stat label="Pending review" value={pendingVerification.length} warn={pendingVerification.length > 0} />
          <Stat label="Stale listings" value={stale.length} warn={stale.length > 0} />
          <Stat label="Seekers / Owners" value={`${seekerCount} / ${ownerCount}`} />
          <Stat label="Open trust cases" value={reports.length} warn={reports.length > 0} />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Decision gates from the PRD: 300+ fresh units, 70% slot coverage, ≥60% visit completion, &lt;1% severe
          fraud. Completion so far: {confirmedVisits > 0 ? Math.round((completedVisits / confirmedVisits) * 100) : 0}%
          {severeFraud > 0 && <span className="text-red-600"> · {severeFraud} fraud report(s) open</span>}.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Pending verification</h2>
        <p className="mb-2 text-xs text-slate-400">New/resubmitted listings — nothing here reaches seeker search until approved (PRD listing lifecycle).</p>
        {pendingVerification.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing awaiting review.</p>
        ) : (
          <div className="space-y-2">
            {pendingVerification.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm">
                <span>
                  {item.property.title} · {TYPE_LABEL[item.type]} · owner {item.property.owner.name} ({item.property.owner.phone})
                </span>
                <VerificationActions itemId={item.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Freshness / stale queue</h2>
        {stale.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing stale right now.</p>
        ) : (
          <div className="space-y-2">
            {stale.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
                <span>
                  {item.property.title} · {TYPE_LABEL[item.type]} · owner {item.property.owner.name} ({item.property.owner.phone})
                  <span className="ml-2 text-red-700">{freshnessAgeLabel(item.lastConfirmedAt)}</span>
                </span>
                <AdminItemActions itemId={item.id} status={item.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">All listings</h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <span>
                {item.property.title} · {TYPE_LABEL[item.type]} · {item.property.owner.name}
              </span>
              <div className="flex items-center gap-2">
                <Badge status={derivedStatus(item)} />
                <AdminItemActions itemId={item.id} status={item.status} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Visit operations timeline</h2>
        <div className="space-y-2">
          {visits.map((visit) => (
            <div key={visit.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm">
              <span>
                {visit.seeker.name} → {visit.inventoryItem.property.title} · {formatDateTime(visit.scheduledStart)}
                {visit.proposedByOwner && <span className="ml-2 text-xs text-amber-600">(owner proposed new time)</span>}
              </span>
              <div className="flex items-center gap-2">
                <Badge status={visit.status} />
                <AdminVisitActions visitId={visit.id} status={visit.status} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Revenue (mock — last {recentOrders.length} orders)</h2>
        <p className="mb-2 text-xs text-slate-400">
          No real payment gateway in this prototype (business plan section 21 says mock, not fake) — every row below is still a real
          Order created by lib/billing.ts, not a spreadsheet estimate.
        </p>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-slate-400">No orders yet.</p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-2">
              {Object.entries(revenueByType).map(([type, amount]) => (
                <span key={type} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  {type.replaceAll("_", " ")}: {formatInr(amount)}
                </span>
              ))}
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">Total: {formatInr(totalRevenue)}</span>
            </div>
            <div className="space-y-1.5">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm">
                  <span>
                    {order.type.replaceAll("_", " ")} · {order.user.name} ({order.user.role})
                  </span>
                  <span className="font-medium text-slate-800">{formatInr(order.amountInr)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Trust cases</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-400">No open reports.</p>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div key={report.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{report.category} · {report.targetType} #{report.targetId.slice(0, 8)}</p>
                  {report.details && <p className="text-xs text-slate-500">{report.details}</p>}
                </div>
                <ReportActionButtons reportId={report.id} />
              </div>
            ))}
          </div>
        )}
      </section>
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
