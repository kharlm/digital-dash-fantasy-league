"use client";

import { useEffect } from "react";

interface CelebrationOverlayProps {
  label: string;
  onDismiss: () => void;
  /** Omit for a reveal the visitor opened themselves — no reason to force it closed on them. */
  autoDismissMs?: number;
  children: React.ReactNode;
}

/**
 * Shared full-screen dismissible chrome for one-off celebratory overlays
 * (KalenSplash, the Scores-page champion reveal): backdrop, Escape key,
 * click-anywhere-to-dismiss, and an explicit close button. Content is
 * entirely up to the caller.
 */
export function CelebrationOverlay({ label, onDismiss, autoDismissMs, children }: CelebrationOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    const timer = autoDismissMs != null ? setTimeout(onDismiss, autoDismissMs) : undefined;
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer != null) clearTimeout(timer);
    };
  }, [onDismiss, autoDismissMs]);

  return (
    <div
      role="dialog"
      aria-label={label}
      onClick={onDismiss}
      className="animate-hero-in fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-6 bg-navy-950/97 px-6 text-center backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Close"
        className="absolute top-6 right-6 text-2xl text-fg-subtle transition-colors hover:text-fg"
      >
        ✕
      </button>

      {children}
    </div>
  );
}
