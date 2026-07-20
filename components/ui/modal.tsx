"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const mounted = useMounted();
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <div className="glass max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl p-6" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  );
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const mounted = useMounted();
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <div className="glass absolute inset-x-0 bottom-0 max-h-[90vh] overflow-auto rounded-t-2xl p-6 sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-lg sm:rounded-none sm:rounded-l-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  );
}
