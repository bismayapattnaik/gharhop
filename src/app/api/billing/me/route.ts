import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ownerEntitlements, renterEntitlements } from "@/lib/billing";

// A single "what's my plan" read for both the seeker Plans page and the
// owner Plans page — entitlements, wallet, and recent orders/ledger so the
// UI never has to hardcode `isPremium = true` (business plan section 20).
export async function GET() {
  try {
    const user = await requireUser();
    const orders = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });

    if (user.role === "OWNER") {
      const entitlements = await ownerEntitlements(user.id);
      return NextResponse.json({ role: "OWNER", entitlements, orders });
    }

    const entitlements = await renterEntitlements(user.id);
    const entries = await prisma.creditLedgerEntry.findMany({
      where: { walletId: entitlements.wallet.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ role: "SEEKER", entitlements, orders, entries });
  } catch (e) {
    return handleApiError(e);
  }
}
