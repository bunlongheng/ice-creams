"use client";

import { useEffect, useRef, useState } from "react";
import { CoinArt } from "@/components/ui/Art";

interface CoinCounterProps {
  coins: number;
  /** Coins earned by the last serve, shown floating up over the purse. */
  reward: number | null;
  /** Changes on every serve so the same reward can pop twice. */
  rewardKey: number;
}

/**
 * The till. The number counts up rather than jumping, because watching it climb
 * is half the reward.
 */
export function CoinCounter({ coins, reward, rewardKey }: CoinCounterProps) {
  const [shown, setShown] = useState(coins);
  const frame = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(frame.current);
    const from = shown;
    if (from === coins) return;

    const start = performance.now();
    const duration = 460;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setShown(Math.round(from + (coins - from) * t));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
    // `shown` is the animation's starting point, not a trigger - only a new
    // total should restart the count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coins]);

  return (
    <div
      className="relative flex items-center gap-1.5 rounded-2xl bg-vanilla px-3 py-2 shadow-[0_5px_0_rgba(74,44,42,0.22)] sm:px-4 sm:py-2.5"
      aria-label={`${coins} coins earned`}
    >
      <CoinArt className="h-5 w-5 sm:h-6 sm:w-6" />
      <span className="font-body text-lg leading-none font-black text-cocoa tabular-nums sm:text-xl" aria-hidden="true">
        {shown}
      </span>
      {reward !== null && (
        <span
          key={rewardKey}
          aria-hidden="true"
          className="animate-float-up pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 font-body text-lg font-black text-mint drop-shadow-[0_2px_0_rgba(74,44,42,0.5)] sm:text-xl"
        >
          +{reward}
        </span>
      )}
    </div>
  );
}
