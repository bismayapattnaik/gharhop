import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { derivedStatus, freshnessAgeLabel } from "@/lib/freshness";
import Badge from "@/components/Badge";
import SlotPicker from "@/components/seeker/SlotPicker";
import InterestButtons from "@/components/seeker/InterestButtons";
import ReportButton from "@/components/ReportButton";
import { formatInr, TYPE_LABEL } from "@/lib/format";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=SEEKER");
  if (user.role !== "SEEKER") redirect("/");

  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      property: true,
      slots: { where: { status: "OPEN" }, orderBy: { startTime: "asc" } },
    },
  });
  if (!item) notFound();

  const interest = await prisma.interest.findUnique({
    where: { seekerId_inventoryItemId: { seekerId: user.id, inventoryItemId: item.id } },
  });

  const status = derivedStatus(item);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <Link href="/seeker" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700">
        ← Back to Discover
      </Link>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{item.property.title}</h1>
            <p className="text-slate-500">{item.property.area} · {TYPE_LABEL[item.type]} · {item.configuration}</p>
          </div>
          <Badge status={status} label={status === "ACTIVE" ? freshnessAgeLabel(item.lastConfirmedAt) : undefined} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fact label="Monthly rent" value={formatInr(item.rentAmount)} />
          <Fact label="Deposit" value={formatInr(item.depositAmount)} />
          <Fact label="Furnishing" value={item.furnishing} />
          <Fact label="Available from" value={item.availableFrom.toLocaleDateString("en-IN")} />
        </div>
        {item.occupancyPolicy && (
          <p className="mt-3 text-sm text-slate-500">Occupancy policy: {item.occupancyPolicy}</p>
        )}

        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Exact address is shared once your visit is confirmed. Right now you&apos;re seeing the general area only —
          this protects both seekers and owners from unnecessary exposure (GharHop privacy policy, section 10).
        </p>

        <div className="mt-4 flex items-center justify-between">
          <InterestButtons itemId={item.id} initialAction={interest?.action} />
          <ReportButton targetType="LISTING" targetId={item.id} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Book a visit</h2>
        <p className="mt-1 text-sm text-slate-500">
          Pick an open slot below. It&apos;s a real hold on the owner&apos;s calendar — not a wish list.
        </p>
        <div className="mt-4">
          {status === "ACTIVE" ? (
            <SlotPicker
              bookingMode={item.bookingMode}
              slots={item.slots.map((s) => ({ id: s.id, startTime: s.startTime.toISOString(), endTime: s.endTime.toISOString() }))}
            />
          ) : (
            <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              This listing is {status.toLowerCase()} and isn&apos;t currently bookable.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
