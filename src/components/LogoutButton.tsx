"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({ dark }: { dark?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      className={dark ? "text-neutral-400 hover:text-red-400 disabled:opacity-50" : "text-slate-500 hover:text-red-600 disabled:opacity-50"}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
