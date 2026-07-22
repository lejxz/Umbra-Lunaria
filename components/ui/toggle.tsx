"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <div className="relative">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="block h-[18px] w-8 rounded-full border border-umbra-line bg-umbra-ink/60 transition-colors peer-checked:bg-umbra-purple/80 peer-checked:border-umbra-purple"></div>
        <div className="absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full bg-umbra-muted transition-transform peer-checked:translate-x-[14px] peer-checked:bg-white"></div>
      </div>
      {label && <span className="text-xs font-medium text-umbra-lilac">{label}</span>}
    </label>
  );
}
