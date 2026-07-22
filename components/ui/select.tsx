"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function Select({ value, onChange, options, className = "" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className={`relative ${open ? "z-50" : "z-10"} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-umbra-line bg-umbra-ink/60 px-3 py-1.5 text-xs text-umbra-lilac transition hover:border-umbra-purple/50 focus:outline-none focus:ring-1 focus:ring-umbra-purple/50"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-umbra-muted transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 min-w-full left-0 origin-top-left rounded-lg border border-umbra-line bg-[#0f0c20] p-1.5 shadow-2xl backdrop-blur-md whitespace-nowrap">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full text-left items-center rounded-md px-2 py-1.5 text-xs transition-colors ${
                value === o.value
                  ? "text-white font-medium bg-umbra-purple/10"
                  : "text-umbra-lilac hover:bg-white/[.05] hover:text-white"
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
