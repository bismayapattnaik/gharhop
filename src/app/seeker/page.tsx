import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isDiscoverable } from "@/lib/freshness";
import { haversineKm, MICRO_MARKETS } from "@/lib/geo";
import FilterBar from "@/components/seeker/FilterBar";
import FilterToggle from "@/components/seeker/FilterToggle";
import UseLocationButton from "@/components/seeker/UseLocationButton";
import SwipeDeck, { type FeedItem } from "@/components/seeker/SwipeDeck";
import { parsePhotos } from "@/lib/photos";
import type { InventoryType } from "@prisma/client";

export default async function SeekerFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string; type?: string; budget?: string; lat?: string; lng?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=SEEKER");
  if (user.role !== "SEEKER") redirect("/");

  const sp = await searchParams;
  // Real device GPS wins when the seeker has granted it (PRD GH-201) —
  // manual micro-market stays as the fallback for denied/unavailable location.
  const liveLat = sp.lat ? Number(sp.lat) : null;
  const liveLng = sp.lng ? Number(sp.lng) : null;
  const usingLiveLocation = liveLat != null && liveLng != null && !Number.isNaN(liveLat) && !Number.isNaN(liveLng);

  const destination = MICRO_MARKETS.find((m) => m.name === sp.destination) ?? MICRO_MARKETS[0];
  const referencePoint = usingLiveLocation ? { lat: liveLat!, lng: liveLng! } : destination;
  const referenceLabel = usingLiveLocation ? "Your current location" : destination.name;
  const typeFilter = sp.type && sp.type !== "ALL" ? (sp.type as InventoryType) : undefined;
  const budget = sp.budget ? Number(sp.budget) : undefined;

  const seenIds = (
    await prisma.interest.findMany({ where: { seekerId: user.id }, select: { inventoryItemId: true } })
  ).map((i) => i.inventoryItemId);

  const items = await prisma.inventoryItem.findMany({
    where: {
      status: "ACTIVE",
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(budget ? { rentAmount: { lte: budget } } : {}),
      id: { notIn: seenIds },
    },
    include: {
      property: true,
      slots: { where: { status: "OPEN" }, orderBy: { startTime: "asc" } },
    },
  });

  const feed: FeedItem[] = items
    .filter(isDiscoverable)
    .map((item) => ({
      id: item.id,
      type: item.type,
      configuration: item.configuration,
      rentAmount: item.rentAmount,
      depositAmount: item.depositAmount,
      furnishing: item.furnishing,
      lastConfirmedAt: item.lastConfirmedAt.toISOString(),
      distanceKm: haversineKm(referencePoint, { lat: item.property.lat, lng: item.property.lng }),
      property: { title: item.property.title, area: item.property.area },
      nextSlot: item.slots[0] ? { startTime: item.slots[0].startTime.toISOString() } : null,
      slotCount: item.slots.length,
      coverPhoto: parsePhotos(item.photos)[0] ?? null,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const hasActiveFilters = Boolean(sp.type && sp.type !== "ALL") || Boolean(sp.budget);

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-neutral-900 bg-neutral-950/95 px-4 pb-3 pt-4 backdrop-blur">
        <FilterToggle
          active={hasActiveFilters}
          greeting={
            <div>
              <p className="text-sm text-neutral-400">
                Hello {user.name.split(" ")[0]}! <span aria-hidden>👋</span>
              </p>
              <p className="flex items-center gap-1 text-lg font-bold text-white">
                <span aria-hidden>📍</span> {referenceLabel}
              </p>
              <UseLocationButton active={usingLiveLocation} />
            </div>
          }
        >
          <FilterBar destination={destination.name} type={sp.type ?? "ALL"} budget={sp.budget ?? ""} />
        </FilterToggle>
      </div>
      <SwipeDeck items={feed} destination={referenceLabel} />
    </div>
  );
}
