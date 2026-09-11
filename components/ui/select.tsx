"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { IconChevronDown } from "@/components/ui/icons";

interface SelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  /** Accessible name for the listbox popup (e.g. "Filter by role"). */
  ariaLabel?: string;
}

/**
 * fix §6.6 (docs/2026-09-10 assessment): the custom Select had no combobox
 * semantics and no keyboard navigation — screen readers announced it as a bare
 * button with mystery contents, and keyboard users could only open it (Enter)
 * but never choose an option without a mouse. It now exposes
 * aria-haspopup/aria-expanded on the trigger, a real listbox/option structure
 * with aria-selected, and full arrow-key navigation (ArrowUp/Down, Home/End,
 * Escape to dismiss and restore focus, Enter/Space to select).
 */
export function Select({ value, onChange, options, className = "", ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const focusOption = useCallback((index: number) => {
    const optionButtons = listRef.current?.querySelectorAll<HTMLButtonElement>("button[role='option']");
    if (!optionButtons || optionButtons.length === 0) return;
    const clamped = Math.max(0, Math.min(index, optionButtons.length - 1));
    optionButtons[clamped]?.focus();
  }, []);

  const openList = () => {
    setOpen(true);
    // Focus the selected (or first) option once the list mounts.
    requestAnimationFrame(() => {
      const optionButtons = listRef.current?.querySelectorAll<HTMLButtonElement>("button[role='option']");
      if (!optionButtons || optionButtons.length === 0) return;
      const selectedIdx = options.findIndex((o) => o.value === value);
      optionButtons[Math.max(0, selectedIdx)]?.focus();
    });
  };

  const closeList = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className={`relative ${open ? "z-50" : "z-10"} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openList();
          }
        }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-umbra-line bg-umbra-ink/60 px-3 py-1.5 text-xs text-umbra-lilac transition hover:border-umbra-purple/50 focus:outline-none focus:ring-1 focus:ring-umbra-purple/50"
      >
        <span className="truncate">{selectedLabel}</span>
        <IconChevronDown className="h-3.5 w-3.5 shrink-0 text-umbra-muted transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={(e) => {
            const optionButtons = Array.from(
              listRef.current?.querySelectorAll<HTMLButtonElement>("button[role='option']") ?? [],
            );
            const currentIndex = optionButtons.findIndex((b) => b === document.activeElement);
            switch (e.key) {
              case "ArrowDown":
                e.preventDefault();
                focusOption(currentIndex + 1);
                break;
              case "ArrowUp":
                e.preventDefault();
                focusOption(currentIndex - 1);
                break;
              case "Home":
                e.preventDefault();
                focusOption(0);
                break;
              case "End":
                e.preventDefault();
                focusOption(optionButtons.length - 1);
                break;
              case "Escape":
                e.preventDefault();
                closeList();
                break;
              case "Tab":
                closeList(false);
                break;
            }
          }}
          className="absolute z-50 mt-1 min-w-full left-0 origin-top-left rounded-lg border border-umbra-line bg-[#0f0c20] p-1.5 shadow-2xl backdrop-blur-md whitespace-nowrap"
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={value === o.value}
              onClick={() => {
                onChange(o.value);
                closeList();
              }}
              className={`flex w-full text-left items-center rounded-lg px-2 py-1.5 text-xs transition-colors focus:outline-none focus:bg-white/[.06] ${
                value === o.value
                  ? "text-white font-medium bg-umbra-purple/10"
                  : "text-umbra-lilac hover:bg-white/[.04] hover:text-white"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
