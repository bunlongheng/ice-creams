/**
 * Pure state for one ice cream order. No React, no Three.js - so it is trivial
 * to test and the 3D scene can read it as a plain value.
 */
import {
  getVessel,
  isFlavorId,
  isStyleId,
  isToppingId,
  isVesselId,
  type StyleId,
  type VesselId,
} from "./catalog";

export const STEPS = ["style", "flavor", "vessel", "topping", "serve"] as const;
export type Step = (typeof STEPS)[number];

/** A soft swirl can be a single flavour or a two-flavour twist. */
export const MAX_SOFT_FLAVORS = 2;
/** No vessel holds more than this, whatever the catalog says. */
export const MAX_SCOOPS = 3;
/** Enough choice to feel generous, few enough to still render at 60fps. */
export const MAX_TOPPINGS = 6;

export interface Creation {
  style: StyleId | null;
  /** Bottom scoop first. For soft serve these are the twist colours. */
  flavors: string[];
  vessel: VesselId | null;
  toppings: string[];
  step: Step;
  /** Bumped on every serve so the celebration can replay. */
  servedCount: number;
}

export const emptyCreation = (): Creation => ({
  style: null,
  flavors: [],
  vessel: null,
  toppings: [],
  step: "style",
  servedCount: 0,
});

export type CreationAction =
  | { type: "setStyle"; id: string }
  | { type: "toggleFlavor"; id: string }
  | { type: "setVessel"; id: string }
  | { type: "toggleTopping"; id: string }
  | { type: "goToStep"; step: Step }
  | { type: "next" }
  | { type: "back" }
  | { type: "serve" }
  | { type: "startOver" };

/** How many flavours the current selection may hold. */
export function flavorCapacity(state: Creation): number {
  if (state.style === "soft") return MAX_SOFT_FLAVORS;
  const vessel = state.vessel ? getVessel(state.vessel) : undefined;
  return Math.min(vessel?.maxScoops ?? MAX_SCOOPS, MAX_SCOOPS);
}

/** A creation is servable once it has a style, a flavour and something to serve it in. */
export function isServable(state: Creation): boolean {
  return state.style !== null && state.flavors.length > 0 && state.vessel !== null;
}

const stepIndex = (step: Step) => STEPS.indexOf(step);

const clampStep = (index: number): Step => STEPS[Math.min(Math.max(index, 0), STEPS.length - 1)] ?? "style";

/**
 * Toggle a value in a list, capped at `max`. Selecting past the cap drops the
 * oldest pick so a toddler never hits a dead button.
 */
function toggleCapped(list: readonly string[], id: string, max: number): string[] {
  if (list.includes(id)) return list.filter((item) => item !== id);
  if (max <= 0) return [...list];
  return [...list, id].slice(-max);
}

export function creationReducer(state: Creation, action: CreationAction): Creation {
  switch (action.type) {
    case "setStyle": {
      if (!isStyleId(action.id)) return state;
      if (state.style === action.id) return { ...state, step: "flavor" };
      // Switching style changes what the flavours mean, so start the stack fresh.
      const next: Creation = { ...state, style: action.id, flavors: [], step: "flavor" };
      return next;
    }

    case "toggleFlavor": {
      if (!isFlavorId(action.id)) return state;
      return { ...state, flavors: toggleCapped(state.flavors, action.id, flavorCapacity(state)) };
    }

    case "setVessel": {
      if (!isVesselId(action.id)) return state;
      const next = { ...state, vessel: action.id, step: "topping" as Step };
      // A cake cone holds fewer scoops than a cup - trim from the bottom.
      return { ...next, flavors: next.flavors.slice(-flavorCapacity(next)) };
    }

    case "toggleTopping": {
      if (!isToppingId(action.id)) return state;
      return { ...state, toppings: toggleCapped(state.toppings, action.id, MAX_TOPPINGS) };
    }

    case "goToStep":
      return STEPS.includes(action.step) ? { ...state, step: action.step } : state;

    case "next":
      return { ...state, step: clampStep(stepIndex(state.step) + 1) };

    case "back":
      return { ...state, step: clampStep(stepIndex(state.step) - 1) };

    case "serve":
      if (!isServable(state)) return state;
      return { ...state, step: "serve", servedCount: state.servedCount + 1 };

    case "startOver":
      return { ...emptyCreation(), servedCount: state.servedCount };

    default:
      return state;
  }
}
