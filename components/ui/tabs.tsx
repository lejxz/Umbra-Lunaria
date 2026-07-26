"use client";

import { useRef, type KeyboardEvent } from "react";

/**
 * Tabs — accessible tab switcher with WAI-ARIA roving tabindex + arrow-key
 * navigation.
 *
 * Celestial Observatory: active tab gets a violet wash + glow ring; inactive
 * tabs brighten on hover. The whole control sits in a glass inset.
 */
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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    const el = tabRefs.current[clamped];
    if (el) {
      el.focus();
      onChange(items[clamped]!);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusTab(index + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusTab(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusTab(0);
        break;
      case "End":
        e.preventDefault();
        focusTab(items.length - 1);
        break;
    }
  };

  return (
    <div
      className="flex gap-1 rounded-r-md border border-umbra-line bg-umbra-ink/40 p-1 backdrop-blur-sm"
      role="tablist"
      aria-label={label}
    >
      {items.map((item, index) => {
        const selected = item === active;
        return (
          <button
            key={item}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`focus-ring rounded-r-sm px-3 py-1.5 font-mono text-label font-semibold uppercase tracking-wider transition-all duration-150 ${
              selected
                ? "bg-umbra-purple/20 text-umbra-moonlight"
                : "text-umbra-muted hover:bg-white/[.04] hover:text-umbra-lilac"
            }`}
            style={
              selected
                ? { boxShadow: "0 0 0 1px rgba(182,120,255,.3), 0 0 14px rgba(182,120,255,.28)" }
                : undefined
            }
            onClick={() => onChange(item)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
