import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { purchaseRushCredits } from "@/lib/billing";

// Rush Credit — ₹149 for one priority visit request (business plan
// section 3). Mock checkout: no real gateway, but recorded as a real
// Order + credit-ledger entry, not a bare balance bump.
export async function POST() {
  try {
    const seeker = await requireUser("SEEKER");
    const order = await purchaseRushCredits(seeker.id, 1);
    return NextResponse.json({ order });
  } catch (e) {
    return handleApiError(e);
  }
}
