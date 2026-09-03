import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import NotificationBell from "@/components/NotificationBell";
import MobileNavMenu from "@/components/MobileNavMenu";

const LINKS: Record<string, { href: string; label: string }[]> = {
  SEEKER: [
    { href: "/seeker", label: "Discover" },
    { href: "/seeker/visits", label: "My Visits" },
    { href: "/seeker/plans", label: "Plans" },
  ],
  OWNER: [
    { href: "/owner", label: "My Listings" },
    { href: "/owner/requests", label: "Requests" },
    { href: "/owner/performance", label: "Performance" },
    { href: "/owner/plans", label: "Plans" },
  ],
  ADMIN: [{ href: "/admin", label: "Ops Console" }],
};

export default async function TopNav() {
  const user = await getCurrentUser();
  // Consumer-facing (no user yet, or a seeker) gets the dark/gradient brand
  // treatment matching the mobile app; owner/admin stay on the light
  // business-dashboard theme.
  const dark = !user || user.role === "SEEKER";

  return (
    <header className={dark ? "border-b border-neutral-900 bg-neutral-950" : "border-b border-slate-200 bg-white"}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-baseline gap-1">
          <span className={dark ? "bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-lg font-bold text-transparent" : "text-lg font-bold text-teal-700"}>
            GharHop
          </span>
          <span className={dark ? "hidden text-xs text-neutral-500 sm:inline" : "hidden text-xs text-slate-400 sm:inline"}>
            Swipe nearby. Match a visit. Move in.
          </span>
        </Link>
        <nav className={`flex items-center gap-3 text-sm font-medium sm:gap-4 ${dark ? "text-neutral-400" : "text-slate-600"}`}>
          {user && (
            // Below `sm`, links move into MobileNavMenu (owner/admin) or the
            // seeker's bottom tab bar — either way, they never sit inline
            // next to the logo on a narrow screen.
            <span className="hidden items-center gap-4 sm:flex">
              {LINKS[user.role]?.map((link) => (
                <Link key={link.href} href={link.href} className={dark ? "hover:text-orange-400" : "hover:text-teal-700"}>
                  {link.label}
                </Link>
              ))}
            </span>
          )}
          {user && user.role !== "SEEKER" && <MobileNavMenu links={LINKS[user.role] ?? []} dark={dark} />}
          {user ? (
            <div className={`flex items-center gap-2 border-l pl-3 sm:gap-3 sm:pl-4 ${dark ? "border-neutral-800" : "border-slate-200"}`}>
              <NotificationBell dark={dark} />
              <span className={`hidden sm:inline ${dark ? "text-neutral-400" : "text-slate-500"}`}>
                {user.name} <span className={`text-xs uppercase ${dark ? "text-neutral-600" : "text-slate-400"}`}>· {user.role}</span>
              </span>
              <LogoutButton dark={dark} />
            </div>
          ) : (
            <Link href="/login" className="rounded-full bg-gradient-to-r from-orange-500 to-pink-600 px-4 py-1.5 text-white hover:brightness-110">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
