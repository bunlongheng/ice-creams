"use client";

import { useEffect, useMemo, useRef } from "react";
import { makeRng } from "@/lib/random";

const CONFETTI_COLORS = ["#FF6FA5", "#FFD25E", "#4FD0B6", "#7BC6FF", "#E8395B", "#FFFAF0"];

interface CelebrationProps {
  /** Changes on every serve so the overlay replays. */
  serveId: number;
  headline: string;
  onAgain: () => void;
}

/** The ta-da overlay: confetti rain, a big cheer, and one button back to play. */
export function Celebration({ serveId, headline, onAgain }: CelebrationProps) {
  const againRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    againRef.current?.focus();
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
        <p className="animate-float-up rounded-3xl bg-cocoa px-4 py-2 text-center font-display text-xl text-butter shadow-xl sm:px-5 sm:py-3 sm:text-3xl">
          {headline}
        </p>
        <button
          ref={againRef}
          type="button"
          onClick={onAgain}
          className="sticker pointer-events-auto animate-float-up bg-mint px-5 py-3 font-display text-lg text-cocoa sm:px-7 sm:py-4 sm:text-2xl"
        >
          Make another!
        </button>
      </div>
    </div>
  );
}
