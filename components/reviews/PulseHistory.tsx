export interface PulseItem {
  id: number;
  top_theme: string;
  body: string;
  word_count: number | null;
  created_at: string;
}

/** Clickable list of past pulses — pick one to view it above. */
export function PulseHistory({
  items,
  selectedId,
  onSelect,
}: {
  items: PulseItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onSelect(it.id)}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
            it.id === selectedId ? "border-brand bg-brand/5" : "border-border hover:bg-black/5"
          }`}
        >
          <span className="truncate">{it.top_theme}</span>
          <span className="ml-2 shrink-0 text-xs text-muted">
            {new Date(it.created_at).toLocaleDateString()} · {it.word_count ?? "?"}w
          </span>
        </button>
      ))}
    </div>
  );
}
