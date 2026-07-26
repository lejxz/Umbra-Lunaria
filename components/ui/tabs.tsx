"use client";

import { useRef, type KeyboardEvent } from "react";

/**
 * Tabs — accessible tab switcher with WAI-ARIA roving tabindex + arrow-key
 * navigation.
 *
 * The roving-tabindex pattern is already set up (aria-selected, tabIndex 0/-1).
 * This adds the missing arrow-key handler so keyboard users can move between
 * tabs with ArrowLeft/ArrowRight (and Home/End), as the WAI-ARIA tabs pattern
 * expects.
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
      className="flex gap-1 rounded-lg bg-white/5 p-1"
      role="tablist"
      aria-label={label}
    >
      {items.map((item, index) => {
        const selected = item === active;
        return (
          <button
            key={item}
            ref={(el) => { tabRefs.current[index] = el; }}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`focus-ring rounded-lg px-3 py-2 text-xs font-semibold transition ${
              selected
                ? "bg-umbra-purple/20 text-umbra-purple"
                : "text-umbra-muted hover:text-umbra-lilac"
            }`}
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
