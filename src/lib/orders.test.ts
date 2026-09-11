import { describe, expect, it } from "vitest";
import { getFlavor, getVessel } from "./catalog";
import { creationReducer, emptyCreation, type Creation } from "./creation";
import {
  COINS_FOR_PERFECT,
  COINS_FOR_SERVING,
  QUEUE_SIZE,
  bestMatch,
  emptyOrderBook,
  makeOrder,
  ordersReducer,
  scoreOrder,
} from "./orders";

const built = (flavors: string[], vessel: string): Creation => ({
  ...emptyCreation(),
  style: "scoop",
  flavors,
  vessel: vessel as Creation["vessel"],
});

describe("orders", () => {
  it("only ever asks for flavours and containers that exist", () => {
    for (let id = 1; id <= 60; id++) {
      const order = makeOrder(id);
      expect(getFlavor(order.flavorId)).toBeDefined();
      expect(getVessel(order.vesselId)).toBeDefined();
    }
  });

  it("builds the same order for the same id, and different ones over time", () => {
    expect(makeOrder(7)).toEqual(makeOrder(7));
    const first20 = Array.from({ length: 20 }, (_, i) => makeOrder(i + 1));
    expect(new Set(first20.map((o) => `${o.flavorId}:${o.vesselId}`)).size).toBeGreaterThan(5);
  });

  it("starts with a full counter and no coins", () => {
    const book = emptyOrderBook();
    expect(book.queue).toHaveLength(QUEUE_SIZE);
    expect(book.coins).toBe(0);
    expect(book.lastReward).toBeNull();
  });

  it("pays the most when the flavour and the container both match", () => {
    const order = makeOrder(1);
    const perfect = scoreOrder(order, built([order.flavorId], order.vesselId));
    expect(perfect.coins).toBe(COINS_FOR_PERFECT);
    expect(perfect.flavorMatched).toBe(true);
    expect(perfect.vesselMatched).toBe(true);
  });

  it("still pays for a creation that matches nothing", () => {
    const book = emptyOrderBook();
    const reward = bestMatch(book.queue, built(["rocky-road"], "sundae"));
    expect(reward.coins).toBe(COINS_FOR_SERVING);
    expect(reward.orderId).toBeNull();
  });

  it("counts a flavour anywhere in the stack, not just the first scoop", () => {
    const order = makeOrder(2);
    const reward = scoreOrder(order, built(["coffee", "coconut", order.flavorId], order.vesselId));
    expect(reward.flavorMatched).toBe(true);
  });

  it("fills the best matching order and calls the next customer", () => {
    const book = emptyOrderBook();
    const target = book.queue[1];
    expect(target).toBeDefined();
    if (!target) return;

    const next = ordersReducer(book, { type: "serve", creation: built([target.flavorId], target.vesselId) });
    expect(next.coins).toBe(COINS_FOR_PERFECT);
    expect(next.queue).toHaveLength(QUEUE_SIZE);
    expect(next.queue.map((o) => o.id)).not.toContain(target.id);
    expect(next.lastReward?.orderId).toBe(target.id);
  });

  it("keeps the queue intact when nothing matched", () => {
    const book = emptyOrderBook();
    const next = ordersReducer(book, { type: "serve", creation: built(["rocky-road"], "sundae") });
    expect(next.queue).toEqual(book.queue);
    expect(next.coins).toBe(COINS_FOR_SERVING);
  });

  it("keeps adding up across a whole shift", () => {
    let book = emptyOrderBook();
    for (let i = 0; i < 10; i++) {
      const target = book.queue[0];
      if (!target) break;
      book = ordersReducer(book, { type: "serve", creation: built([target.flavorId], target.vesselId) });
    }
    expect(book.coins).toBe(COINS_FOR_PERFECT * 10);
    expect(book.queue).toHaveLength(QUEUE_SIZE);
    expect(new Set(book.queue.map((o) => o.id)).size).toBe(QUEUE_SIZE);
  });

  it("clears the till on reset", () => {
    const book = ordersReducer(emptyOrderBook(), { type: "serve", creation: built(["vanilla"], "cup") });
    expect(ordersReducer(book, { type: "reset" }).coins).toBe(0);
  });

  it("works with a creation straight out of the creation reducer", () => {
    const order = makeOrder(3);
    const creation = [
      { type: "setStyle", id: "scoop" },
      { type: "toggleFlavor", id: order.flavorId },
      { type: "setVessel", id: order.vesselId },
    ].reduce((state, action) => creationReducer(state, action as never), emptyCreation());

    expect(scoreOrder(order, creation).coins).toBe(COINS_FOR_PERFECT);
  });
});
