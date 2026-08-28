// Straight-line distance only (PRD GH-205: "failures degrade to distance, not
// blank screen"). No real geocoding/ETA provider wired up in the prototype —
// owners enter lat/lng for a fixed set of Bengaluru micro-markets.

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * c;
}

// Bengaluru micro-markets from the launch corridor (PRD section 13).
export const MICRO_MARKETS = [
  { name: "Bellandur", lat: 12.9257, lng: 77.6764 },
  { name: "HSR Layout", lat: 12.9116, lng: 77.6389 },
  { name: "Sarjapur Road", lat: 12.9008, lng: 77.6858 },
  { name: "Marathahalli", lat: 12.9569, lng: 77.6974 },
  { name: "Whitefield", lat: 12.9698, lng: 77.7499 },
] as const;
