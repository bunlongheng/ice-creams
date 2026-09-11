"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { FLAVORS, STYLES, TOPPINGS, getFlavor, getStyle, getVessel, vesselsForStyle } from "@/lib/catalog";
import {
  creationReducer,
  emptyCreation,
  isServable,
  reachableSteps,
  type CreationAction,
  type Step,
} from "@/lib/creation";
import { bestMatch, emptyOrderBook, ordersReducer } from "@/lib/orders";
import { sounds, type SoundName } from "@/lib/sound";
import {
  ChalkboardArt,
  CoinArt,
  FlavorArt,
  PlantArt,
  ScoopsArt,
  SoftServeArt,
  ToppingArt,
  VesselArt,
} from "@/components/ui/Art";
import { Celebration } from "@/components/ui/Celebration";
import { ChoiceGrid, type Choice } from "@/components/ui/ChoiceGrid";
import { CoinCounter } from "@/components/ui/CoinCounter";
import { OrderTickets } from "@/components/ui/OrderTickets";
import { StepBar } from "@/components/ui/StepBar";

// Three.js only runs in the browser, and it is by far the heaviest chunk.
const IceCreamCanvas = dynamic(
  () => import("@/components/scene/IceCreamCanvas").then((module) => module.IceCreamCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <span className="animate-wobble font-display text-2xl text-cocoa/80">Scooping...</span>
      </div>
    ),
  },
);

const STEP_TITLES: Record<Step, string> = {
  style: "Swirl or scoops?",
  flavor: "Pick your flavours!",
  vessel: "What should it go in?",
  topping: "Add the fun stuff!",
  serve: "Order up!",
};

/**
 * How long a control ignores taps after the screen moves. Long enough to swallow
 * the second half of a toddler's double tap (80 to 200ms), short enough that a
 * deliberate new tap still lands.
 */
const STEP_GUARD_MS = 300;
/** The ta-da is the reward - hold it long enough to be seen. */
const SERVE_GUARD_MS = 1200;
/** How long the celebration plays before the counter clears itself. */
const CELEBRATION_MS = 2600;

const CHEERS = ["Yay! Thank you!", "Yummy! You are the best!", "Wow, that is beautiful!", "My favourite ever!"];
/** Said when the serve filled the order the customer actually asked for. */
const PERFECT_CHEERS = ["That is exactly it!", "My order! Thank you!", "Just what I wanted!"];

