"use client";

import { useMemo } from "react";
import { makeRng } from "@/lib/random";
import { CoinArt } from "@/components/ui/Art";

const CONFETTI_COLORS = ["#FF6FA5", "#FFD25E", "#4FD0B6", "#7BC6FF", "#E8395B", "#FFFAF0"];

interface CelebrationProps {
  /** Changes on every serve so the overlay replays. */
  serveId: number;
  headline: string;
  /** Coins this serve earned, shown next to the cheer. */
  coins: number | null;
}

/**
 * The ta-da overlay: confetti rain and a big cheer. It clears itself after a
 * couple of seconds, so there is no button to find before playing again.
 */
export function Celebration({ serveId, headline, coins }: CelebrationProps) {

  // A fresh scatter per serve keeps the moment feeling new.
  const confetti = useMemo(() => {
    const rng = makeRng(serveId * 7919 + 13);
    return Array.from({ length: 44 }, (_, index) => ({
      left: rng() * 100,
      drift: rng() * 120 - 60,
      delay: rng() * 0.9,
      duration: 2.2 + rng() * 0.9,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      size: 8 + rng() * 10,
    }));
  }, [serveId]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      role="status"
    >
      {confetti.map((piece, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="absolute top-0 block rounded-[3px]"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 0.55,
            backgroundColor: piece.color,
            ["--drift" as string]: `${piece.drift}px`,
            animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s forwards`,
          }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 p-3 sm:gap-4 sm:p-5">
        <p className="animate-float-up flex items-center gap-2 rounded-3xl bg-cocoa px-4 py-2 text-center font-display text-xl text-butter shadow-xl sm:px-5 sm:py-3 sm:text-3xl">
          {headline}
          {coins !== null && (
            <span className="flex items-center gap-1 rounded-full bg-butter px-2.5 py-1 font-body text-base font-black text-cocoa sm:text-xl">
              <CoinArt className="h-4 w-4 sm:h-5 sm:w-5" />
              +{coins}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
