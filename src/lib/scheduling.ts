import { prisma } from "@/lib/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { notify } from "@/lib/notifications";
import { formatDateTime } from "@/lib/format";
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

  const result = await prisma.$transaction(async (tx) => {
    const hold = await tx.slotHold.findUnique({ where: { id: params.holdId } });
    if (!hold || hold.seekerId !== params.seekerId) throw new NotFoundError("Hold not found");
    if (hold.status === "CONSUMED" && existingVisit) return { visit: existingVisit, replay: true as const };
    if (hold.status !== "ACTIVE") throw new ConflictError("This hold has expired — request a new visit slot.");
    if (hold.expiresAt.getTime() < Date.now()) {
      await tx.slotHold.update({ where: { id: hold.id }, data: { status: "EXPIRED" } });
      await tx.availabilitySlot.update({ where: { id: hold.slotId }, data: { status: "OPEN" } });
      throw new ConflictError("This hold has expired — request a new visit slot.");
    }

    const slot = await tx.availabilitySlot.findUnique({ where: { id: hold.slotId } });
    if (!slot) throw new NotFoundError("Slot not found");
    const item = await tx.inventoryItem.findUnique({ where: { id: slot.inventoryItemId }, include: { property: true } });
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

    return { visit, replay: false as const, instant, ownerId: item.property.ownerId, propertyTitle: item.property.title };
  });

  if (!result.replay) {
    const when = formatDateTime(result.visit.scheduledStart);
    if (result.instant) {
      await notify(result.visit.seekerId, "VISIT_CONFIRMED", `Your visit to ${result.propertyTitle} on ${when} is confirmed.`, "/seeker/visits");
      await notify(result.ownerId!, "VISIT_CONFIRMED", `New confirmed visit for ${result.propertyTitle} on ${when}.`, "/owner/requests");
    } else {
      await notify(result.ownerId!, "VISIT_REQUESTED", `New visit request for ${result.propertyTitle} on ${when}.`, "/owner/requests");
    }
  }

  return result.visit;
}

export async function ownerRespond(params: { visitId: string; actorId: string; action: "accept" | "reject"; adminOverride?: boolean }) {
  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: params.visitId }, include: { slot: true, inventoryItem: { include: { property: true } } } });
    if (!visit) throw new NotFoundError("Visit not found");
    if (!params.adminOverride && visit.inventoryItem.property.ownerId !== params.actorId) throw new ForbiddenError("Not your listing");
    if (visit.status !== "REQUESTED") throw new ConflictError("This request was already resolved.");

    if (params.action === "accept") {
      await tx.visit.update({ where: { id: visit.id }, data: { status: "CONFIRMED", proposedByOwner: false } });
      await tx.availabilitySlot.update({ where: { id: visit.slotId }, data: { status: "BOOKED", bookedCount: { increment: 1 } } });
    } else {
      await tx.visit.update({ where: { id: visit.id }, data: { status: "CANCELLED_BY_HOST", cancelReason: "Owner declined the request" } });
      await tx.availabilitySlot.update({ where: { id: visit.slotId }, data: { status: "OPEN" } });
    }
    return { visit: await tx.visit.findUnique({ where: { id: visit.id } }), seekerId: visit.seekerId, propertyTitle: visit.inventoryItem.property.title };
  });

  const when = formatDateTime(result.visit!.scheduledStart);
  if (params.action === "accept") {
    await notify(result.seekerId, "VISIT_CONFIRMED", `${result.propertyTitle} confirmed your visit for ${when}.`, "/seeker/visits");
  } else {
    await notify(result.seekerId, "VISIT_DECLINED", `${result.propertyTitle} declined your visit request for ${when}.`, "/seeker/visits");
  }
  return result.visit;
}

export async function cancelVisit(params: { visitId: string; actorRole: "seeker" | "host"; reason?: string }) {
  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: params.visitId }, include: { inventoryItem: { include: { property: true } } } });
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
    return {
      visit: await tx.visit.findUnique({ where: { id: visit.id } }),
      seekerId: visit.seekerId,
      ownerId: visit.inventoryItem.property.ownerId,
      propertyTitle: visit.inventoryItem.property.title,
    };
  });

  const when = formatDateTime(result.visit!.scheduledStart);
  const notifyTarget = params.actorRole === "seeker" ? result.ownerId : result.seekerId;
  const cancelledBy = params.actorRole === "seeker" ? "The seeker" : "The owner";
  await notify(notifyTarget, "VISIT_CANCELLED", `${cancelledBy} cancelled the visit for ${result.propertyTitle} on ${when}.`, params.actorRole === "seeker" ? "/owner/requests" : "/seeker/visits");

  return result.visit;
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

// --- Counter-proposal / reschedule (PRD "three booking modes": instant,
// approval, and owner-proposed-alternate-time) ---

