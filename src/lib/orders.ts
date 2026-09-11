/**
 * The order book. Customers queue up asking for something simple - one flavour,
 * one container - and every serve pays. Matching the order just pays more.
 *
 * Customers wait two minutes before they give up. The first minute is calm
 * (green), the second is the hurry-up (orange), and the tip shrinks as the
 * clock runs - fast service pays best.
 *
 * Two rules keep this fair for a two-year-old:
 *  - A customer leaving costs nothing. There is no penalty, only a missed tip.
 *  - Serving something that matches nothing still earns a coin, so the shop
 *    never punishes a child for making what she felt like making.
 */
import { getFlavor, getTopping, getVessel, type VesselId } from "./catalog";
import type { Creation } from "./creation";
import { makeRng } from "./random";

/** Flavours a customer will ask for - the ones a toddler can tell apart. */
const ORDER_FLAVORS = [
  "vanilla",
  "chocolate",
  "strawberry",
  "mint",
  "bubblegum",
  "lemon",
  "blueberry",
  "cotton-candy",
  "banana",
  "cherry",
  "mango",
  "lime",
] as const;

/** Every container is fair game, including the float and the egg carton. */
const ORDER_VESSELS: readonly VesselId[] = [
  "cup",
  "waffle-cone",
  "cake-cone",
  "sundae",
  "float",
  "waffle-bowl",
  "paper-boat",
  "egg-carton",
  "frosty",
];

/** Toppings a customer will ask for - the ones that read clearly on a ticket. */
const ORDER_TOPPINGS = [
  "rainbow-sprinkles",
  "choc-sprinkles",
  "oreo",
  "gummy",
  "strawberries",
  "banana-slices",
  "choc-chips",
  "hot-fudge",
  "caramel",
  "whipped-cream",
  "marshmallows",
  "cherry",
] as const;

/**
 * How many things one ticket asks for. Most are the simple pair; a few add a
 * topping; the occasional show-off wants two.
 */
const EXTRA_TOPPING_ODDS: readonly [chance: number, toppings: number][] = [
  [0.6, 0],
  [0.9, 1],
  [1, 2],
];

/** The rail never holds more than this, however long she takes. */
export const QUEUE_SIZE = 3;
/** One customer to start, and a new one only once a minute - a full counter is
 * stressful, and this is meant to be a calm shop. */
export const ARRIVAL_EVERY_MS = 60_000;

export const COINS_FOR_SERVING = 1;
export const COINS_FOR_FLAVOR = 2;
export const COINS_FOR_VESSEL = 2;
export const COINS_FOR_TOPPING = 1;
/** The simple two-item ticket, filled exactly: one coin to serve plus both bonuses. */
export const COINS_FOR_PERFECT = COINS_FOR_SERVING + COINS_FOR_FLAVOR + COINS_FOR_VESSEL;

/** The calm minute, then the hurry-up minute, then the customer leaves. */
export const CALM_MS = 60_000;
export const PATIENCE_MS = 120_000;

/** Tip brackets: the quicker it lands, the bigger the thank you. */
const TIPS: readonly [maxAgeMs: number, coins: number][] = [
  [20_000, 3],
  [40_000, 2],
  [CALM_MS, 1],
];

export type OrderStage = "fresh" | "hurry" | "gone";

export interface Order {
  id: number;
  /** One flavour for most containers; six for the egg carton, one per well. */
  flavorIds: string[];
  vesselId: VesselId;
  /** Nothing, one topping, or two - the rarer, richer tickets. */
  toppingIds: string[];
  /** When this customer walked in, as a timestamp. */
  createdAt: number;
}

/** Everything one ticket asks for, so the UI can just count the pictures. */
export const orderSize = (order: Order): number => 1 + order.flavorIds.length + order.toppingIds.length;

export interface Reward {
  coins: number;
  /** Part of `coins` that was a speed tip. */
  tip: number;
  /** The order this serve filled, if it matched one at all. */
  orderId: number | null;
  /** True once every flavour on the ticket is in the ice cream. */
  flavorMatched: boolean;
  vesselMatched: boolean;
  /** How many of the ticket's flavours made it in. */
  flavorsMatched: number;
  /** Which of the ticket's toppings actually made it onto the ice cream. */
  toppingsMatched: number;
  /** True when every single thing the ticket asked for is there. */
  complete: boolean;
}

export const orderAge = (order: Order, now: number): number => Math.max(now - order.createdAt, 0);

export function orderStage(order: Order, now: number): OrderStage {
  const age = orderAge(order, now);
  if (age >= PATIENCE_MS) return "gone";
  return age >= CALM_MS ? "hurry" : "fresh";
}

/** How long this customer will still wait, in whole seconds. */
export const secondsLeft = (order: Order, now: number): number =>
  Math.max(Math.ceil((PATIENCE_MS - orderAge(order, now)) / 1000), 0);

export function tipFor(ageMs: number): number {
  for (const [maxAge, coins] of TIPS) if (ageMs < maxAge) return coins;
  return 0;
}

export interface OrderBook {
  queue: Order[];
  coins: number;
  /** The reward from the last serve, so the UI can show what was earned. */
  lastReward: Reward | null;
  /** Rising id, also used to seed each new order. */
  nextId: number;
  /** When the next customer walks in. */
  nextArrivalAt: number;
}

const pick = <T,>(rows: readonly T[], rng: () => number): T => rows[Math.floor(rng() * rows.length)] ?? rows[0]!;

