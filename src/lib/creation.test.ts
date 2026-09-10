import { describe, expect, it } from "vitest";
import { FLAVORS, STYLES, TOPPINGS, VESSELS, getVessel } from "./catalog";
import {
  MAX_SOFT_FLAVORS,
  MAX_TOPPINGS,
  creationReducer,
  emptyCreation,
  flavorCapacity,
  isServable,
  reachableSteps,
  type Creation,
  type CreationAction,
} from "./creation";

const build = (...actions: CreationAction[]): Creation =>
  actions.reduce(creationReducer, emptyCreation());

describe("catalog", () => {
  it("has unique ids in every table", () => {
    for (const table of [STYLES, FLAVORS, VESSELS, TOPPINGS]) {
      const ids = table.map((row) => row.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("gives every flavour a colour and every vessel a scoop limit", () => {
    for (const flavor of FLAVORS) {
      expect(flavor.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(flavor.chunkColor).toMatch(/^#[0-9A-F]{6}$/i);
    }
    for (const vessel of VESSELS) expect(vessel.maxScoops).toBeGreaterThan(0);
  });
});

describe("creationReducer", () => {
  it("ignores ids that are not on the menu", () => {
    const state = build({ type: "setStyle", id: "milkshake" }, { type: "toggleFlavor", id: "motor-oil" });
    expect(state.style).toBeNull();
    expect(state.flavors).toEqual([]);
  });

  it("advances to the flavour step once a style is picked", () => {
    expect(build({ type: "setStyle", id: "soft" }).step).toBe("flavor");
  });

  it("clears the stack when the style changes", () => {
    const state = build(
      { type: "setStyle", id: "scoop" },
      { type: "toggleFlavor", id: "vanilla" },
      { type: "setStyle", id: "soft" },
    );
    expect(state.flavors).toEqual([]);
  });

  it("caps a soft swirl at a two-flavour twist, dropping the oldest pick", () => {
    const state = build(
      { type: "setStyle", id: "soft" },
      { type: "toggleFlavor", id: "vanilla" },
      { type: "toggleFlavor", id: "chocolate" },
      { type: "toggleFlavor", id: "mango" },
    );
    expect(state.flavors).toHaveLength(MAX_SOFT_FLAVORS);
    expect(state.flavors).toEqual(["chocolate", "mango"]);
  });

  it("toggles a flavour off when it is picked twice", () => {
    const state = build(
      { type: "setStyle", id: "scoop" },
      { type: "toggleFlavor", id: "vanilla" },
      { type: "toggleFlavor", id: "vanilla" },
    );
    expect(state.flavors).toEqual([]);
  });

  it("trims the stack to what the chosen vessel can hold", () => {
    const state = build(
      { type: "setStyle", id: "scoop" },
      { type: "toggleFlavor", id: "vanilla" },
      { type: "toggleFlavor", id: "chocolate" },
      { type: "toggleFlavor", id: "mango" },
      { type: "setVessel", id: "cake-cone" },
    );
    expect(state.flavors).toEqual(["chocolate", "mango"]);
    expect(state.flavors).toHaveLength(getVessel("cake-cone")?.maxScoops ?? 0);
    expect(flavorCapacity(state)).toBe(2);
  });

  it("caps toppings so the scene stays light", () => {
    const state = TOPPINGS.reduce(
      (current, topping) => creationReducer(current, { type: "toggleTopping", id: topping.id }),
      emptyCreation(),
    );
    expect(state.toppings).toHaveLength(MAX_TOPPINGS);
  });

  it("only serves a complete order", () => {
    const incomplete = build({ type: "setStyle", id: "soft" }, { type: "serve" });
    expect(incomplete.step).not.toBe("serve");
    expect(isServable(incomplete)).toBe(false);

    const complete = build(
      { type: "setStyle", id: "soft" },
      { type: "toggleFlavor", id: "vanilla" },
      { type: "setVessel", id: "waffle-cone" },
      { type: "serve" },
    );
    expect(complete.step).toBe("serve");
    expect(complete.servedCount).toBe(1);
  });

  it("keeps the serve count when starting over so celebrations stay unique", () => {
    const state = build(
      { type: "setStyle", id: "soft" },
      { type: "toggleFlavor", id: "vanilla" },
      { type: "setVessel", id: "cup" },
      { type: "serve" },
      { type: "startOver" },
    );
    expect(state).toMatchObject({ style: null, flavors: [], vessel: null, toppings: [], step: "style" });
    expect(state.servedCount).toBe(1);
  });

  it("only offers steps the child has already answered", () => {
    expect(reachableSteps(emptyCreation())).toEqual(["style"]);
    expect(reachableSteps(build({ type: "setStyle", id: "soft" }))).toEqual(["style", "flavor"]);

    const ready = build(
      { type: "setStyle", id: "soft" },
      { type: "toggleFlavor", id: "vanilla" },
      { type: "setVessel", id: "cup" },
    );
    expect(reachableSteps(ready)).toEqual(["style", "flavor", "vessel", "topping"]);

    // Taking the flavour back off closes the topping step again - otherwise the
    // child could reach a step whose Serve button can never light up.
    const emptied = creationReducer(ready, { type: "toggleFlavor", id: "vanilla" });
    expect(reachableSteps(emptied)).toEqual(["style", "flavor"]);
  });

  it("treats resetting an untouched order as a no-op", () => {
    const empty = emptyCreation();
    expect(creationReducer(empty, { type: "startOver" })).toBe(empty);
  });

  it("keeps the flavour array stable when the same vessel is picked again", () => {
    const built = build(
      { type: "setStyle", id: "scoop" },
      { type: "toggleFlavor", id: "vanilla" },
      { type: "setVessel", id: "cup" },
    );
    expect(creationReducer(built, { type: "setVessel", id: "cup" }).flavors).toBe(built.flavors);
  });

  it("keeps the flavour and topping arrays stable when only the step changes", () => {
    const built = build(
      { type: "setStyle", id: "scoop" },
      { type: "toggleFlavor", id: "vanilla" },
      { type: "setVessel", id: "cup" },
      { type: "toggleTopping", id: "cherry" },
    );
    const stepped = creationReducer(creationReducer(built, { type: "back" }), { type: "next" });

    // The 3D scene keys its rebuild on these references - see IceCreamCanvas.
    expect(stepped.flavors).toBe(built.flavors);
    expect(stepped.toppings).toBe(built.toppings);
  });

  it("never walks past either end of the step list", () => {
    expect(build({ type: "back" }).step).toBe("style");
    const forward = Array.from({ length: 9 }, () => ({ type: "next" }) as const);
    expect(build(...forward).step).toBe("serve");
  });
});
