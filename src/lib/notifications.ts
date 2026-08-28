import { prisma } from "@/lib/prisma";

// In-app notification center (PRD GH-707) — the prototype's answer to the
// launch-plan's "users miss visits because no notification was sent" P0.
// This covers event-triggered notices (booking requested/confirmed/
// cancelled/rescheduled). It deliberately does NOT cover time-based
// reminders ("visit in 1 hour") — that needs a background scheduler/cron,
// which this prototype has none of. See README for that gap.
export type NotificationType =
  | "VISIT_REQUESTED"
  | "VISIT_CONFIRMED"
  | "VISIT_DECLINED"
  | "VISIT_CANCELLED"
  | "VISIT_RESCHEDULE_PROPOSED"
  | "VISIT_RESCHEDULE_ACCEPTED"
  | "VISIT_RESCHEDULE_DECLINED";

export async function notify(userId: string, type: NotificationType, message: string, link?: string) {
  await prisma.notification.create({ data: { userId, type, message, link } });
}
