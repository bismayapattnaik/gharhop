import { MICRO_MARKETS } from "@/lib/geo";

// Plain GET form — no client JS needed, works with the accessibility
// requirement that discovery filters are usable without gestures (GH-402).
export default function FilterBar({
  destination,
  type,
  budget,
}: {
  destination: string;
  type: string;
  budget: string;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900 p-2.5">
      <div>
        <label className="block text-xs font-medium text-neutral-500">Near</label>
        <select name="destination" defaultValue={destination} className="mt-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-100">
          {MICRO_MARKETS.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Type</label>
        <select name="type" defaultValue={type} className="mt-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-100">
          <option value="ALL">All types</option>
          <option value="FLAT">Flat</option>
          <option value="ROOM">Private Room</option>
          <option value="PG_BED">PG Bed</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Max budget (₹/mo)</label>
        <input
          type="number"
          name="budget"
          defaultValue={budget}
          placeholder="No limit"
          className="mt-1 w-28 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500"
        />
      </div>
      <button
        type="submit"
        className="rounded-full bg-gradient-to-r from-orange-500 to-pink-600 px-4 py-1.5 text-sm font-medium text-white hover:brightness-110"
      >
        Apply
      </button>
    </form>
  );
}
