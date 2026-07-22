"use client";

export function Tabs({
  items,
  active,
  onChange,
  label,
}: {
  items: string[];
  active: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div
      className="flex gap-1 rounded-xl bg-white/5 p-1"
      role="tablist"
      aria-label={label}
    >
      {items.map((item) => {
        const selected = item === active;
        return (
          <button
            key={item}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`focus-ring rounded-lg px-3 py-2 text-xs font-semibold transition ${
              selected
                ? "bg-umbra-purple/20 text-umbra-purple"
                : "text-umbra-muted hover:text-umbra-lilac"
            }`}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
