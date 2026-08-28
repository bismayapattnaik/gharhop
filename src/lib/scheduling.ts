import { prisma } from "@/lib/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { VisitOutcome } from "@prisma/client";

// The load-bearing mechanic from PRD section 7.E ("Slot matching algorithm")
// and section 9 (visit lifecycle): a slot can only ever be held by one
// seeker at a time, holds expire automatically, and every transition is
// atomic so two seekers racing for the last slot can't both win it.

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minute hold, per GH-505

/** Lazily expire a hold that has passed its TTL. Called before any check
 * that depends on slot availability, since there is no background worker
 * in the prototype (PRD's "periodic reconciliation" is done on-read here). */
async function releaseIfExpired(slotId: string) {
  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: slotId },
    include: { holds: { where: { status: "ACTIVE" } } },
  });
  if (!slot || slot.status !== "HELD") return;

  const activeHold = slot.holds[0];
  if (!activeHold) {
    // No active hold but slot says HELD — self-heal back to OPEN.
    await prisma.availabilitySlot.update({ where: { id: slotId }, data: { status: "OPEN" } });
    return;
  }
  if (activeHold.expiresAt.getTime() < Date.now()) {
    await prisma.$transaction([
      prisma.slotHold.update({ where: { id: activeHold.id }, data: { status: "EXPIRED" } }),
      prisma.availabilitySlot.update({ where: { id: slotId }, data: { status: "OPEN" } }),
    ]);
  }
}

export async function createHold(params: { slotId: string; seekerId: string; idempotencyKey: string }) {
  const existing = await prisma.slotHold.findUnique({ where: { idempotencyKey: params.idempotencyKey } });
  if (existing) return existing;

  await releaseIfExpired(params.slotId);

  return prisma.$transaction(async (tx) => {
    const slot = await tx.availabilitySlot.findUnique({ where: { id: params.slotId } });
    if (!slot) throw new NotFoundError("Slot not found");
    if (slot.status !== "OPEN" || slot.bookedCount >= slot.capacity) {
      throw new ConflictError("This slot is no longer available — pick another time.");
    }

    const hold = await tx.slotHold.create({
      data: {
        slotId: params.slotId,
        seekerId: params.seekerId,
        idempotencyKey: params.idempotencyKey,
        expiresAt: new Date(Date.now() + HOLD_DURATION_MS),
        status: "ACTIVE",
      },
    });
    await tx.availabilitySlot.update({ where: { id: params.slotId }, data: { status: "HELD" } });
    return hold;
  });
}

export async function confirmVisitFromHold(params: { holdId: string; seekerId: string; idempotencyKey: string }) {
  const existingVisit = await prisma.visit.findFirst({
    where: { seekerId: params.seekerId, slot: { holds: { some: { id: params.holdId } } } },
  });

  return prisma.$transaction(async (tx) => {
    const hold = await tx.slotHold.findUnique({ where: { id: params.holdId } });
    if (!hold || hold.seekerId !== params.seekerId) throw new NotFoundError("Hold not found");
    if (hold.status === "CONSUMED" && existingVisit) return existingVisit; // idempotent replay
    if (hold.status !== "ACTIVE") throw new ConflictError("This hold has expired — request a new visit slot.");
    if (hold.expiresAt.getTime() < Date.now()) {
      await tx.slotHold.update({ where: { id: hold.id }, data: { status: "EXPIRED" } });
      await tx.availabilitySlot.update({ where: { id: hold.slotId }, data: { status: "OPEN" } });
      throw new ConflictError("This hold has expired — request a new visit slot.");
    }

    const slot = await tx.availabilitySlot.findUnique({ where: { id: hold.slotId } });
    if (!slot) throw new NotFoundError("Slot not found");
    const item = await tx.inventoryItem.findUnique({ where: { id: slot.inventoryItemId } });
    if (!item) throw new NotFoundError("Listing not found");

    const instant = item.bookingMode === "INSTANT";

    const visit = await tx.visit.create({
      data: {
        slotId: slot.id,
        inventoryItemId: item.id,
        seekerId: params.seekerId,
        status: instant ? "CONFIRMED" : "REQUESTED",
        bookingMode: item.bookingMode,
        scheduledStart: slot.startTime,
        scheduledEnd: slot.endTime,
      },
    });

    await tx.slotHold.update({ where: { id: hold.id }, data: { status: "CONSUMED" } });
    await tx.availabilitySlot.update({
      where: { id: slot.id },
      data: instant ? { status: "BOOKED", bookedCount: { increment: 1 } } : { status: "HELD" },
    });

    return visit;
  });
}

