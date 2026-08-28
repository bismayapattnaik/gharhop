// Deterministic per-listing visuals so cards look distinct without real
// photos yet (no media pipeline in the prototype — see PRD GH-404).
export function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  return hash;
}

export function gradientFor(id: string): string {
  const hue = hueFromId(id);
  return `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 75% 42%))`;
}

export const TYPE_EMOJI: Record<string, string> = {
  FLAT: "🏢",
  ROOM: "🚪",
  PG_BED: "🛏️",
};
