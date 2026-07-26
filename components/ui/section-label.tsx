import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-umbra-line/40" />
      <h3 className="font-mono text-label uppercase tracking-widest text-umbra-purple/80">
        {children}
      </h3>
      <div className="h-px flex-1 bg-umbra-line/40" />
    </div>
  );
}
