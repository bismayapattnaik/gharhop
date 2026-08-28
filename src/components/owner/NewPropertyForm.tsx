"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MICRO_MARKETS } from "@/lib/geo";

export default function NewPropertyForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [area, setArea] = useState<string>(MICRO_MARKETS[0].name);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const market = MICRO_MARKETS.find((m) => m.name === area)!;

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          area,
          address: form.get("address"),
          lat: market.lat,
          lng: market.lng,
          type: form.get("type"),
          configuration: form.get("configuration"),
          rentAmount: form.get("rentAmount"),
          depositAmount: form.get("depositAmount"),
          furnishing: form.get("furnishing"),
          occupancyPolicy: form.get("occupancyPolicy"),
          availableFrom: form.get("availableFrom"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create listing.");
        return;
      }
      router.push(`/owner/items/${data.property.items[0].id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <Field label="Property title">
        <input name="title" required placeholder="Sunrise Residency, Block C" className="input" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Micro-market">
          <select name="area" value={area} onChange={(e) => setArea(e.target.value)} className="input">
            {MICRO_MARKETS.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Address (kept private until confirmed visit)">
          <input name="address" required placeholder="Flat 4B, near XYZ signal" className="input" />
        </Field>
      </div>

      <hr className="border-slate-200" />
      <p className="text-sm font-medium text-slate-700">First inventory item</p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <select name="type" className="input">
            <option value="FLAT">Flat</option>
            <option value="ROOM">Private Room</option>
            <option value="PG_BED">PG Bed</option>
          </select>
        </Field>
        <Field label="Configuration">
          <input name="configuration" required placeholder="2BHK / Single bed / Shared room" className="input" />
        </Field>
        <Field label="Monthly rent (₹)">
          <input name="rentAmount" type="number" required min={0} className="input" />
        </Field>
        <Field label="Deposit (₹)">
          <input name="depositAmount" type="number" required min={0} className="input" />
        </Field>
        <Field label="Furnishing">
          <input name="furnishing" placeholder="Semi-furnished" className="input" />
        </Field>
        <Field label="Occupancy / gender policy (optional)">
          <input name="occupancyPolicy" placeholder="Co-ed, max 2 per room" className="input" />
        </Field>
        <Field label="Available from">
          <input name="availableFrom" type="date" className="input" />
        </Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="w-full rounded-full bg-teal-700 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-50">
        {loading ? "Creating…" : "Create listing (draft)"}
      </button>
      <p className="text-xs text-slate-400">
        New listings start as DRAFT and won&apos;t show to seekers until you reconfirm availability and add visit slots.
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
