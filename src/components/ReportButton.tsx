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
    return <p className="text-xs text-neutral-500">Report received — case #{caseId.slice(0, 8)}. Our trust team will review it.</p>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-neutral-500 underline hover:text-neutral-300">
        Report this listing
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-200">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-200"
      >
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
        className="mt-2 w-full rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-200 placeholder:text-neutral-500"
        rows={2}
      />
      <div className="mt-2 flex gap-2">
        <button onClick={submit} className="rounded-full bg-red-600 px-3 py-1 text-white">
          Submit report
        </button>
        <button onClick={() => setOpen(false)} className="rounded-full border border-neutral-600 px-3 py-1 text-neutral-300">
          Cancel
        </button>
      </div>
    </div>
  );
}
