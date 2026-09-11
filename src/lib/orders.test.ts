import { describe, expect, it } from "vitest";
import { getFlavor, getVessel } from "./catalog";
import { creationReducer, emptyCreation, type Creation } from "./creation";
import {
  ARRIVAL_EVERY_MS,
  CALM_MS,
  COINS_FOR_FLAVOR,
  COINS_FOR_SERVING,
  COINS_FOR_TOPPING,
  COINS_FOR_VESSEL,
  PATIENCE_MS,
  QUEUE_SIZE,
  bestMatch,
  emptyOrderBook,
  makeOrder,
  orderStage,
  ordersReducer,
  scoreOrder,
  orderSize,
  secondsLeft,
  tipFor,
  type Order,
} from "./orders";

/** A fixed clock keeps these tests away from the wall clock. */
const T0 = 1_700_000_000_000;

const built = (flavors: string[], vessel: string, toppings: string[] = []): Creation => ({
  ...emptyCreation(),
  style: "scoop",
  flavors,
  vessel: vessel as Creation["vessel"],
  toppings,
});

/** Exactly what one ticket asked for, nothing more. */
const fill = (order: Order): Creation => built([...order.flavorIds], order.vesselId, order.toppingIds);

/** What that ticket pays when filled instantly. */
const perfectCoins = (order: Order): number =>
  COINS_FOR_SERVING +
  order.flavorIds.length * COINS_FOR_FLAVOR +
  COINS_FOR_VESSEL +
  order.toppingIds.length * COINS_FOR_TOPPING +
  tipFor(0);

