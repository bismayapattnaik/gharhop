"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const OUTCOMES = [
  { value: "PASS", label: "Not for me" },
  { value: "MAYBE", label: "Maybe — comparing" },
  { value: "SHORTLIST", label: "Shortlisted for decision" },
  { value: "OFFER", label: "Ready to make an offer" },
  { value: "COULD_NOT_VISIT", label: "Couldn't actually visit" },
];

export default function VisitActions({ visit }: { visit: { id: string; status: string; outcome: string | null } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, body?: object) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Action failed.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (visit.status === "REQUESTED") {
    return (
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-400">Waiting on owner response…</p>
        <ActionButton disabled={loading} onClick={() => call(`/api/visits/${visit.id}/cancel`, { reason: "Seeker withdrew request" })}>
          Cancel request
        </ActionButton>
        {error && <Err msg={error} />}
      </div>
    );
  }

  if (visit.status === "CONFIRMED") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton primary disabled={loading} onClick={() => call(`/api/visits/${visit.id}/checkin`)}>
          I&apos;ve arrived — check in
        </ActionButton>
        <ActionButton disabled={loading} onClick={() => call(`/api/visits/${visit.id}/no-show`, { who: "host" })}>
          Owner didn&apos;t show
        </ActionButton>
        <ActionButton disabled={loading} onClick={() => call(`/api/visits/${visit.id}/cancel`, { reason: "Seeker cancelled" })}>
          Cancel
        </ActionButton>
        {error && <Err msg={error} />}
      </div>
    );
  }

  if (visit.status === "CHECKED_IN") {
    return (
      <div className="flex items-center gap-2">
        <ActionButton primary disabled={loading} onClick={() => call(`/api/visits/${visit.id}/complete`)}>
          Mark visit completed
        </ActionButton>
        {error && <Err msg={error} />}
      </div>
    );
  }

  if (visit.status === "COMPLETED" && !visit.outcome) {
    return <OutcomeForm visitId={visit.id} onDone={() => router.refresh()} />;
  }

  return null;
}

function OutcomeForm({ visitId, onDone }: { visitId: string; onDone: () => void }) {
  const [outcome, setOutcome] = useState(OUTCOMES[0].value);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await fetch(`/api/visits/${visitId}/outcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    });
    setLoading(false);
    onDone();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm">
        {OUTCOMES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ActionButton primary disabled={loading} onClick={submit}>
        Save outcome
      </ActionButton>
    </div>
  );
}

function ActionButton({ children, onClick, disabled, primary }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
        primary ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Err({ msg }: { msg: string }) {
  return <p className="text-xs text-red-600">{msg}</p>;
}
