// Straight-line distance only (PRD GH-205: "failures degrade to distance, not
// blank screen"). No real geocoding/ETA provider wired up in the prototype —
// owners enter lat/lng for a fixed set of Gurgaon (Gurugram) micro-markets.

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

// Gurgaon (Gurugram) launch corridor — controlled single-locality beta per
// the 48-hour launch plan ("do not launch across multiple cities").
export const MICRO_MARKETS = [
  { name: "DLF Cyber City", lat: 28.495, lng: 77.089 },
  { name: "Golf Course Road", lat: 28.438, lng: 77.1025 },
  { name: "Sohna Road", lat: 28.4088, lng: 77.0367 },
  { name: "Sector 29", lat: 28.4646, lng: 77.0669 },
  { name: "Udyog Vihar", lat: 28.501, lng: 77.089 },
] as const;
