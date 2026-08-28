import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Badge from "@/components/Badge";
import VisitActions from "@/components/seeker/VisitActions";
import { formatDateTime, TYPE_LABEL } from "@/lib/format";

export default async function SeekerVisitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=SEEKER");
  if (user.role !== "SEEKER") redirect("/");

  const visits = await prisma.visit.findMany({
    where: { seekerId: user.id },
    include: { inventoryItem: { include: { property: true } } },
    orderBy: { scheduledStart: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="mb-4 text-xl font-bold text-slate-900">My Visits</h1>
      {visits.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          No visits yet. Head to Discover and shortlist a place to book your first visit.
        </p>
      )}
      <div className="space-y-3">
        {visits.map((visit) => (
          <div key={visit.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{visit.inventoryItem.property.title}</p>
                <p className="text-sm text-slate-500">
                  {TYPE_LABEL[visit.inventoryItem.type]} · {visit.inventoryItem.property.area}
                </p>
                <p className="mt-1 text-sm text-slate-700">{formatDateTime(visit.scheduledStart)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge status={visit.status} />
                {visit.outcome && <Badge status="COMPLETED" label={visit.outcome.replaceAll("_", " ")} />}
              </div>
            </div>
            <div className="mt-3">
              <VisitActions visit={{ id: visit.id, status: visit.status, outcome: visit.outcome }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
