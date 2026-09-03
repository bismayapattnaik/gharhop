import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatInr } from "@/lib/format";
import { renterEntitlements, RUSH_CREDIT_PRICE_INR, SUBSCRIPTION_CATALOG } from "@/lib/billing";
import PurchaseButton from "@/components/billing/PurchaseButton";

export default async function SeekerPlansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=SEEKER");
  if (user.role !== "SEEKER") redirect("/");

  const entitlements = await renterEntitlements(user.id);
  const entries = await prisma.creditLedgerEntry.findMany({
    where: { walletId: entitlements.wallet.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const pass = SUBSCRIPTION_CATALOG.MOVE_NOW_PASS;
  const plus = SUBSCRIPTION_CATALOG.MOVE_NOW_PLUS;
  const concierge = SUBSCRIPTION_CATALOG.CONCIERGE;

  return (
    <div className="space-y-5 px-4 pb-4 pt-4">
      <div>
        <h1 className="text-xl font-bold text-white">Plans &amp; Rush Credits</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Slots 7+ days out are always free. These pay for <em>priority</em> — booking sooner, faster owner
          follow-up, and more active requests at once.
        </p>
      </div>

      <div className="rounded-2xl bg-neutral-900 p-4">
        <p className="text-xs text-neutral-500">Rush Credit balance</p>
        <p className="text-2xl font-bold text-white">{entitlements.wallet.balance}</p>
        {entitlements.wallet.reserved > 0 && (
          <p className="text-xs text-amber-400">{entitlements.wallet.reserved} held against a pending priority request</p>
        )}
        {entitlements.activeSubscription && (
          <p className="mt-2 text-sm text-emerald-400">
            {SUBSCRIPTION_CATALOG[entitlements.activeSubscription.plan].label} active until{" "}
            {entitlements.activeSubscription.endAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — priority booking is
            unlimited while it&apos;s on.
          </p>
        )}
        <p className="mt-2 text-xs text-neutral-500">
          Up to {entitlements.maxActiveVisits} active visit request{entitlements.maxActiveVisits === 1 ? "" : "s"} at once on your current plan.
        </p>
      </div>

      <PlanCard
        title="Rush Credit"
        price={`${formatInr(RUSH_CREDIT_PRICE_INR)} · 1 credit`}
        description="One priority request for a visit within the next 7 days. Only consumed if the visit actually happens — restored if the owner declines, doesn't respond, or cancels."
        cta={<PurchaseButton endpoint="/api/billing/rush-credit" label={`Buy 1 Rush Credit — ${formatInr(RUSH_CREDIT_PRICE_INR)}`} />}
      />

      <PlanCard
        title="MoveNow Pass"
        price={`${formatInr(pass.priceInr)} · ${pass.durationDays} days`}
        description={`${pass.bundledCredits} Rush Credits, unlimited priority booking for the pass duration, up to ${pass.maxActiveVisits} active requests, and priority support.`}
        cta={<PurchaseButton endpoint="/api/billing/subscribe" body={{ plan: "MOVE_NOW_PASS" }} label={`Get MoveNow Pass — ${formatInr(pass.priceInr)}`} />}
      />

      <PlanCard
        title="MoveNow Plus"
        price={`${formatInr(plus.priceInr)} · ${plus.durationDays} days`}
        description={`${plus.bundledCredits} Rush Credits, unlimited priority booking, up to ${plus.maxActiveVisits} active requests, and price/new-listing alerts.`}
        cta={<PurchaseButton endpoint="/api/billing/subscribe" body={{ plan: "MOVE_NOW_PLUS" }} label={`Get MoveNow Plus — ${formatInr(plus.priceInr)}`} />}
      />

      <PlanCard
        title="Concierge"
        price={`${formatInr(concierge.priceInr)} · ${concierge.durationDays} days`}
        description="Everything in MoveNow Plus, plus a human coordinator for shortlisting, owner follow-up, and move-in support. A coordinator begins working your request within 30 minutes during operating hours — this prototype doesn't route to a live team yet."
        cta={<PurchaseButton endpoint="/api/billing/subscribe" body={{ plan: "CONCIERGE" }} label={`Get Concierge — ${formatInr(concierge.priceInr)}`} />}
      />

      {entries.length > 0 && (
        <div className="rounded-2xl bg-neutral-900 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Recent credit activity</p>
          <div className="space-y-1.5">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-xs text-neutral-400">
                <span>{entry.reason ?? entry.type}</span>
                <span className="text-neutral-300">
                  {entry.type === "RESTORED" || entry.type === "GRANTED" || entry.type === "PURCHASED" ? "+" : "-"}
                  {entry.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({ title, price, description, cta }: { title: string; price: string; description: string; cta: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold text-white">{title}</p>
        <p className="text-sm text-neutral-400">{price}</p>
      </div>
      <p className="mt-1.5 text-sm text-neutral-400">{description}</p>
      <div className="mt-3">{cta}</div>
    </div>
  );
}
