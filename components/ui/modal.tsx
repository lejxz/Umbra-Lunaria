"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Modal & Sheet — shared overlay primitives. See concept/10-mobile-support.md
 * §Accessibility (3): focus must be trapped inside an open dialog and restored
 * to the triggering control on close. The Sheet variant slides up from the
 * bottom on mobile and in from the right on desktop (concept/10 §6).
 *
 * Behavior contract:
 *  - Close on Escape and on backdrop click (not on inside click).
 *  - Body scroll locked while open, restored on close.
 *  - Focus first focusable element on open; Tab cycles within the panel;
 *    Shift+Tab wraps to the last; focus returns to the trigger on close.
 *  - Visible close button with aria-label="Close".
 *  - aria-labelledby / aria-describedby threaded through to the dialog node.
 */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [active]);
}

function useFocusTrap(
  active: boolean,
  panelRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Move focus into the panel on open.
    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? panel).focus();
    }

    return () => {
      const trigger = previouslyFocused.current;
      if (trigger && typeof trigger.focus === "function") {
        trigger.focus();
      }
    };
  }, [active, panelRef]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose, panelRef],
  );

  return { onKeyDown };
}

type CommonProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** id of the element that labels the dialog. */
  ariaLabelledBy?: string;
  /** id of the element that describes the dialog. */
  ariaDescribedBy?: string;
  /** Accessible role label rendered when no ariaLabelledBy is provided. */
  ariaLabel?: string;
};

export function Modal({
  open,
  onClose,
  children,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaLabel,
}: CommonProps) {
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useScrollLock(open && mounted);
  const { onKeyDown } = useFocusTrap(open && mounted, panelRef, onClose);

  useEffect(() => {
    if (!open || !mounted) return;
    // Trigger the in-animation on the next frame so the browser actually
    // paints the initial state first.
    const raf = requestAnimationFrame(() => setAnimateIn(true));
    return () => {
      cancelAnimationFrame(raf);
      setAnimateIn(false);
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm transition-opacity duration-200 ${
        animateIn ? "opacity-100" : "opacity-0"
      }`}
      role="presentation"
      onClick={onClose}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        className={`glass relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl p-6 transition-all duration-200 ${
          animateIn ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <CloseButton onClose={onClose} />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Sheet({
  open,
  onClose,
  children,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaLabel,
}: CommonProps) {
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useScrollLock(open && mounted);
  const { onKeyDown } = useFocusTrap(open && mounted, panelRef, onClose);

  useEffect(() => {
    if (!open || !mounted) return;
    const raf = requestAnimationFrame(() => setAnimateIn(true));
    return () => {
      cancelAnimationFrame(raf);
      setAnimateIn(false);
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  // Slide up from bottom on mobile (translate-y), slide in from right on
  // desktop (sm:translate-x). See concept/10-mobile-support.md §6.
  const panelTransform = animateIn
    ? "translate-y-0 sm:translate-x-0"
    : "translate-y-full sm:translate-x-full";

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
        animateIn ? "opacity-100" : "opacity-0"
      }`}
      role="presentation"
      onClick={onClose}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        className={`glass absolute inset-x-0 bottom-0 max-h-[90vh] overflow-auto rounded-t-2xl p-6 transition-transform duration-300 ease-out sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-lg sm:rounded-none sm:rounded-l-2xl ${panelTransform}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <CloseButton onClose={onClose} />
        {children}
      </div>
    </div>,
    document.body,
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="focus-ring absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-umbra-line bg-umbra-surface/70 text-umbra-muted transition hover:border-umbra-purple/50 hover:text-umbra-lilac"
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  );
}
