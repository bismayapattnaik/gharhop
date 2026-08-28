import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const HOME_BY_ROLE: Record<string, string> = {
  SEEKER: "/seeker",
  OWNER: "/owner",
  ADMIN: "/admin",
};

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(HOME_BY_ROLE[user.role] ?? "/login");

  return (
    <div className="-mx-4 -my-6 flex flex-col items-center gap-10 bg-neutral-950 px-4 py-20 text-center">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-400">GharHop prototype</p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Swipe nearby.{" "}
          <span className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 bg-clip-text text-transparent">
            Match a visit.
          </span>{" "}
          Move in.
        </h1>
        <p className="mx-auto max-w-xl text-neutral-400">
          A visit-liquidity marketplace, not another listings feed. Every unit shown is freshness-verified,
          every match is a real confirmed slot, and every visit is tracked end to end.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login?role=SEEKER"
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 px-6 py-3 font-medium text-white shadow-lg shadow-orange-500/20 hover:brightness-110"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">♥</span>
          I&apos;m looking for a place
        </Link>
        <Link
          href="/login?role=OWNER"
          className="rounded-full border border-neutral-700 bg-neutral-900 px-6 py-3 font-medium text-neutral-200 hover:bg-neutral-800"
        >
          I have a property to list
        </Link>
      </div>
      <div className="grid gap-4 pt-6 text-left sm:grid-cols-3">
        {[
          { icon: "🔄", title: "Freshness enforced", body: "Listings auto-hide when owners stop reconfirming availability." },
          { icon: "🔒", title: "No double booking", body: "Slot holds are atomic — two seekers can never win the same appointment." },
          { icon: "🎯", title: "Visit is the unit of value", body: "We track completed visits and move-ins, not swipes or leads." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="font-semibold text-white">
              <span aria-hidden>{f.icon}</span> {f.title}
            </p>
            <p className="mt-1 text-sm text-neutral-400">{f.body}</p>
          </div>
        ))}
      </div>
      <Link href="/login?role=ADMIN" className="text-xs text-neutral-500 hover:text-neutral-300">
        Operations console sign-in →
      </Link>
    </div>
  );
}