export function makeOrder(id: number, createdAt: number): Order {
  const rng = makeRng(id * 2654435761 + 101);
  const vesselId = pick(ORDER_VESSELS, rng);

  // A container with wells wants a different flavour in every well - six for
  // the egg carton, three for the paper boat.
  const flavorCount = getVessel(vesselId)?.layout === "slots" ? (getVessel(vesselId)?.maxScoops ?? 1) : 1;
  const flavorIds: string[] = [];
  while (flavorIds.length < flavorCount) {
    const flavor = pick(ORDER_FLAVORS, rng);
    if (!flavorIds.includes(flavor)) flavorIds.push(flavor);
  }

  const roll = rng();
  const wanted = EXTRA_TOPPING_ODDS.find(([chance]) => roll < chance)?.[1] ?? 0;
  const toppingIds: string[] = [];
  while (toppingIds.length < wanted) {
    const topping = pick(ORDER_TOPPINGS, rng);
    if (!toppingIds.includes(topping)) toppingIds.push(topping);
  }

  return { id, flavorIds, vesselId, toppingIds, createdAt };
}

export function emptyOrderBook(now = Date.now()): OrderBook {
  return {
    // One customer is waiting when the shop opens. The rest take their time.
    queue: [makeOrder(1, now)],
    coins: 0,
    lastReward: null,
    nextId: 2,
    nextArrivalAt: now + ARRIVAL_EVERY_MS,
  };
}

/** What one order is worth against what she actually made. */
export function scoreOrder(order: Order, creation: Creation, now: number): Reward {
  const flavorsMatched = order.flavorIds.filter((id) => creation.flavors.includes(id)).length;
  const flavorMatched = flavorsMatched === order.flavorIds.length;
  const vesselMatched = creation.vessel === order.vesselId;
  const toppingsMatched = order.toppingIds.filter((id) => creation.toppings.includes(id)).length;
  const complete = flavorMatched && vesselMatched && toppingsMatched === order.toppingIds.length;
  // The tip is for filling the whole ticket quickly.
  const tip = complete ? tipFor(orderAge(order, now)) : 0;
  return {
    orderId: order.id,
    flavorMatched,
    vesselMatched,
    flavorsMatched,
    toppingsMatched,
    complete,
    tip,
    coins:
      COINS_FOR_SERVING +
      flavorsMatched * COINS_FOR_FLAVOR +
      (vesselMatched ? COINS_FOR_VESSEL : 0) +
      toppingsMatched * COINS_FOR_TOPPING +
      tip,
  };
}

/**
 * Picks the order this creation fills best. Ties go to the customer who has
 * been waiting longest, so the queue keeps moving.
 */
export function bestMatch(queue: readonly Order[], creation: Creation, now: number): Reward {
  let best: Reward = {
    coins: COINS_FOR_SERVING,
    tip: 0,
    orderId: null,
    flavorMatched: false,
    vesselMatched: false,
    flavorsMatched: 0,
    toppingsMatched: 0,
    complete: false,
  };
  for (const order of queue) {
    const reward = scoreOrder(order, creation, now);
    if (reward.coins > best.coins) best = reward;
  }
  return best;
}

export type OrderAction =
  | { type: "serve"; creation: Creation; now: number }
  | { type: "tick"; now: number }
  | { type: "reset"; now: number };

export function ordersReducer(state: OrderBook, action: OrderAction): OrderBook {
  switch (action.type) {
    case "serve": {
      const reward = bestMatch(state.queue, action.creation, action.now);
      // A serve that matched nothing still pays, and leaves the queue alone.
      if (reward.orderId === null) {
        return { ...state, coins: state.coins + reward.coins, lastReward: reward };
      }

      // Filling an order does not summon a replacement - the next customer
      // arrives on the clock, so the counter stays calm.
      return {
        ...state,
        queue: state.queue.filter((order) => order.id !== reward.orderId),
        coins: state.coins + reward.coins,
        lastReward: reward,
      };
    }

    case "tick": {
      const staying = state.queue.filter((order) => orderStage(order, action.now) !== "gone");
      const arriving = action.now >= state.nextArrivalAt && staying.length < QUEUE_SIZE;
      if (!arriving && staying.length === state.queue.length) return state;

      const queue = arriving ? [...staying, makeOrder(state.nextId, action.now)] : staying;
      return {
        ...state,
        queue,
        nextId: arriving ? state.nextId + 1 : state.nextId,
        nextArrivalAt: arriving ? action.now + ARRIVAL_EVERY_MS : state.nextArrivalAt,
      };
    }

    case "reset":
      return { ...emptyOrderBook(action.now), coins: state.coins };

    default:
      return state;
  }
}

/**
 * Spoken form of an order, for the ticket's accessible label. Container first,
 * to match both the ticket art and the order of the steps.
 */
export function describeOrder(order: Order): string {
  const flavors = order.flavorIds.map((id) => getFlavor(id)?.name ?? id).join(", ");
  const vessel = getVessel(order.vesselId)?.name ?? order.vesselId;
  const toppings = order.toppingIds.map((id) => getTopping(id)?.name ?? id);
  const base = `a ${vessel.toLowerCase()} of ${flavors.toLowerCase()}`;
  return toppings.length > 0 ? `${base} with ${toppings.join(" and ").toLowerCase()}` : base;
}
