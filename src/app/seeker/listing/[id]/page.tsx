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
import { gradientFor, TYPE_EMOJI } from "@/lib/visual";

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

  const tags = [
    { icon: "🛋️", label: item.furnishing },
    { icon: TYPE_EMOJI[item.type], label: TYPE_LABEL[item.type] },
    { icon: "📅", label: `From ${item.availableFrom.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` },
    ...(item.occupancyPolicy ? [{ icon: "👥", label: item.occupancyPolicy }] : []),
  ];

  return (
    <div className="pb-2">
      {/* Photo header, floating back button */}
      <div className="relative h-64 w-full" style={{ background: gradientFor(item.id) }}>
        <span className="pointer-events-none absolute -bottom-8 -right-4 text-[9rem] leading-none opacity-20">
          {TYPE_EMOJI[item.type]}
        </span>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Link
            href="/seeker"
            aria-label="Back to Discover"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
          >
            ←
          </Link>
          <Badge tone="dark" status={status} label={status === "ACTIVE" ? freshnessAgeLabel(item.lastConfirmedAt) : undefined} />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent p-4 pt-12">
          <h1 className="text-2xl font-bold text-white">{item.property.title}</h1>
          <p className="text-sm text-white/70">
            {item.property.area} · {TYPE_LABEL[item.type]} · {item.configuration}
          </p>
        </div>
      </div>

      <div className="space-y-5 px-4 pt-4">
        <div className="flex items-center justify-between rounded-2xl bg-neutral-900 p-4">
          <div>
            <p className="text-xs text-neutral-500">Monthly total</p>
            <p className="text-xl font-bold text-white">{formatInr(item.rentAmount)}</p>
          </div>
          <div className="h-8 w-px bg-neutral-800" />
          <div>
            <p className="text-xs text-neutral-500">Deposit</p>
            <p className="text-lg font-semibold text-neutral-200">{formatInr(item.depositAmount)}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Details</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag.label} className="rounded-full bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200">
                <span aria-hidden>{tag.icon}</span> {tag.label}
              </span>
            ))}
          </div>
        </div>

        <p className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-neutral-500">
          Exact address is shared once your visit is confirmed. Right now you&apos;re seeing the general area only —
          this protects both seekers and owners from unnecessary exposure (GharHop privacy policy, section 10).
        </p>

        <div className="flex items-center justify-between">
          <InterestButtons itemId={item.id} initialAction={interest?.action} />
          <ReportButton targetType="LISTING" targetId={item.id} />
        </div>

        <div className="rounded-2xl bg-neutral-900 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Book a visit</p>
          <p className="mb-4 text-sm text-neutral-400">
            Pick an open slot below. It&apos;s a real hold on the owner&apos;s calendar — not a wish list.
          </p>
          {status === "ACTIVE" ? (
            <SlotPicker
              bookingMode={item.bookingMode}
              slots={item.slots.map((s) => ({ id: s.id, startTime: s.startTime.toISOString(), endTime: s.endTime.toISOString() }))}
            />
          ) : (
            <p className="rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
              This listing is {status.toLowerCase()} and isn&apos;t currently bookable.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
