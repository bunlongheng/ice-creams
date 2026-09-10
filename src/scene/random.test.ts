import { describe, expect, it } from "vitest";
import { hashString, makeRng, noise3 } from "./random";

describe("deterministic helpers", () => {
  it("replays the same sprinkle scatter for the same seed", () => {
    const a = Array.from({ length: 5 }, makeRng(42));
    const b = Array.from({ length: 5 }, makeRng(42));
    expect(a).toEqual(b);
    expect(Array.from({ length: 5 }, makeRng(43))).not.toEqual(a);
  });

  it("keeps random values inside the unit range", () => {
    const rng = makeRng(7);
    for (let i = 0; i < 500; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("hashes an order to a stable unsigned number", () => {
    expect(hashString("soft:vanilla")).toBe(hashString("soft:vanilla"));
    expect(hashString("soft:vanilla")).not.toBe(hashString("soft:chocolate"));
    expect(hashString("soft:vanilla")).toBeGreaterThanOrEqual(0);
  });

  it("keeps scoop noise bounded so scoops never explode", () => {
    for (let i = 0; i < 300; i++) {
      const value = noise3(i * 0.37, i * 0.11, i * 0.73);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
