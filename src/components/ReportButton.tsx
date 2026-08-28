"use client";

import { useState } from "react";

const CATEGORIES = ["Unavailable", "Duplicate", "Wrong facts", "Fraud", "Discriminatory content", "Safety issue"];

export default function ReportButton({ targetType, targetId }: { targetType: string; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [details, setDetails] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);

  async function submit() {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, targetType, targetId, details }),
    });
    const data = await res.json();
    if (res.ok) setCaseId(data.report.id);
  }

  if (caseId) {
    return <p className="text-xs text-slate-500">Report received — case #{caseId.slice(0, 8)}. Our trust team will review it.</p>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-slate-400 underline hover:text-slate-600">
        Report this listing
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1">
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Optional details"
        className="mt-2 w-full rounded border border-slate-300 px-2 py-1"
        rows={2}
      />
      <div className="mt-2 flex gap-2">
        <button onClick={submit} className="rounded-full bg-red-600 px-3 py-1 text-white">
          Submit report
        </button>
        <button onClick={() => setOpen(false)} className="rounded-full border border-slate-300 px-3 py-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
