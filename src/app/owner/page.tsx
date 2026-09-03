import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { derivedStatus, freshnessAgeLabel } from "@/lib/freshness";
import Badge from "@/components/Badge";
import ReconfirmButton from "@/components/owner/ReconfirmButton";
import StatusControl from "@/components/owner/StatusControl";
import { formatInr, TYPE_LABEL } from "@/lib/format";
import { ownerEntitlements } from "@/lib/billing";

export default async function OwnerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=OWNER");
  if (user.role !== "OWNER") redirect("/");

  const properties = await prisma.property.findMany({
    where: { ownerId: user.id },
    include: { items: { include: { slots: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  const staleCount = properties.flatMap((p) => p.items).filter((i) => derivedStatus(i) === "STALE").length;
  const activeCount = properties.flatMap((p) => p.items).filter((i) => ["ACTIVE", "PENDING_VERIFICATION"].includes(i.status)).length;
  const entitlements = await ownerEntitlements(user.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Listings</h1>
          <p className="text-sm text-slate-500">
            {staleCount > 0 ? (
              <span className="text-red-600">{staleCount} listing{staleCount === 1 ? "" : "s"} gone stale — reconfirm to bring them back into search.</span>
            ) : (
              "All active listings are within their freshness window."
            )}
          </p>
        </div>
        <Link href="/owner/new" className="rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
          + Add property
        </Link>
      </div>

      <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
        {activeCount}/{entitlements.maxActiveListings} active listing{entitlements.maxActiveListings === 1 ? "" : "s"} used
        {entitlements.hasFastFill ? " · FastFill active" : ""} ·{" "}
        <Link href="/owner/plans" className="text-teal-700 underline">
          Manage plan
        </Link>
      </p>

      {properties.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          No properties yet. Add your first one to start publishing visit slots.
        </p>
      )}

      <div className="space-y-4">
        {properties.map((property) => (
          <div key={property.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{property.title}</p>
            <p className="text-sm text-slate-500">{property.area} · {property.address}</p>

            <div className="mt-3 space-y-2">
              {property.items.map((item) => {
                const status = derivedStatus(item);
                const openSlots = item.slots.filter((s) => s.status === "OPEN").length;
                return (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {TYPE_LABEL[item.type]} · {item.configuration} · {formatInr(item.rentAmount)}/mo
                      </p>
                      <p className="text-xs text-slate-500">
                        {openSlots} open slot{openSlots === 1 ? "" : "s"} · {freshnessAgeLabel(item.lastConfirmedAt)}
                      </p>
                      {item.status === "REJECTED" && item.rejectionReason && (
                        <p className="mt-1 text-xs text-red-600">Rejected: {item.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={status} />
                      {["ACTIVE", "PAUSED", "RENTED"].includes(item.status) && (
                        <StatusControl itemId={item.id} status={item.status} />
                      )}
                      {item.status !== "PENDING_VERIFICATION" && item.status !== "RENTED" && (
                        <ReconfirmButton itemId={item.id} status={item.status} />
                      )}
                      <Link href={`/owner/items/${item.id}`} className="text-sm text-teal-700 underline">
                        Manage
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
