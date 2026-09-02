"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// PRD GH-201 "Permissioned location" — real device GPS via the browser
// Geolocation API. Denial or an unsupported browser never blocks search;
// the manual micro-market picker in FilterBar is always available.
export default function UseLocationButton({ active }: { active: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "locating" | "denied" | "error">("idle");

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", pos.coords.latitude.toString());
        params.set("lng", pos.coords.longitude.toString());
        params.delete("destination");
        setStatus("idle");
        router.push(`/seeker?${params.toString()}`);
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }

  if (active) {
    return (
      <button
        onClick={() => router.push("/seeker")}
        className="mt-1 text-xs text-emerald-400 underline decoration-dotted"
      >
        Using your live location — switch to manual area
      </button>
    );
  }

  return (
    <div className="mt-1">
      <button onClick={useMyLocation} disabled={status === "locating"} className="text-xs text-orange-400 underline decoration-dotted disabled:opacity-50">
        {status === "locating" ? "Locating…" : "📍 Use my current location"}
      </button>
      {status === "denied" && <p className="mt-0.5 text-xs text-neutral-500">Location denied — pick an area below instead.</p>}
      {status === "error" && <p className="mt-0.5 text-xs text-neutral-500">Couldn&apos;t get your location — pick an area below instead.</p>}
    </div>
  );
}
