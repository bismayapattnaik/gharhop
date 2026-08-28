export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export const TYPE_LABEL: Record<string, string> = {
  FLAT: "Flat",
  ROOM: "Private Room",
  PG_BED: "PG Bed",
};

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
