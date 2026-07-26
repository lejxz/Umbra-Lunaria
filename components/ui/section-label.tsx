import type { ReactNode } from "react";

export function SectionLabel({ children, noMargin }: { children: ReactNode, noMargin?: boolean }) {
  return (
    <div className={`flex items-center gap-2 border-b border-umbra-line/50 pb-1 ${noMargin ? '' : 'mb-3'}`}>
      <h3 className="font-display text-sm font-semibold text-umbra-lilac">{children}</h3>
    </div>
  );
}
