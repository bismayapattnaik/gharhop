"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLES = [
  { value: "SEEKER", label: "Seeker — I'm looking for a place" },
  { value: "OWNER", label: "Owner / Operator — I have properties" },
  { value: "ADMIN", label: "Ops / Admin console" },
];

const HOME_BY_ROLE: Record<string, string> = {
  SEEKER: "/seeker",
  OWNER: "/owner",
  ADMIN: "/admin",
};

export default function LoginForm({ initialRole }: { initialRole: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push(HOME_BY_ROLE[data.user.role] ?? "/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Phone number</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-600 focus:outline-none"
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Name (first time only)</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-600 focus:outline-none"
          placeholder="Aditi Rao"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">I am a...</label>
        <select
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-600 focus:outline-none"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Continue"}
      </button>
    </form>
  );
}