export function Shop() {
  const [creation, dispatch] = useReducer(creationReducer, undefined, emptyCreation);
  const [orders, dispatchOrders] = useReducer(ordersReducer, undefined, () => emptyOrderBook());
  /**
   * The counter's clock. It starts at 0 so the server and the browser render
   * the same first frame - every order clamps to "just arrived" at that value -
   * and the first tick after mount switches it to the real time. It only runs
   * while the tab is visible, so putting the iPad down does not empty the shop
   * while she is not looking.
   */
  const [now, setNow] = useState(0);
  const muted = useSyncExternalStore(sounds.subscribe, sounds.isMuted, sounds.isMutedOnServer);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastStep = useRef(creation.step);
  /**
   * A toddler taps twice in the time the screen takes to change. Everything that
   * moves the screen sets a short guard, synchronously at dispatch time, so the
   * second tap cannot hit whatever slid under the finger - and the serve sets a
   * longer one, because the ta-da is the reward and should not be tappable away.
   */
  const guardUntil = useRef(0);
  const coinTimer = useRef(0);
  const resetTimer = useRef(0);
  const guard = (ms: number) => {
    guardUntil.current = Date.now() + ms;
  };
  const settled = () => Date.now() >= guardUntil.current;

  useEffect(
    () => () => {
      window.clearTimeout(coinTimer.current);
      window.clearTimeout(resetTimer.current);
    },
    [],
  );

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      if (document.hidden) return;
      const stamp = Date.now();
      setNow(stamp);
      dispatchOrders({ type: "tick", now: stamp });
    };
    const start = () => {
      window.clearInterval(timer);
      // Patience is measured in minutes, so once a second is plenty.
      timer = window.setInterval(tick, 1000);
      tick();
    };
    const onVisibility = () => (document.hidden ? window.clearInterval(timer) : start());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Each step swaps the whole grid, so send focus (and the screen reader) to the
  // new question instead of dropping focus on the unmounted button. Not on first
  // paint, and not on serve - the celebration takes focus there.
  useEffect(() => {
    const changed = lastStep.current !== creation.step;
    lastStep.current = creation.step;
    if (changed && creation.step !== "serve") headingRef.current?.focus();
  }, [creation.step]);

  /**
   * Guard, play the sound, dispatch - the one path every control takes.
   * Returns whether the tap actually got through, which the till needs to know.
   */
  const act = useCallback((action: CreationAction, sound: SoundName, guardMs = STEP_GUARD_MS): boolean => {
    if (!settled()) return false;
    guard(guardMs);
    sounds.play(sound);
    dispatch(action);
    return true;
  }, []);

  const pick = useCallback((action: CreationAction) => act(action, "pick"), [act]);

  const toggleMuted = useCallback(() => {
    sounds.setMuted(!sounds.isMuted());
    sounds.play("pick");
  }, []);

  const choose = useCallback(
    (step: Step, id: string) => {
      switch (step) {
        case "style":
          return act({ type: "setStyle", id }, "scoop");
        case "flavor":
          // Toggling a flavour leaves the grid in place, so no guard is needed.
          return act({ type: "toggleFlavor", id }, "scoop", 0);
        case "vessel":
          return act({ type: "setVessel", id }, "pick");
        case "topping": {
          const kind = TOPPINGS.find((topping) => topping.id === id)?.kind;
          return act({ type: "toggleTopping", id }, kind === "sauce" ? "pour" : "sprinkle", 0);
        }
        default:
          return;
      }
    },
    [act],
  );

  // The serve guard is long enough to watch the confetti before the screen
  // responds again - the ta-da is the reward, it should not be tappable away.
  const serve = useCallback(() => {
    if (!isServable(creation)) return;
    // Only ring the till if the guard actually let the serve through, or a
    // double tap would pay for the same ice cream twice.
    if (!act({ type: "serve" }, "serve", SERVE_GUARD_MS)) return;
    dispatchOrders({ type: "serve", creation, now: Date.now() });
    // The coins land a beat after the fanfare, so both are audible.
    coinTimer.current = window.setTimeout(() => sounds.play("coin"), 420);
    // Then the counter clears itself and the next order starts - a two-year-old
    // should not have to find a button to keep playing.
    resetTimer.current = window.setTimeout(() => dispatch({ type: "startOver" }), CELEBRATION_MS);
  }, [act, creation]);
  const startOver = useCallback(() => act({ type: "startOver" }, "reset"), [act]);

  const styleChoices = useMemo<Choice[]>(
    () =>
      STYLES.map((style) => ({
        id: style.id,
        label: style.name,
        art: style.id === "soft" ? <SoftServeArt /> : <ScoopsArt />,
      })),
    [],
  );

  const flavorChoices = useMemo<Choice[]>(
    () => FLAVORS.map((flavor) => ({ id: flavor.id, label: flavor.name, art: <FlavorArt flavor={flavor} /> })),
    [],
  );

  // Some vessels only take one style - a swirl cannot go in an egg carton.
  const vesselChoices = useMemo<Choice[]>(
    () =>
      vesselsForStyle(creation.style).map((vessel) => ({
        id: vessel.id,
        label: vessel.name,
        art: <VesselArt id={vessel.id} />,
      })),
    [creation.style],
  );

  const toppingChoices = useMemo<Choice[]>(
    () => TOPPINGS.map((topping) => ({ id: topping.id, label: topping.name, art: <ToppingArt topping={topping} /> })),
    [],
  );

  const served = creation.step === "serve";
  /** What the creation on the counter would earn right now. */
  const pending = useMemo(() => bestMatch(orders.queue, creation, now), [orders.queue, creation, now]);
  const reward = orders.lastReward;
  const canServe = isServable(creation);
  const reachable = reachableSteps(creation);

  const customerLine = useMemo(() => {
    if (served) {
      if (reward && reward.tip > 0) return "So fast! Keep the change!";
      if (reward?.orderId !== null && reward?.flavorMatched && reward?.vesselMatched) {
        return PERFECT_CHEERS[creation.servedCount % PERFECT_CHEERS.length] ?? PERFECT_CHEERS[0];
      }
      return CHEERS[creation.servedCount % CHEERS.length] ?? CHEERS[0];
    }
    if (creation.toppings.length > 0) return "Ooh, sprinkles! Yes please!";
    if (creation.vessel) return `A ${getVessel(creation.vessel)?.name.toLowerCase()}, perfect!`;
    if (creation.flavors.length > 0) {
      const last = getFlavor(creation.flavors[creation.flavors.length - 1] ?? "");
      return last ? `Mmm, ${last.name.toLowerCase()}!` : "Yum!";
    }
    if (creation.style) return getStyle(creation.style)?.cheer ?? "Yum!";
    return "Hi! Can I have an ice cream?";
  }, [served, reward, creation.servedCount, creation.toppings.length, creation.vessel, creation.flavors, creation.style]);

  return (
    <div className="shop-shell mx-auto flex h-dvh w-full max-w-[1400px] flex-col gap-3 overflow-hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-4 sm:p-5">
      <ShopSign
        muted={muted}
        coins={orders.coins}
        reward={served && reward ? reward.coins : null}
        rewardKey={creation.servedCount}
        onToggleMuted={toggleMuted}
      />

      <main
        className={`grid min-h-0 flex-1 gap-3 sm:gap-4 sm:landscape:grid-cols-[minmax(0,1fr)_minmax(320px,42%)] sm:landscape:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:grid-rows-1 ${
          served ? "grid-rows-1" : "grid-rows-[minmax(180px,40%)_minmax(0,1fr)]"
        }`}
      >
        <section
          aria-label="Your ice cream"
          className="relative min-h-0 overflow-hidden rounded-[2rem] border-4 border-cocoa/10 bg-gradient-to-b from-vanilla to-[#FFE9D2] shadow-[inset_0_-30px_60px_-30px_rgba(74,44,42,0.35)] sm:rounded-[2.5rem]"
        >
          <IceCreamCanvas creation={creation} />

          {/* The order rail runs down the left; the customer waits on the right. */}
          <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4 sm:gap-3">
            <OrderTickets
              orders={orders.queue}
              now={now}
              wantedFlavors={creation.flavors}
              wantedVessel={creation.vessel}
              wantedToppings={creation.toppings}
            />

            <div className="flex min-w-0 items-end gap-1.5 sm:gap-2">
              <p
                key={customerLine}
                className="shop-bubble animate-pop-in line-clamp-2 max-w-[6.5rem] min-w-0 rounded-2xl rounded-br-sm bg-vanilla px-2 py-1.5 text-right text-[11px] leading-tight font-bold shadow-md sm:max-w-[13rem] sm:px-3 sm:py-2 sm:text-sm"
              >
                {customerLine}
              </p>
              <Image
                src="/mila.png"
                alt="Mila"
                width={64}
                height={64}
                priority
                className={`shop-customer w-10 shrink-0 rounded-full shadow-md sm:w-16 ${served ? "animate-wobble" : ""}`}
              />
            </div>
          </div>

          {/* The corners of the counter: a plant and the chalkboard, like the sign. */}
          <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1 block w-14 sm:bottom-2 sm:left-3 sm:w-24">
            <PlantArt />
          </span>
          <span aria-hidden="true" className="pointer-events-none absolute right-1 bottom-1 block w-14 sm:right-3 sm:bottom-2 sm:w-24">
            <ChalkboardArt />
          </span>

          {served && (
            <Celebration
              serveId={creation.servedCount}
              headline={STEP_TITLES.serve}
              coins={reward?.coins ?? null}
            />
          )}
        </section>

        <section
          aria-label="Build your order"
          className={`flex min-h-0 flex-col gap-3 rounded-[2rem] bg-vanilla/70 p-3 shadow-lg backdrop-blur-sm sm:gap-4 sm:rounded-[2.5rem] sm:p-4 ${
            // Two-column layouts keep the panel; single-column ones give the
            // whole screen to the celebration.
            served ? "max-lg:portrait:hidden max-sm:hidden" : ""
          }`}
        >
          <StepBar
            current={creation.step === "serve" ? "topping" : creation.step}
            reachable={reachable}
            onGoTo={(step) => pick({ type: "goToStep", step })}
          />

          {/* Focusing the heading is what announces the new step - an extra
              live region would read it a second time. */}
          {/* Focus moves here so the new question is announced. It is not a tab
              stop, so it shows no ring - a box around the title on every step
              would just look broken to everyone using touch. */}
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-xl leading-tight text-cocoa outline-none sm:text-2xl"
          >
            {STEP_TITLES[creation.step]}
          </h2>

          {/* Selected cards tilt and carry a ring, so give them room sideways
              and never let that turn into a horizontal scrollbar. */}
          <div className="shop-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-2">
            {creation.step === "style" && (
              <ChoiceGrid label="Ice cream style" choices={styleChoices} selected={creation.style ? [creation.style] : []} onChoose={(id) => choose("style", id)} columns="wide" />
            )}
            {creation.step === "flavor" && (
              <ChoiceGrid label="Flavours" choices={flavorChoices} selected={creation.flavors} onChoose={(id) => choose("flavor", id)} />
            )}
            {creation.step === "vessel" && (
              <ChoiceGrid label="Serve it in" choices={vesselChoices} selected={creation.vessel ? [creation.vessel] : []} onChoose={(id) => choose("vessel", id)} columns="wide" />
            )}
            {(creation.step === "topping" || creation.step === "serve") && (
              <ChoiceGrid label="Toppings" choices={toppingChoices} selected={creation.toppings} onChoose={(id) => choose("topping", id)} />
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {creation.step !== "style" && !served && (
              <button
                type="button"
                onClick={() => pick({ type: "back" })}
                className="sticker flex h-16 w-16 shrink-0 items-center justify-center bg-vanilla"
                aria-label="Go back a step"
              >
                <Chevron direction="left" className="h-7 w-7" />
              </button>
            )}

            {creation.step === "flavor" && creation.flavors.length > 0 && (
              <NextButton onClick={() => pick({ type: "next" })} />
            )}

            {/* Serve only appears once there is something to serve - the
                container step now comes before any flavour is picked. */}
            {(creation.step === "topping" || creation.step === "serve") && (
              <button
                type="button"
                onClick={served ? startOver : serve}
                disabled={!canServe}
                className="sticker flex h-16 flex-1 items-center justify-center gap-2 bg-strawberry font-display text-2xl text-cocoa disabled:cursor-not-allowed disabled:opacity-40 sm:h-20 sm:text-3xl"
              >
                {served ? (
                  "Start over"
                ) : (
                  <>
                    Serve!
                    {canServe && (
                      // Shows what this creation is worth before she taps, which
                      // is how the coins connect to the orders on the counter.
                      <span className="flex items-center gap-1 rounded-full bg-cocoa px-2.5 py-1 font-body text-base font-black text-butter sm:text-lg">
                        <CoinArt className="h-4 w-4 sm:h-5 sm:w-5" />
                        +{pending.coins}
                      </span>
                    )}
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Chevron({ direction, className }: { direction: "left" | "right"; className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NextButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sticker flex h-16 flex-1 items-center justify-center gap-2 bg-mint font-display text-xl text-cocoa sm:h-20 sm:text-2xl"
    >
      Next
      <Chevron direction="right" className="h-6 w-6" />
    </button>
  );
}

function ShopSign({
  muted,
  coins,
  reward,
  rewardKey,
  onToggleMuted,
}: {
  muted: boolean;
  coins: number;
  reward: number | null;
  rewardKey: number;
  onToggleMuted: () => void;
}) {
  return (
    <header className="shop-header relative flex shrink-0 items-center justify-between gap-3 rounded-[1.5rem] px-3 pt-3 pb-4 sm:rounded-[2rem] sm:px-5 sm:pt-4 sm:pb-5">
      <div className="awning shop-awning absolute inset-x-0 top-0 -z-10 h-14 rounded-t-[1.5rem] shadow-lg sm:h-16 sm:rounded-t-[2rem]" aria-hidden="true" />
      <h1 className="shop-title rounded-2xl bg-cocoa px-3 py-2 font-display text-base leading-tight text-butter shadow-[0_5px_0_rgba(74,44,42,0.35)] sm:px-5 sm:py-3 sm:text-2xl lg:text-3xl">
        Mila&apos;s Ice Cream Shop
      </h1>
      <div className="flex items-center gap-2">
        <CoinCounter coins={coins} reward={reward} rewardKey={rewardKey} />
        <button
          type="button"
          onClick={onToggleMuted}
          className="sticker shop-icon-button flex h-12 w-12 items-center justify-center rounded-2xl bg-vanilla sm:h-14 sm:w-14"
          aria-label={muted ? "Turn sounds on" : "Turn sounds off"}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
            {muted ? (
              <path d="M17 9l4 6M21 9l-4 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            ) : (
              <path d="M17 8.5a5 5 0 010 7M19.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}
