"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

type CountdownState = "loading" | "expired" | Remaining;

function getRemaining(targetIso: string): Remaining | null {
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return null;
  return {
    days: Math.floor(diffMs / 86_400_000),
    hours: Math.floor((diffMs % 86_400_000) / 3_600_000),
    minutes: Math.floor((diffMs % 3_600_000) / 60_000),
    seconds: Math.floor((diffMs % 60_000) / 1000),
  };
}

const UNITS: Array<{ key: keyof Remaining; label: string }> = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Sec" },
];

export function DraftCountdown({ targetIso }: { targetIso: string }) {
  // Starts in a "loading" state rather than computing the real countdown
  // during the initial render: that render happens on the server first,
  // whose clock has no relationship to the visitor's, so it would mismatch
  // the client's first render and trigger a hydration error. Ticking starts
  // only after mount, once we're reading the visitor's own clock.
  const [state, setState] = useState<CountdownState>("loading");

  useEffect(() => {
    const tick = () => setState(getRemaining(targetIso) ?? "expired");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (state === "loading") {
    return (
      <div className="flex gap-3 sm:gap-5" aria-hidden>
        {UNITS.map((unit) => (
          <div key={unit.key} className="h-14 w-14 rounded-lg bg-navy-800 sm:h-20 sm:w-20" />
        ))}
      </div>
    );
  }

  if (state === "expired") {
    return (
      <p className="font-display text-xl font-semibold text-gold-400 uppercase">
        The draft is underway
      </p>
    );
  }

  return (
    <div className="flex gap-3 sm:gap-5" role="timer" aria-live="off">
      {UNITS.map((unit) => {
        const value = state[unit.key];
        return (
          <div key={unit.key} className="flex w-14 flex-col items-center sm:w-20">
            <div className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-lg bg-navy-800 ring-1 ring-navy-600 sm:h-20">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={value}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -16, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="font-display text-2xl font-semibold tabular-nums text-gold-400 sm:text-4xl"
                >
                  {String(value).padStart(2, "0")}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="mt-1.5 text-[10px] font-medium tracking-[0.15em] text-fg-subtle uppercase sm:text-xs">
              {unit.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
