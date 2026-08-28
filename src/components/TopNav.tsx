import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

const LINKS: Record<string, { href: string; label: string }[]> = {
  SEEKER: [
    { href: "/seeker", label: "Discover" },
    { href: "/seeker/visits", label: "My Visits" },
  ],
  OWNER: [
    { href: "/owner", label: "My Listings" },
    { href: "/owner/requests", label: "Requests" },
    { href: "/owner/performance", label: "Performance" },
  ],
  ADMIN: [{ href: "/admin", label: "Ops Console" }],
};

export default async function TopNav() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-teal-700">GharHop</span>
          <span className="hidden text-xs text-slate-400 sm:inline">Swipe nearby. Match a visit. Move in.</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          {user && (
            // Seekers get a bottom tab bar on mobile instead — avoid double nav.
            <span className={user.role === "SEEKER" ? "hidden items-center gap-4 sm:flex" : "flex items-center gap-4"}>
              {LINKS[user.role]?.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-teal-700">
                  {link.label}
                </Link>
              ))}
            </span>
          )}
          {user ? (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <span className="hidden text-slate-500 sm:inline">
                {user.name} <span className="text-xs uppercase text-slate-400">· {user.role}</span>
              </span>
              <LogoutButton />
            </div>
          ) : (
            <Link href="/login" className="rounded-full bg-teal-700 px-4 py-1.5 text-white hover:bg-teal-800">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