/** Owner can't make the requested/confirmed time — proposes a different
 * open slot on the same listing. The visit stays the same row (so history/
 * audit trail is preserved) but now points at the new slot and flips back
 * to REQUESTED, waiting on the *seeker* this time. */
export async function proposeReschedule(params: { visitId: string; ownerId: string; newSlotId: string }) {
  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({
      where: { id: params.visitId },
      include: { inventoryItem: { include: { property: true } } },
    });
    if (!visit) throw new NotFoundError("Visit not found");
    if (visit.inventoryItem.property.ownerId !== params.ownerId) throw new ForbiddenError("Not your listing");
    if (!["REQUESTED", "CONFIRMED"].includes(visit.status)) {
      throw new ConflictError("Only pending or confirmed visits can be rescheduled.");
    }

    const newSlot = await tx.availabilitySlot.findUnique({ where: { id: params.newSlotId } });
    if (!newSlot || newSlot.inventoryItemId !== visit.inventoryItemId) throw new NotFoundError("Slot not found");
    if (newSlot.status !== "OPEN" || newSlot.bookedCount >= newSlot.capacity) {
      throw new ConflictError("That slot is no longer available.");
    }

    const wasBooked = visit.status === "CONFIRMED";
    await tx.availabilitySlot.update({
      where: { id: visit.slotId },
      data: wasBooked ? { status: "OPEN", bookedCount: { decrement: 1 } } : { status: "OPEN" },
    });
    await tx.availabilitySlot.update({ where: { id: newSlot.id }, data: { status: "HELD" } });

    const updated = await tx.visit.update({
      where: { id: visit.id },
      data: {
        slotId: newSlot.id,
        scheduledStart: newSlot.startTime,
        scheduledEnd: newSlot.endTime,
        status: "REQUESTED",
        proposedByOwner: true,
      },
    });
    return { visit: updated, seekerId: visit.seekerId, propertyTitle: visit.inventoryItem.property.title };
  });

  const when = formatDateTime(result.visit.scheduledStart);
  await notify(result.seekerId, "VISIT_RESCHEDULE_PROPOSED", `${result.propertyTitle} proposed a new time: ${when}. Please accept or decline.`, "/seeker/visits");
  return result.visit;
}

export async function acceptReschedule(params: { visitId: string; seekerId: string }) {
  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: params.visitId }, include: { inventoryItem: { include: { property: true } } } });
    if (!visit) throw new NotFoundError("Visit not found");
    if (visit.seekerId !== params.seekerId) throw new ForbiddenError("Not your visit");
    if (visit.status !== "REQUESTED" || !visit.proposedByOwner) {
      throw new ConflictError("There's no pending reschedule proposal on this visit.");
    }
    await tx.visit.update({ where: { id: visit.id }, data: { status: "CONFIRMED", proposedByOwner: false } });
    await tx.availabilitySlot.update({ where: { id: visit.slotId }, data: { status: "BOOKED", bookedCount: { increment: 1 } } });
    return { visit: await tx.visit.findUnique({ where: { id: visit.id } }), ownerId: visit.inventoryItem.property.ownerId, propertyTitle: visit.inventoryItem.property.title };
  });

  const when = formatDateTime(result.visit!.scheduledStart);
  await notify(result.ownerId, "VISIT_RESCHEDULE_ACCEPTED", `The seeker accepted your proposed time for ${result.propertyTitle}: ${when}.`, "/owner/requests");
  return result.visit;
}

// --- Admin overrides (minimum admin dashboard: pause/mark-rented on
// listings and confirm/cancel on visits, per the launch plan) ---

export async function adminConfirmVisit(visitId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: visitId }, include: { inventoryItem: { include: { property: true } } } });
    if (!visit) throw new NotFoundError("Visit not found");
    if (visit.status !== "REQUESTED") throw new ConflictError("Only pending requests can be force-confirmed.");
    await tx.visit.update({ where: { id: visit.id }, data: { status: "CONFIRMED", proposedByOwner: false } });
    await tx.availabilitySlot.update({ where: { id: visit.slotId }, data: { status: "BOOKED", bookedCount: { increment: 1 } } });
    return {
      visit: await tx.visit.findUnique({ where: { id: visit.id } }),
      seekerId: visit.seekerId,
      ownerId: visit.inventoryItem.property.ownerId,
      propertyTitle: visit.inventoryItem.property.title,
    };
  });
  const when = formatDateTime(result.visit!.scheduledStart);
  await notify(result.seekerId, "VISIT_CONFIRMED", `${result.propertyTitle} visit for ${when} was confirmed by GharHop support.`, "/seeker/visits");
  await notify(result.ownerId, "VISIT_CONFIRMED", `GharHop support confirmed a visit for ${result.propertyTitle} on ${when}.`, "/owner/requests");
  return result.visit;
}
