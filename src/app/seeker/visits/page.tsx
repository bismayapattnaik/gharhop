import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Badge from "@/components/Badge";
import VisitActions from "@/components/seeker/VisitActions";
import { formatDateTime, TYPE_LABEL } from "@/lib/format";
import { gradientFor, TYPE_EMOJI } from "@/lib/visual";
import { parsePhotos } from "@/lib/photos";

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
      <h1 className="mb-4 text-xl font-bold text-white">My Visits</h1>
      {visits.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-700 bg-neutral-900 p-8 text-center text-neutral-400">
          No visits yet. Head to Discover and shortlist a place to book your first visit.
        </p>
      )}
      <div className="space-y-3">
        {visits.map((visit) => {
          const cover = parsePhotos(visit.inventoryItem.photos)[0];
          return (
          <div key={visit.id} className="overflow-hidden rounded-xl bg-neutral-900">
            <div className="flex items-center gap-3 p-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xl"
                style={!cover ? { background: gradientFor(visit.inventoryItem.id) } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- fixed demo asset */}
                {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : TYPE_EMOJI[visit.inventoryItem.type]}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{visit.inventoryItem.property.title}</p>
                    <p className="text-xs text-neutral-500">
                      {TYPE_LABEL[visit.inventoryItem.type]} · {visit.inventoryItem.property.area}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone="dark" status={visit.status} />
                    {visit.outcome && <Badge tone="dark" status="COMPLETED" label={visit.outcome.replaceAll("_", " ")} />}
                  </div>
                </div>
                <p className="mt-1 text-sm text-neutral-300">{formatDateTime(visit.scheduledStart)}</p>
              </div>
            </div>
            <div className="border-t border-neutral-800 p-3">
              <VisitActions
                visit={{
                  id: visit.id,
                  status: visit.status,
                  outcome: visit.outcome,
                  proposedByOwner: visit.proposedByOwner,
                  scheduledStart: visit.scheduledStart.toISOString(),
                }}
              />
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