export async function ownerRespond(params: { visitId: string; ownerId: string; action: "accept" | "reject" }) {
  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: params.visitId }, include: { slot: true, inventoryItem: { include: { property: true } } } });
    if (!visit) throw new NotFoundError("Visit not found");
    if (visit.inventoryItem.property.ownerId !== params.ownerId) throw new ForbiddenError("Not your listing");
    if (visit.status !== "REQUESTED") throw new ConflictError("This request was already resolved.");

    if (params.action === "accept") {
      await tx.visit.update({ where: { id: visit.id }, data: { status: "CONFIRMED" } });
      await tx.availabilitySlot.update({ where: { id: visit.slotId }, data: { status: "BOOKED", bookedCount: { increment: 1 } } });
    } else {
      await tx.visit.update({ where: { id: visit.id }, data: { status: "CANCELLED_BY_HOST", cancelReason: "Owner declined the request" } });
      await tx.availabilitySlot.update({ where: { id: visit.slotId }, data: { status: "OPEN" } });
    }
    return tx.visit.findUnique({ where: { id: visit.id } });
  });
}

export async function cancelVisit(params: { visitId: string; actorRole: "seeker" | "host"; reason?: string }) {
  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: params.visitId } });
    if (!visit) throw new NotFoundError("Visit not found");
    if (["COMPLETED", "CANCELLED_BY_SEEKER", "CANCELLED_BY_HOST", "EXPIRED"].includes(visit.status)) {
      throw new ConflictError("This visit can no longer be cancelled.");
    }
    const wasBooked = visit.status === "CONFIRMED" || visit.status === "CHECKED_IN";
    await tx.visit.update({
      where: { id: visit.id },
      data: {
        status: params.actorRole === "seeker" ? "CANCELLED_BY_SEEKER" : "CANCELLED_BY_HOST",
        cancelReason: params.reason,
      },
    });
    await tx.availabilitySlot.update({
      where: { id: visit.slotId },
      data: wasBooked ? { status: "OPEN", bookedCount: { decrement: 1 } } : { status: "OPEN" },
    });

    if (params.actorRole === "seeker") {
      await tx.user.update({ where: { id: visit.seekerId }, data: { reliabilityScore: { decrement: 5 } } });
    }
    return tx.visit.findUnique({ where: { id: visit.id } });
  });
}

export async function checkIn(visitId: string, seekerId: string) {
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit || visit.seekerId !== seekerId) throw new NotFoundError("Visit not found");
  if (visit.status !== "CONFIRMED") throw new ConflictError("Visit is not confirmed.");
  return prisma.visit.update({ where: { id: visitId }, data: { status: "CHECKED_IN", checkedInAt: new Date() } });
}

export async function completeVisit(visitId: string) {
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) throw new NotFoundError("Visit not found");
  if (visit.status !== "CHECKED_IN" && visit.status !== "CONFIRMED") {
    throw new ConflictError("Visit must be checked in before it can be completed.");
  }
  return prisma.visit.update({ where: { id: visitId }, data: { status: "COMPLETED", completedAt: new Date() } });
}

export async function markNoShow(visitId: string, who: "seeker" | "host") {
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) throw new NotFoundError("Visit not found");
  return prisma.$transaction(async (tx) => {
    await tx.visit.update({
      where: { id: visitId },
      data: { status: who === "seeker" ? "NO_SHOW_SEEKER" : "NO_SHOW_HOST" },
    });
    await tx.availabilitySlot.update({ where: { id: visit.slotId }, data: { status: "OPEN", bookedCount: { decrement: 1 } } });
    if (who === "seeker") {
      await tx.user.update({ where: { id: visit.seekerId }, data: { reliabilityScore: { decrement: 15 } } });
    }
  });
}

export async function submitOutcome(visitId: string, outcome: VisitOutcome, note?: string) {
  return prisma.visit.update({ where: { id: visitId }, data: { outcome, outcomeNote: note } });
}
