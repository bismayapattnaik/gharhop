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
    <div className="flex flex-col items-center gap-10 py-16 text-center">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">GharHop prototype</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Swipe nearby. Match a visit. Move in.
        </h1>
        <p className="mx-auto max-w-xl text-slate-600">
          A visit-liquidity marketplace, not another listings feed. Every unit shown is freshness-verified,
          every match is a real confirmed slot, and every visit is tracked end to end.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login?role=SEEKER" className="rounded-full bg-teal-700 px-6 py-3 font-medium text-white hover:bg-teal-800">
          I&apos;m looking for a place
        </Link>
        <Link href="/login?role=OWNER" className="rounded-full border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50">
          I have a property to list
        </Link>
      </div>
      <div className="grid gap-4 pt-6 text-left sm:grid-cols-3">
        {[
          { title: "Freshness enforced", body: "Listings auto-hide when owners stop reconfirming availability." },
          { title: "No double booking", body: "Slot holds are atomic — two seekers can never win the same appointment." },
          { title: "Visit is the unit of value", body: "We track completed visits and move-ins, not swipes or leads." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{f.title}</p>
            <p className="mt-1 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </div>
      <Link href="/login?role=ADMIN" className="text-xs text-slate-400 hover:text-slate-600">
        Operations console sign-in →
      </Link>
    </div>
  );
}
