"use client";

import type { ReactNode } from "react";

export interface Choice {
  id: string;
  label: string;
  art: ReactNode;
}

interface ChoiceGridProps {
  choices: readonly Choice[];
  selected: readonly string[];
  onChoose: (id: string) => void;
  /** Announced to screen readers as the name of the group. */
  label: string;
  columns?: "wide" | "normal";
}

/**
 * The one grid of picture buttons used by every step. Buttons stay large enough
 * for a toddler thumb (>= 88px) at every breakpoint.
 */
export function ChoiceGrid({ choices, selected, onChoose, label, columns = "normal" }: ChoiceGridProps) {
  const gridClass =
    columns === "wide"
      ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
      : "grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4";

  return (
    <div className={gridClass} role="group" aria-label={label}>
      {choices.map((choice, index) => {
        const isSelected = selected.includes(choice.id);
        return (
          <button
            key={choice.id}
            type="button"
            onClick={() => onChoose(choice.id)}
            data-selected={isSelected}
            aria-pressed={isSelected}
            className="sticker animate-pop-in flex min-h-[88px] flex-col items-center justify-center gap-1 p-2 sm:min-h-[104px] sm:p-3"
            style={{ animationDelay: `${Math.min(index * 28, 320)}ms` }}
          >
            <span className="pointer-events-none block w-12 sm:w-14">{choice.art}</span>
            <span className="pointer-events-none text-center text-[11px] leading-tight font-semibold sm:text-xs">
              {choice.label}
            </span>
            {isSelected && (
              <span className="pointer-events-none absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-cocoa text-sm text-vanilla shadow-md">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
