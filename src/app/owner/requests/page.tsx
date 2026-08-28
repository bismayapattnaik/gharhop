import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import RespondButtons from "@/components/owner/RespondButtons";
import { formatDateTime, TYPE_LABEL } from "@/lib/format";

export default async function OwnerRequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=OWNER");
  if (user.role !== "OWNER") redirect("/");

  const requests = await prisma.visit.findMany({
    where: { status: "REQUESTED", inventoryItem: { property: { ownerId: user.id } } },
    include: { seeker: true, inventoryItem: { include: { property: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Request inbox</h1>
      <p className="mb-4 text-sm text-slate-500">Median response target: under 30 minutes during active hours (PRD supply SLO).</p>

      {requests.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          No pending requests. Listings set to &quot;Instant confirm&quot; skip this inbox entirely.
        </p>
      )}

      <div className="space-y-3">
        {requests.map((visit) => (
          <div key={visit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <p className="font-semibold text-slate-900">{visit.seeker.name}</p>
              <p className="text-sm text-slate-500">
                {visit.inventoryItem.property.title} · {TYPE_LABEL[visit.inventoryItem.type]}
              </p>
              <p className="text-sm text-slate-700">{formatDateTime(visit.scheduledStart)}</p>
              <p className="text-xs text-slate-400">Requested {formatDateTime(visit.createdAt)}</p>
            </div>
            <RespondButtons visitId={visit.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