describe("orders", () => {
  it("only ever asks for flavours and containers that exist", () => {
    for (let id = 1; id <= 60; id++) {
      const order = makeOrder(id, T0);
      for (const id of order.flavorIds) expect(getFlavor(id)).toBeDefined();
      expect(getVessel(order.vesselId)).toBeDefined();
    }
  });

  it("builds the same order for the same id, and different ones over time", () => {
    expect(makeOrder(7, T0)).toEqual(makeOrder(7, T0));
    const first20 = Array.from({ length: 20 }, (_, i) => makeOrder(i + 1, T0));
    expect(new Set(first20.map((o) => `${o.flavorIds.join("+")}:${o.vesselId}`)).size).toBeGreaterThan(5);
  });

  it("opens with one customer, not a crowd", () => {
    const book = emptyOrderBook(T0);
    expect(book.queue).toHaveLength(1);
    expect(book.coins).toBe(0);
    expect(book.lastReward).toBeNull();
  });

  it("lets a new customer in once a minute and never crowds the counter", () => {
    let book = emptyOrderBook(T0);
    // Nothing happens before the minute is up.
    expect(ordersReducer(book, { type: "tick", now: T0 + ARRIVAL_EVERY_MS - 1 })).toBe(book);

    book = ordersReducer(book, { type: "tick", now: T0 + ARRIVAL_EVERY_MS });
    expect(book.queue).toHaveLength(2);

    // Left alone for ten minutes with nothing served, the rail stays small:
    // customers arrive every minute but only wait two, so it settles at two.
    let busiest = book.queue.length;
    for (let minute = 2; minute <= 10; minute++) {
      book = ordersReducer(book, { type: "tick", now: T0 + ARRIVAL_EVERY_MS * minute });
      busiest = Math.max(busiest, book.queue.length);
    }
    expect(busiest).toBeLessThanOrEqual(QUEUE_SIZE);
    expect(book.queue.length).toBeLessThanOrEqual(2);
  });

  it("pays the most when the whole ticket is filled", () => {
    const order = makeOrder(1, T0);
    const perfect = scoreOrder(order, fill(order), T0);
    expect(perfect.coins).toBe(perfectCoins(order));
    expect(perfect.tip).toBe(tipFor(0));
    expect(perfect.complete).toBe(true);
    expect(perfect.toppingsMatched).toBe(order.toppingIds.length);
  });

  it("asks for two things most of the time, three sometimes, four rarely", () => {
    // Containers with wells ask for a flavour per well - measure the ordinary tickets.
    const sizes = Array.from({ length: 400 }, (_, i) => makeOrder(i + 1, T0))
      .filter((o) => o.flavorIds.length === 1)
      .map(orderSize);
    const share = (n: number) => sizes.filter((s) => s === n).length / sizes.length;

    expect(new Set(sizes)).toEqual(new Set([2, 3, 4]));
    expect(share(2)).toBeGreaterThan(share(3));
    expect(share(3)).toBeGreaterThan(share(4));
    expect(share(2)).toBeGreaterThan(0.4);
    expect(share(4)).toBeLessThan(0.2);
  });

  it("pays for each topping the ticket asked for, but only tips a full fill", () => {
    const withTopping = Array.from({ length: 60 }, (_, i) => makeOrder(i + 1, T0)).find(
      (o) => o.toppingIds.length > 0 && o.flavorIds.length === 1,
    );
    expect(withTopping).toBeDefined();
    if (!withTopping) return;

    // Flavour and container right, topping missing: paid, but no tip.
    const partial = scoreOrder(withTopping, built([...withTopping.flavorIds], withTopping.vesselId), T0);
    expect(partial.complete).toBe(false);
    expect(partial.tip).toBe(0);
    expect(partial.coins).toBe(perfectCoins(withTopping) - tipFor(0) - withTopping.toppingIds.length * COINS_FOR_TOPPING);

    const full = scoreOrder(withTopping, fill(withTopping), T0);
    expect(full.coins).toBeGreaterThan(partial.coins);
  });

  it("can ask for a float or an egg carton, not just the easy containers", () => {
    const orders = Array.from({ length: 200 }, (_, i) => makeOrder(i + 1, T0));
    const vessels = new Set(orders.map((o) => o.vesselId));
    expect(vessels.has("egg-carton")).toBe(true);
    expect(vessels.has("float")).toBe(true);
  });

  it("wants six different flavours in an egg carton, one per well", () => {
    const carton = Array.from({ length: 200 }, (_, i) => makeOrder(i + 1, T0)).find((o) => o.vesselId === "egg-carton");
    expect(carton).toBeDefined();
    if (!carton) return;
    expect(carton.flavorIds).toHaveLength(6);
    expect(new Set(carton.flavorIds).size).toBe(6);

    // Half a carton is paid for half the flavours; the tip waits for all six.
    const half = scoreOrder(carton, built(carton.flavorIds.slice(0, 3), "egg-carton"), T0);
    expect(half.flavorsMatched).toBe(3);
    expect(half.complete).toBe(false);
    expect(half.tip).toBe(0);
    expect(scoreOrder(carton, fill(carton), T0).complete).toBe(true);
  });

  it("still pays for a creation that matches nothing", () => {
    const book = emptyOrderBook(T0);
    // Rocky road is never ordered, and no ticket uses this exact pairing.
    const nothing = built(["rocky-road"], "frosty");
    const reward = bestMatch(book.queue, nothing, T0);
    expect(reward.coins).toBe(COINS_FOR_SERVING);
    expect(reward.orderId).toBeNull();
  });

  it("counts a flavour anywhere in the stack, not just the first scoop", () => {
    const order = makeOrder(2, T0);
    const reward = scoreOrder(order, built(["coffee", "coconut", ...order.flavorIds], order.vesselId), T0);
    expect(reward.flavorMatched).toBe(true);
  });

  it("fills the best matching order without summoning a replacement", () => {
    const book = ordersReducer(emptyOrderBook(T0), { type: "tick", now: T0 + ARRIVAL_EVERY_MS });
    const target = book.queue[1];
    expect(target).toBeDefined();
    if (!target) return;

    const next = ordersReducer(book, { type: "serve", creation: fill(target), now: T0 });
    expect(next.coins).toBe(perfectCoins(target));
    // The counter gets calmer, not instantly busy again.
    expect(next.queue).toHaveLength(book.queue.length - 1);
    expect(next.queue.map((o) => o.id)).not.toContain(target.id);
    expect(next.lastReward?.orderId).toBe(target.id);
  });

  it("keeps the queue intact when nothing matched", () => {
    const book = emptyOrderBook(T0);
    const next = ordersReducer(book, { type: "serve", creation: built(["rocky-road"], "frosty"), now: T0 });
    expect(next.queue).toEqual(book.queue);
    expect(next.coins).toBe(COINS_FOR_SERVING);
  });

  it("keeps adding up across a whole shift", () => {
    let book = emptyOrderBook(T0);
    let expected = 0;
    for (let i = 0; i < 10; i++) {
      // A customer walks in, she fills their order, the counter empties again.
      book = ordersReducer(book, { type: "tick", now: T0 + ARRIVAL_EVERY_MS * (i + 1) });
      const target = book.queue[0];
      if (!target) break;
      expected += perfectCoins(target);
      book = ordersReducer(book, { type: "serve", creation: fill(target), now: target.createdAt });
    }
    expect(book.coins).toBe(expected);
    // She kept up, so the counter is never more than one customer deep.
    expect(book.queue.length).toBeLessThanOrEqual(1);
  });

  it("shrinks the tip as the customer waits, and drops it after a minute", () => {
    expect(tipFor(0)).toBe(3);
    expect(tipFor(25_000)).toBe(2);
    expect(tipFor(45_000)).toBe(1);
    expect(tipFor(CALM_MS)).toBe(0);
    expect(tipFor(PATIENCE_MS)).toBe(0);
  });

  it("only tips a serve that actually filled the order", () => {
    const order = makeOrder(4, T0);
    // Right flavour, wrong container: paid for the flavour, but no tip.
    const partial = scoreOrder(order, built([...order.flavorIds], "rocky-road" as never), T0);
    expect(partial.tip).toBe(0);
  });

  it("goes calm, then hurry, then gone", () => {
    const order = makeOrder(5, T0);
    expect(orderStage(order, T0)).toBe("fresh");
    expect(orderStage(order, T0 + CALM_MS - 1)).toBe("fresh");
    expect(orderStage(order, T0 + CALM_MS)).toBe("hurry");
    expect(orderStage(order, T0 + PATIENCE_MS - 1)).toBe("hurry");
    expect(orderStage(order, T0 + PATIENCE_MS)).toBe("gone");
    expect(secondsLeft(order, T0)).toBe(PATIENCE_MS / 1000);
    expect(secondsLeft(order, T0 + PATIENCE_MS + 5_000)).toBe(0);
  });

  it("lets a customer who waited too long leave", () => {
    const book = emptyOrderBook(T0);
    const first = book.queue[0];
    expect(first).toBeDefined();
    if (!first) return;

    const unchanged = ordersReducer(book, { type: "tick", now: T0 + 1_000 });
    expect(unchanged).toBe(book);

    const later = ordersReducer(book, { type: "tick", now: T0 + PATIENCE_MS });
    expect(later.queue.map((o) => o.id)).not.toContain(first.id);
    // Leaving costs nothing - there is no penalty, only a missed tip.
    expect(later.coins).toBe(book.coins);
  });

  it("keeps the coins she already earned when the counter resets", () => {
    const earned = ordersReducer(emptyOrderBook(T0), {
      type: "serve",
      creation: built(["vanilla"], "cup"),
      now: T0,
    });
    expect(ordersReducer(earned, { type: "reset", now: T0 }).coins).toBe(earned.coins);
  });



  it("works with a creation straight out of the creation reducer", () => {
    const order = makeOrder(3, T0);
    const creation = [
      { type: "setStyle", id: "scoop" },
      { type: "toggleFlavor", id: order.flavorIds[0] ?? "vanilla" },
      { type: "setVessel", id: order.vesselId },
    ].reduce((state, action) => creationReducer(state, action as never), emptyCreation());

    expect(scoreOrder(order, creation, T0).coins).toBe(perfectCoins(order));
  });
});
