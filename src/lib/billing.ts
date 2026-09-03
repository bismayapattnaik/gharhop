import { prisma } from "@/lib/prisma";
import { ConflictError, ForbiddenError, NotFoundError, PaymentRequiredError } from "@/lib/errors";
import type { InventoryType, InventoryItem, Prisma, SubscriptionPlan } from "@prisma/client";

// GharHop monetization — Phase 1 slice from the business plan (section 17
// "Marketplace proof, months 0-6"): rolling visit-access model, Rush
// Credit, MoveNow passes, owner FastFill/Success plans, owner-sponsored
// visits. Payments are mocked the same way auth is mocked (lib/auth.ts) —
// no real gateway, but every wallet change is still a ledger entry, not a
// bare counter (section 20's own rule), and plans/prices live in one
// catalog rather than a scattered `isPremium = true`.

type Db = typeof prisma | Prisma.TransactionClient;

// --- Rolling visit-access model (business plan section 2) ---
export const FREE_WINDOW_DAYS = 7;
export const LAST_MINUTE_RELEASE_HOURS = 24;
export const RENTER_FREE_MAX_ACTIVE_VISITS = 2;
export const OWNER_FREE_MAX_ACTIVE_LISTINGS = 1;
export const WELCOME_RUSH_CREDITS = 1;
export const RUSH_CREDIT_PRICE_INR = 149;
export const SPONSORED_VISIT_FEE_INR = 99;

export const MOVE_IN_FEE_INR: Record<InventoryType, number> = {
  PG_BED: 499,
  ROOM: 999,
  FLAT: 1999,
};

export const SUBSCRIPTION_CATALOG: Record<
  SubscriptionPlan,
  { label: string; priceInr: number; durationDays: number; bundledCredits?: number; maxActiveVisits?: number; maxActiveListings?: number }
> = {
  MOVE_NOW_PASS: { label: "MoveNow Pass", priceInr: 499, durationDays: 14, bundledCredits: 4, maxActiveVisits: 3 },
  MOVE_NOW_PLUS: { label: "MoveNow Plus", priceInr: 899, durationDays: 30, bundledCredits: 8, maxActiveVisits: 5 },
  CONCIERGE: { label: "Concierge", priceInr: 2499, durationDays: 30, bundledCredits: 8, maxActiveVisits: 5 },
  OWNER_FASTFILL: { label: "Owner FastFill", priceInr: 999, durationDays: 30, maxActiveListings: 2 },
};

const RENTER_PLANS: SubscriptionPlan[] = ["MOVE_NOW_PASS", "MOVE_NOW_PLUS", "CONCIERGE"];

async function getOrCreateWallet(db: Db, userId: string) {
  const existing = await db.creditWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.creditWallet.create({ data: { userId } });
}

/** New seekers get one free Rush Credit (business plan section 3). Idempotent —
 * safe to call on every login, since it only grants once per user. */
export async function grantWelcomeCreditIfNew(userId: string) {
  return prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(tx, userId);
    const already = await tx.creditLedgerEntry.findFirst({ where: { walletId: wallet.id, reason: "welcome" } });
    if (already) return wallet;
    await tx.creditLedgerEntry.create({ data: { walletId: wallet.id, type: "GRANTED", amount: WELCOME_RUSH_CREDITS, reason: "welcome" } });
    return tx.creditWallet.update({ where: { id: wallet.id }, data: { balance: { increment: WELCOME_RUSH_CREDITS } } });
  });
}

export async function getActiveSubscription(db: Db, userId: string, plans: SubscriptionPlan[]) {
  return db.subscription.findFirst({
    where: { userId, status: "ACTIVE", endAt: { gt: new Date() }, plan: { in: plans } },
    orderBy: { endAt: "desc" },
  });
}

export async function renterEntitlements(userId: string) {
  const [wallet, activeSubscription] = await Promise.all([
    getOrCreateWallet(prisma, userId),
    getActiveSubscription(prisma, userId, RENTER_PLANS),
  ]);
  const plan = activeSubscription ? SUBSCRIPTION_CATALOG[activeSubscription.plan] : null;
  return {
    wallet,
    activeSubscription,
    hasPriorityPass: Boolean(activeSubscription),
    maxActiveVisits: plan?.maxActiveVisits ?? RENTER_FREE_MAX_ACTIVE_VISITS,
    freeWindowDays: FREE_WINDOW_DAYS,
  };
}

export async function ownerEntitlements(userId: string) {
  const activeSubscription = await getActiveSubscription(prisma, userId, ["OWNER_FASTFILL"]);
  const config = SUBSCRIPTION_CATALOG.OWNER_FASTFILL;
  return {
    activeSubscription,
    hasFastFill: Boolean(activeSubscription),
    maxActiveListings: activeSubscription ? config.maxActiveListings! : OWNER_FREE_MAX_ACTIVE_LISTINGS,
    moveInFeeApplies: !activeSubscription,
  };
}

async function reserveRushCreditInTx(tx: Prisma.TransactionClient, userId: string, holdId: string) {
  const wallet = await getOrCreateWallet(tx, userId);
  if (wallet.balance < 1) {
    throw new PaymentRequiredError(
      "This time is within the priority window — buy a Rush Credit or a MoveNow pass to book it, or pick a slot 7+ days out for free."
    );
  }
  await tx.creditWallet.update({ where: { id: wallet.id }, data: { balance: { decrement: 1 }, reserved: { increment: 1 } } });
  await tx.creditLedgerEntry.create({ data: { walletId: wallet.id, type: "RESERVED", amount: 1, holdId, reason: "Priority visit request" } });
}

