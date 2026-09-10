import { describe, expect, it } from "vitest";
import { getFlavor } from "@/lib/catalog";
import { candyMaterial, iceCreamMaterial, sauceMaterial } from "./materials";

/**
 * Materials are shared on purpose: disposing one throws away its compiled shader
 * program, so a per-rebuild material would recompile shaders on every tap.
 * These tests are the guard against someone "cleaning that up".
 */
// Textured materials (cones, swirl and speckle flavours) draw on a canvas, so
// this file sticks to the recipes that do not need a DOM.
describe("material cache", () => {
  it("returns the same instance for the same recipe", () => {
    const chocolate = getFlavor("chocolate");
    expect(chocolate).toBeDefined();
    if (!chocolate) return;

    expect(iceCreamMaterial(chocolate)).toBe(iceCreamMaterial(chocolate));
    expect(candyMaterial("#ff0000")).toBe(candyMaterial("#ff0000"));
    expect(sauceMaterial("#4B2415")).toBe(sauceMaterial("#4B2415"));
  });

  it("keeps different recipes apart", () => {
    expect(candyMaterial("#ff0000")).not.toBe(candyMaterial("#00ff00"));
    expect(candyMaterial("#ff0000", true)).not.toBe(candyMaterial("#ff0000", false));
  });

  it("gives ice cream a clear coat so it reads as frozen, not plastic", () => {
    const strawberry = getFlavor("strawberry");
    expect(strawberry).toBeDefined();
    if (!strawberry) return;

    const material = iceCreamMaterial(strawberry);
    expect(material.clearcoat).toBeGreaterThan(0);
    expect(material.metalness).toBe(0);
  });
});
