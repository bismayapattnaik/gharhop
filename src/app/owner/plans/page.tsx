import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatInr } from "@/lib/format";
import { MOVE_IN_FEE_INR, OWNER_FREE_MAX_ACTIVE_LISTINGS, ownerEntitlements, SPONSORED_VISIT_FEE_INR, SUBSCRIPTION_CATALOG } from "@/lib/billing";
import PurchaseButton from "@/components/billing/PurchaseButton";

const LIGHT_BUTTON = "w-full rounded-full bg-teal-700 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50";

export default async function OwnerPlansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=OWNER");
  if (user.role !== "OWNER") redirect("/");

  const entitlements = await ownerEntitlements(user.id);
  const orders = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 });
  const fastfill = SUBSCRIPTION_CATALOG.OWNER_FASTFILL;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Owner plans</h1>
        <p className="mt-1 text-sm text-slate-500">Fill vacancies faster — pay upfront for FastFill, or list free and pay only on a verified move-in.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-slate-800">Your plan</p>
        {entitlements.hasFastFill ? (
          <p className="mt-1 text-sm text-emerald-700">
            FastFill active until {entitlements.activeSubscription!.endAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — up to{" "}
            {entitlements.maxActiveListings} active listings, no move-in fee.
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            List Free — up to {OWNER_FREE_MAX_ACTIVE_LISTINGS} active listing, no upfront cost. A move-in fee applies once a tenancy is verified
            (see below).
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="font-semibold text-slate-900">List Free</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">₹0</p>
          <ul className="mt-3 space-y-1 text-sm text-slate-500">
            <li>{OWNER_FREE_MAX_ACTIVE_LISTINGS} active listing</li>
            <li>Standard visibility</li>
            <li>Visit calendar &amp; request inbox</li>
            <li>Pay only on a verified move-in</li>
          </ul>
        </div>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
          <p className="font-semibold text-slate-900">FastFill</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatInr(fastfill.priceInr)} <span className="text-sm font-normal text-slate-500">/ {fastfill.durationDays} days</span>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            <li>Up to {fastfill.maxActiveListings} active listings</li>
            <li>Higher placement in seeker search</li>
            <li>No move-in fee while active</li>
          </ul>
          <div className="mt-4">
            {entitlements.hasFastFill ? (
              <p className="text-center text-sm text-emerald-700">Already active</p>
            ) : (
              <PurchaseButton
                endpoint="/api/billing/subscribe"
                body={{ plan: "OWNER_FASTFILL" }}
                label={`Get FastFill — ${formatInr(fastfill.priceInr)}`}
                className={LIGHT_BUTTON}
              />
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-semibold text-slate-900">Verified move-in fee (List Free only)</p>
        <p className="mt-1 text-sm text-slate-500">Charged once, only after a move-in is verified — never stacked with a listing or lead fee.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <Fee label="PG bed" amount={MOVE_IN_FEE_INR.PG_BED} />
          <Fee label="Private room" amount={MOVE_IN_FEE_INR.ROOM} />
          <Fee label="Flat / house" amount={MOVE_IN_FEE_INR.FLAT} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-semibold text-slate-900">Owner-sponsored visits</p>
        <p className="mt-1 text-sm text-slate-500">
          Turn this on per-listing (from the listing&apos;s Manage page) to let seekers book within-the-week slots for free. GharHop only
          charges you {formatInr(SPONSORED_VISIT_FEE_INR)} once you actually confirm the resulting visit — never for a decline, cancellation,
          or expired request.
        </p>
      </div>

      {orders.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-2 font-semibold text-slate-900">Recent charges</p>
          <div className="space-y-1.5">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {order.type.replaceAll("_", " ")} · {order.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
                <span className={order.status === "REFUNDED" ? "text-slate-400 line-through" : "font-medium text-slate-800"}>
                  {formatInr(order.amountInr)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Fee({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-800">{formatInr(amount)}</p>
    </div>
  );
}
