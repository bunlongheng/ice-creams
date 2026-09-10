"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useReducer, useSyncExternalStore } from "react";
import { FLAVORS, STYLES, TOPPINGS, VESSELS, getFlavor, getStyle, getVessel } from "@/lib/catalog";
import { creationReducer, emptyCreation, isServable, type Step } from "@/lib/creation";
import { sounds } from "@/lib/sound";
import { CustomerArt, FlavorArt, ScoopsArt, SoftServeArt, ToppingArt, VesselArt } from "@/components/ui/Art";
import { Celebration } from "@/components/ui/Celebration";
import { ChoiceGrid, type Choice } from "@/components/ui/ChoiceGrid";
import { StepBar } from "@/components/ui/StepBar";

// Three.js only runs in the browser, and it is by far the heaviest chunk.
const IceCreamCanvas = dynamic(
  () => import("@/components/scene/IceCreamCanvas").then((module) => module.IceCreamCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <span className="animate-wobble font-display text-2xl text-cocoa/50">Scooping...</span>
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

const CHEERS = ["Yay! Thank you!", "Yummy! You are the best!", "Wow, that is beautiful!", "My favourite ever!"];

export function Shop() {
  const [creation, dispatch] = useReducer(creationReducer, undefined, emptyCreation);
  const muted = useSyncExternalStore(sounds.subscribe, sounds.isMuted, sounds.isMutedOnServer);

  const toggleMuted = useCallback(() => {
    sounds.setMuted(!sounds.isMuted());
    sounds.play("pick");
  }, []);

  const choose = useCallback((step: Step, id: string) => {
    switch (step) {
      case "style":
        sounds.play("scoop");
        dispatch({ type: "setStyle", id });
        break;
      case "flavor":
        sounds.play("scoop");
        dispatch({ type: "toggleFlavor", id });
        break;
      case "vessel":
        sounds.play("pick");
        dispatch({ type: "setVessel", id });
        break;
      case "topping": {
        const kind = TOPPINGS.find((topping) => topping.id === id)?.kind;
        sounds.play(kind === "sauce" ? "pour" : "sprinkle");
        dispatch({ type: "toggleTopping", id });
        break;
      }
      default:
        break;
    }
  }, []);

  const serve = useCallback(() => {
    sounds.play("serve");
    dispatch({ type: "serve" });
  }, []);

  const startOver = useCallback(() => {
    sounds.play("reset");
    dispatch({ type: "startOver" });
  }, []);

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

  const vesselChoices = useMemo<Choice[]>(
    () => VESSELS.map((vessel) => ({ id: vessel.id, label: vessel.name, art: <VesselArt id={vessel.id} /> })),
    [],
  );

  const toppingChoices = useMemo<Choice[]>(
    () => TOPPINGS.map((topping) => ({ id: topping.id, label: topping.name, art: <ToppingArt topping={topping} /> })),
    [],
  );

  const served = creation.step === "serve";
  const canServe = isServable(creation);
  const reachable = useMemo<Step[]>(() => {
    const steps: Step[] = ["style"];
    if (creation.style) steps.push("flavor");
    if (creation.flavors.length > 0) steps.push("vessel");
    if (creation.vessel) steps.push("topping");
    return steps;
  }, [creation.style, creation.flavors.length, creation.vessel]);

  const customerLine = useMemo(() => {
    if (served) return CHEERS[creation.servedCount % CHEERS.length] ?? CHEERS[0];
    if (creation.toppings.length > 0) return "Ooh, sprinkles! Yes please!";
    if (creation.vessel) return `A ${getVessel(creation.vessel)?.name.toLowerCase()}, perfect!`;
    if (creation.flavors.length > 0) {
      const last = getFlavor(creation.flavors[creation.flavors.length - 1] ?? "");
      return last ? `Mmm, ${last.name.toLowerCase()}!` : "Yum!";
    }
    if (creation.style) return getStyle(creation.style)?.cheer ?? "Yum!";
    return "Hi! Can I have an ice cream?";
  }, [served, creation.servedCount, creation.toppings.length, creation.vessel, creation.flavors, creation.style]);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[1400px] flex-col gap-3 overflow-hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-4 sm:p-5">
      <ShopSign muted={muted} onToggleMuted={toggleMuted} onStartOver={startOver} />

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

          <div className="pointer-events-none absolute top-3 left-3 flex items-end gap-2 sm:top-4 sm:left-4">
            <span className="block w-12 shrink-0 sm:w-16">
              <CustomerArt happy={served} />
            </span>
            <p
              key={customerLine}
              className="animate-pop-in max-w-[13rem] rounded-2xl rounded-bl-sm bg-vanilla px-3 py-2 text-xs font-bold shadow-md sm:text-sm"
            >
              {customerLine}
            </p>
          </div>

          {served && (
            <Celebration
              serveId={creation.servedCount}
              headline={STEP_TITLES.serve}
              onAgain={startOver}
            />
          )}
        </section>

        <section
          aria-label="Build your order"
          className={`flex min-h-0 flex-col gap-3 rounded-[2rem] bg-vanilla/70 p-3 shadow-lg backdrop-blur-sm sm:gap-4 sm:rounded-[2.5rem] sm:p-4 ${
            served ? "max-lg:portrait:hidden" : ""
          }`}
        >
          <StepBar
            current={creation.step === "serve" ? "topping" : creation.step}
            reachable={reachable}
            onGoTo={(step) => {
              sounds.play("pick");
              dispatch({ type: "goToStep", step });
            }}
          />

          <h2 className="font-display text-xl leading-tight text-cocoa sm:text-2xl">
            {STEP_TITLES[creation.step]}
          </h2>

          <div className="min-h-0 flex-1 overflow-y-auto pb-1">
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
                onClick={() => {
                  sounds.play("pick");
                  dispatch({ type: "back" });
                }}
                className="sticker flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center bg-vanilla"
                aria-label="Go back a step"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            {creation.step === "flavor" && creation.flavors.length > 0 && (
              <NextButton
                onClick={() => {
                  sounds.play("pick");
                  dispatch({ type: "next" });
                }}
              />
            )}

            {(creation.step === "topping" || creation.step === "serve" || creation.step === "vessel") && (
              <button
                type="button"
                onClick={served ? startOver : serve}
                disabled={!canServe}
                className="sticker flex h-16 flex-1 cursor-pointer items-center justify-center gap-2 bg-strawberry font-display text-2xl text-vanilla disabled:cursor-not-allowed disabled:opacity-40 sm:h-20 sm:text-3xl"
              >
                {served ? "Start over" : "Serve!"}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function NextButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sticker flex h-16 flex-1 cursor-pointer items-center justify-center gap-2 bg-mint font-display text-xl text-cocoa sm:h-20 sm:text-2xl"
    >
      Next
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function ShopSign({
  muted,
  onToggleMuted,
  onStartOver,
}: {
  muted: boolean;
  onToggleMuted: () => void;
  onStartOver: () => void;
}) {
  return (
    <header className="relative flex shrink-0 items-center justify-between gap-3 rounded-[1.5rem] px-3 pt-3 pb-4 sm:rounded-[2rem] sm:px-5 sm:pt-4 sm:pb-5">
      <div className="awning absolute inset-x-0 top-0 -z-10 h-14 rounded-t-[1.5rem] shadow-lg sm:h-16 sm:rounded-t-[2rem]" aria-hidden="true" />
      <h1 className="rounded-2xl bg-cocoa px-4 py-2 font-display text-xl text-butter shadow-[0_5px_0_rgba(74,44,42,0.35)] sm:px-6 sm:py-3 sm:text-3xl">
        Ice Creams
      </h1>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMuted}
          aria-pressed={muted}
          className="sticker flex h-12 w-12 cursor-pointer items-center justify-center bg-vanilla sm:h-14 sm:w-14"
          style={{ borderRadius: "1rem" }}
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
        <button
          type="button"
          onClick={onStartOver}
          className="sticker flex h-12 w-12 cursor-pointer items-center justify-center bg-vanilla sm:h-14 sm:w-14"
          style={{ borderRadius: "1rem" }}
          aria-label="Start a new order"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path d="M20 12a8 8 0 11-2.6-5.9M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
