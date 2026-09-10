"use client";

import { STEPS, type Step } from "@/lib/creation";

const STEP_META: Record<Step, { label: string; badge: string }> = {
  style: { label: "Style", badge: "1" },
  flavor: { label: "Flavour", badge: "2" },
  vessel: { label: "Serve in", badge: "3" },
  topping: { label: "Toppings", badge: "4" },
  serve: { label: "Serve", badge: "5" },
};

interface StepBarProps {
  current: Step;
  /** Steps the child has enough choices to jump back to. */
  reachable: readonly Step[];
  onGoTo: (step: Step) => void;
}

export function StepBar({ current, reachable, onGoTo }: StepBarProps) {
  return (
    <nav aria-label="Order steps" className="flex items-center gap-1.5 sm:gap-2">
      {STEPS.filter((step) => step !== "serve").map((step) => {
        const meta = STEP_META[step];
        const isCurrent = step === current;
        const canGo = reachable.includes(step);
        return (
          <button
            key={step}
            type="button"
            disabled={!canGo}
            aria-current={isCurrent ? "step" : undefined}
            onClick={() => onGoTo(step)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm ${
              isCurrent ? "bg-cocoa text-vanilla" : "bg-vanilla/80 text-cocoa hover:bg-butter"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                isCurrent ? "bg-butter text-cocoa" : "bg-cocoa/10 text-cocoa"
              }`}
              aria-hidden="true"
            >
              {meta.badge}
            </span>
            <span className="hidden sm:inline">{meta.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
