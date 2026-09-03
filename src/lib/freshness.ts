import type { InventoryItem } from "@prisma/client";

// Derived freshness state (PRD section 8.C — freshness TTL, auto-hide stale
// units). ACTIVE/STALE is computed at read time from lastConfirmedAt rather
// than stored, so a missed cron job can never leave a stale unit looking live.
export type DerivedStatus = "DRAFT" | "PENDING_VERIFICATION" | "ACTIVE" | "STALE" | "PAUSED" | "RENTED" | "REJECTED";

export function derivedStatus(item: Pick<InventoryItem, "status" | "lastConfirmedAt" | "freshnessTtlHours">): DerivedStatus {
  if (item.status !== "ACTIVE") {
    return item.status;
  }
  const ttlMs = item.freshnessTtlHours * 60 * 60 * 1000;
  const age = Date.now() - new Date(item.lastConfirmedAt).getTime();
  return age > ttlMs ? "STALE" : "ACTIVE";
}

export function isDiscoverable(item: Pick<InventoryItem, "status" | "lastConfirmedAt" | "freshnessTtlHours">): boolean {
  return derivedStatus(item) === "ACTIVE";
}

export function freshnessAgeLabel(lastConfirmedAt: Date): string {
  const ms = Date.now() - new Date(lastConfirmedAt).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return "Verified moments ago";
  if (hours < 24) return `Verified ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Verified ${days}d ago`;
}
