import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { derivedStatus, freshnessAgeLabel } from "@/lib/freshness";
import Badge from "@/components/Badge";
import ReconfirmButton from "@/components/owner/ReconfirmButton";
import StatusControl from "@/components/owner/StatusControl";
import NewSlotsForm from "@/components/owner/NewSlotsForm";
import RespondButtons from "@/components/owner/RespondButtons";
import BookingModeSelect from "@/components/owner/BookingModeSelect";
import PhotoManager from "@/components/owner/PhotoManager";
import { formatInr, formatDateTime, TYPE_LABEL } from "@/lib/format";
import { parsePhotos } from "@/lib/photos";

export default async function ManageItemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=OWNER");
  if (user.role !== "OWNER") redirect("/");

  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      property: true,
      slots: { orderBy: { startTime: "asc" } },
      visits: { include: { seeker: true }, orderBy: { scheduledStart: "asc" } },
    },
  });
  if (!item || item.property.ownerId !== user.id) notFound();

  const status = derivedStatus(item);
  const openSlots = item.slots
    .filter((s) => s.status === "OPEN")
    .map((s) => ({ id: s.id, startTime: s.startTime.toISOString() }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{item.property.title}</h1>
            <p className="text-sm text-slate-500">
              {TYPE_LABEL[item.type]} · {item.configuration} · {formatInr(item.rentAmount)}/mo
            </p>
            <p className="mt-1 text-xs text-slate-400">{freshnessAgeLabel(item.lastConfirmedAt)} · TTL {item.freshnessTtlHours}h</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge status={status} />
            <StatusControl itemId={item.id} status={item.status} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <ReconfirmButton itemId={item.id} />
          <BookingModeSelect itemId={item.id} bookingMode={item.bookingMode} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Photos &amp; room tour</h2>
        <p className="mb-3 text-sm text-slate-500">
          Seekers see these as a swipeable Room Tour with a drag-to-pan preview on the detail page.
        </p>
        <PhotoManager itemId={item.id} photos={parsePhotos(item.photos)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Visit slots</h2>
        <div className="mt-3">
          <NewSlotsForm itemId={item.id} />
        </div>
        <div className="mt-4 space-y-1">
          {item.slots.length === 0 && <p className="text-sm text-slate-400">No slots published yet — seekers can&apos;t request a visit.</p>}
          {item.slots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span>{formatDateTime(slot.startTime)}</span>
              <Badge status={slot.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Visits for this listing</h2>
        <div className="mt-3 space-y-2">
          {item.visits.length === 0 && <p className="text-sm text-slate-400">No visit requests yet.</p>}
          {item.visits.map((visit) => (
            <div key={visit.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-800">{visit.seeker.name}</p>
                <p className="text-xs text-slate-500">{formatDateTime(visit.scheduledStart)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={visit.status} />
                {visit.status === "REQUESTED" && !visit.proposedByOwner && (
                  <RespondButtons visitId={visit.id} alternateSlots={openSlots} />
                )}
                {visit.status === "REQUESTED" && visit.proposedByOwner && (
                  <span className="text-xs text-slate-400">Waiting on seeker to accept your proposed time</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
