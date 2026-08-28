// Deterministic per-listing visuals so cards look distinct without real
// photos yet (no media pipeline in the prototype — see PRD GH-404).
function hashString(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  }
  return hash;
}

// Curated jewel-tone pairs instead of raw hue rotation — reads as
// intentionally art-directed (photographic color grading) rather than
// a rainbow placeholder.
const GRADIENTS = [
  "linear-gradient(160deg, #ff7a45 0%, #c81d5b 60%, #4a0d2b 100%)", // sunset
  "linear-gradient(160deg, #f59e0b 0%, #b91c1c 65%, #450a0a 100%)", // amber night
  "linear-gradient(160deg, #a855f7 0%, #db2777 60%, #3b0764 100%)", // purple dusk
  "linear-gradient(160deg, #f43f5e 0%, #7c3aed 65%, #1e1b4b 100%)", // rose to indigo
  "linear-gradient(160deg, #fb923c 0%, #831843 65%, #1c0a12 100%)", // ember
  "linear-gradient(160deg, #38bdf8 0%, #6d28d9 60%, #1e1240 100%)", // dusk blue (cool accent for variety)
];

export function gradientFor(id: string): string {
  return GRADIENTS[hashString(id) % GRADIENTS.length];
}

export const TYPE_EMOJI: Record<string, string> = {
  FLAT: "🏢",
  ROOM: "🚪",
  PG_BED: "🛏️",
};
