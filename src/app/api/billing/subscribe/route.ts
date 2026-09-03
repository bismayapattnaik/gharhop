import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError } from "@/lib/errors";
import { purchaseSubscription } from "@/lib/billing";
import type { SubscriptionPlan } from "@prisma/client";

const SEEKER_PLANS: SubscriptionPlan[] = ["MOVE_NOW_PASS", "MOVE_NOW_PLUS", "CONCIERGE"];

// MoveNow Pass/Plus/Concierge (seekers) or FastFill (owners) — mock
// checkout, same pattern as /api/billing/rush-credit.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const plan = body.plan as SubscriptionPlan;

    if (user.role === "SEEKER" && !SEEKER_PLANS.includes(plan)) throw new ForbiddenError("Not a renter plan.");
    if (user.role === "OWNER" && plan !== "OWNER_FASTFILL") throw new ForbiddenError("Not an owner plan.");
    if (user.role !== "SEEKER" && user.role !== "OWNER") throw new ForbiddenError("Sign in as a seeker or owner.");

    const result = await purchaseSubscription(user.id, plan);
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
