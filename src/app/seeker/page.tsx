import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isDiscoverable } from "@/lib/freshness";
import { haversineKm, MICRO_MARKETS } from "@/lib/geo";
import FilterBar from "@/components/seeker/FilterBar";
import SwipeDeck, { type FeedItem } from "@/components/seeker/SwipeDeck";
import type { InventoryType } from "@prisma/client";

export default async function SeekerFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string; type?: string; budget?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=SEEKER");
  if (user.role !== "SEEKER") redirect("/");

  const sp = await searchParams;
  const destination = MICRO_MARKETS.find((m) => m.name === sp.destination) ?? MICRO_MARKETS[0];
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
      distanceKm: haversineKm(destination, { lat: item.property.lat, lng: item.property.lng }),
      property: { title: item.property.title, area: item.property.area },
      nextSlot: item.slots[0] ? { startTime: item.slots[0].startTime.toISOString() } : null,
      slotCount: item.slots.length,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-4 pb-3 pt-4 backdrop-blur">
        <h1 className="text-xl font-bold text-slate-900">Discover</h1>
        <div className="mt-3">
          <FilterBar destination={destination.name} type={sp.type ?? "ALL"} budget={sp.budget ?? ""} />
        </div>
      </div>
      <SwipeDeck items={feed} destination={destination.name} />
    </div>
  );
}