async function settleReservedCredit(
  db: Db,
  userId: string,
  direction: "CONSUMED" | "RESTORED",
  opts: { holdId?: string; visitId?: string; reason: string }
) {
  const wallet = await db.creditWallet.findUnique({ where: { userId } });
  if (!wallet || wallet.reserved < 1) return; // nothing reserved — no-op, idempotent
  await db.creditWallet.update({
    where: { id: wallet.id },
    data: direction === "RESTORED" ? { balance: { increment: 1 }, reserved: { decrement: 1 } } : { reserved: { decrement: 1 } },
  });
  await db.creditLedgerEntry.create({ data: { walletId: wallet.id, type: direction, amount: 1, ...opts } });
}

export const consumeReservedCredit = (db: Db, userId: string, opts: { holdId?: string; visitId?: string; reason: string }) =>
  settleReservedCredit(db, userId, "CONSUMED", opts);

export const restoreReservedCredit = (db: Db, userId: string, opts: { holdId?: string; visitId?: string; reason: string }) =>
  settleReservedCredit(db, userId, "RESTORED", opts);

/** Decides how a seeker gets priority access to a within-the-week slot, and
 * reserves whatever that access costs (nothing, a Rush Credit, or the
 * owner's sponsorship) — called from inside createHold's transaction so the
 * whole booking rolls back together if a credit can't be reserved. */
export async function applyPriorityGate(
  tx: Prisma.TransactionClient,
  params: { seekerId: string; slotStartTime: Date; item: InventoryItem; holdId: string }
) {
  const hoursUntil = (params.slotStartTime.getTime() - Date.now()) / (60 * 60 * 1000);
  const daysUntil = hoursUntil / 24;

  if (daysUntil >= FREE_WINDOW_DAYS) return { creditReserved: false, sponsoredByOwner: false };
  if (hoursUntil <= LAST_MINUTE_RELEASE_HOURS) return { creditReserved: false, sponsoredByOwner: false };

  const activeSubscription = await getActiveSubscription(tx, params.seekerId, RENTER_PLANS);
  if (activeSubscription) return { creditReserved: false, sponsoredByOwner: false };

  if (params.item.sponsoredVisitEnabled) return { creditReserved: false, sponsoredByOwner: true };

  await reserveRushCreditInTx(tx, params.seekerId, params.holdId);
  return { creditReserved: true, sponsoredByOwner: false };
}

export async function purchaseRushCredits(userId: string, qty = 1) {
  return prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(tx, userId);
    const amountInr = RUSH_CREDIT_PRICE_INR * qty;
    const order = await tx.order.create({ data: { userId, type: "RUSH_CREDIT_PACK", amountInr, metadata: JSON.stringify({ credits: qty }) } });
    await tx.creditWallet.update({ where: { id: wallet.id }, data: { balance: { increment: qty } } });
    await tx.creditLedgerEntry.create({ data: { walletId: wallet.id, type: "PURCHASED", amount: qty, reason: "Rush Credit purchase" } });
    return order;
  });
}

export async function purchaseSubscription(userId: string, plan: SubscriptionPlan) {
  const config = SUBSCRIPTION_CATALOG[plan];
  return prisma.$transaction(async (tx) => {
    const existing = await getActiveSubscription(tx, userId, [plan]);
    if (existing) throw new ConflictError(`You already have an active ${config.label}.`);

    const endAt = new Date(Date.now() + config.durationDays * 24 * 60 * 60 * 1000);
    const subscription = await tx.subscription.create({ data: { userId, plan, endAt, priceInr: config.priceInr } });
    const order = await tx.order.create({ data: { userId, type: plan, amountInr: config.priceInr, subscriptionId: subscription.id } });

    if (config.bundledCredits) {
      const wallet = await getOrCreateWallet(tx, userId);
      await tx.creditWallet.update({ where: { id: wallet.id }, data: { balance: { increment: config.bundledCredits } } });
      await tx.creditLedgerEntry.create({
        data: { walletId: wallet.id, type: "GRANTED", amount: config.bundledCredits, reason: `${config.label} bundled credits` },
      });
    }
    return { subscription, order };
  });
}

/** Owner-sponsored visits (business plan section 9) — charged only once the
 * owner actually confirms the visit, never on decline/cancel/expiry. */
export async function chargeSponsoredVisit(ownerId: string, visitId: string) {
  await prisma.order.create({ data: { userId: ownerId, type: "OWNER_SPONSORED_VISIT", amountInr: SPONSORED_VISIT_FEE_INR, visitId } });
}

export async function refundSponsoredVisitIfCharged(db: Db, visitId: string) {
  const order = await db.order.findFirst({ where: { visitId, type: "OWNER_SPONSORED_VISIT", status: "SUCCEEDED" } });
  if (!order) return;
  await db.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
}

/** Verified move-in (business plan section 4) — charges the owner's
 * per-move-in fee unless they hold an active FastFill subscription. */
export async function verifyMoveIn(itemId: string, actorId: string, isAdmin: boolean) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId }, include: { property: true } });
  if (!item) throw new NotFoundError("Listing not found");
  if (!isAdmin && item.property.ownerId !== actorId) throw new ForbiddenError("Not your listing");
  if (item.moveInVerifiedAt) throw new ConflictError("This move-in was already verified.");

  const owner = await ownerEntitlements(item.property.ownerId);
  const updated = await prisma.inventoryItem.update({ where: { id: itemId }, data: { moveInVerifiedAt: new Date() } });

  if (owner.moveInFeeApplies) {
    await prisma.order.create({
      data: {
        userId: item.property.ownerId,
        type: "OWNER_VERIFIED_MOVE_IN_FEE",
        amountInr: MOVE_IN_FEE_INR[item.type],
        metadata: JSON.stringify({ itemId }),
      },
    });
  }
  return updated;
}
