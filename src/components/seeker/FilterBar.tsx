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
    <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-slate-500">Near</label>
        <select name="destination" defaultValue={destination} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          {MICRO_MARKETS.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">Type</label>
        <select name="type" defaultValue={type} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          <option value="ALL">All types</option>
          <option value="FLAT">Flat</option>
          <option value="ROOM">Private Room</option>
          <option value="PG_BED">PG Bed</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">Max budget (₹/mo)</label>
        <input
          type="number"
          name="budget"
          defaultValue={budget}
          placeholder="No limit"
          className="mt-1 w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button type="submit" className="rounded-full bg-teal-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-800">
        Apply
      </button>
    </form>
  );
}
