/**
 * The order book. Customers queue up asking for something simple - one flavour,
 * one container - and every serve pays. Matching the order just pays more.
 *
 * Two rules keep this fair for a two-year-old:
 *  - Orders never expire. There is no timer anywhere in this file.
 *  - Serving something that matches nothing still earns a coin, so the shop
 *    never punishes a child for making what she felt like making.
 */
import { getFlavor, getVessel, type VesselId } from "./catalog";
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

/** Containers a customer will ask for - the big, obvious ones. */
const ORDER_VESSELS: readonly VesselId[] = ["cup", "waffle-cone", "cake-cone", "waffle-bowl", "paper-boat"];

/** How many customers wait at the counter at once. */
export const QUEUE_SIZE = 3;

export const COINS_FOR_SERVING = 1;
export const COINS_FOR_FLAVOR = 2;
export const COINS_FOR_VESSEL = 2;
/** Everything right: one coin for serving plus both bonuses. */
export const COINS_FOR_PERFECT = COINS_FOR_SERVING + COINS_FOR_FLAVOR + COINS_FOR_VESSEL;

export interface Order {
  id: number;
  flavorId: string;
  vesselId: VesselId;
}

export interface Reward {
  coins: number;
  /** The order this serve filled, if it matched one at all. */
  orderId: number | null;
  flavorMatched: boolean;
  vesselMatched: boolean;
}

export interface OrderBook {
  queue: Order[];
  coins: number;
  /** The reward from the last serve, so the UI can show what was earned. */
  lastReward: Reward | null;
  /** Rising id, also used to seed each new order. */
  nextId: number;
}

const pick = <T,>(rows: readonly T[], rng: () => number): T => rows[Math.floor(rng() * rows.length)] ?? rows[0]!;

export function makeOrder(id: number): Order {
  const rng = makeRng(id * 2654435761 + 101);
  return { id, flavorId: pick(ORDER_FLAVORS, rng), vesselId: pick(ORDER_VESSELS, rng) };
}

export function emptyOrderBook(): OrderBook {
  return {
    queue: Array.from({ length: QUEUE_SIZE }, (_, index) => makeOrder(index + 1)),
    coins: 0,
    lastReward: null,
    nextId: QUEUE_SIZE + 1,
  };
}

/** What one order is worth against what she actually made. */
export function scoreOrder(order: Order, creation: Creation): Reward {
  const flavorMatched = creation.flavors.includes(order.flavorId);
  const vesselMatched = creation.vessel === order.vesselId;
  return {
    orderId: order.id,
    flavorMatched,
    vesselMatched,
    coins:
      COINS_FOR_SERVING +
      (flavorMatched ? COINS_FOR_FLAVOR : 0) +
      (vesselMatched ? COINS_FOR_VESSEL : 0),
  };
}

/**
 * Picks the order this creation fills best. Ties go to the customer who has
 * been waiting longest, so the queue keeps moving.
 */
export function bestMatch(queue: readonly Order[], creation: Creation): Reward {
  let best: Reward = { coins: COINS_FOR_SERVING, orderId: null, flavorMatched: false, vesselMatched: false };
  for (const order of queue) {
    const reward = scoreOrder(order, creation);
    if (reward.coins > best.coins) best = reward;
  }
  return best;
}

export type OrderAction = { type: "serve"; creation: Creation } | { type: "reset" };

export function ordersReducer(state: OrderBook, action: OrderAction): OrderBook {
  switch (action.type) {
    case "serve": {
      const reward = bestMatch(state.queue, action.creation);
      // A serve that matched nothing still pays, and leaves the queue alone.
      if (reward.orderId === null) {
        return { ...state, coins: state.coins + reward.coins, lastReward: reward };
      }

      const queue = state.queue.filter((order) => order.id !== reward.orderId);
      queue.push(makeOrder(state.nextId));
      return {
        queue,
        coins: state.coins + reward.coins,
        lastReward: reward,
        nextId: state.nextId + 1,
      };
    }

    case "reset":
      return emptyOrderBook();

    default:
      return state;
  }
}

/** Spoken form of an order, for the ticket's accessible label. */
export function describeOrder(order: Order): string {
  const flavor = getFlavor(order.flavorId)?.name ?? order.flavorId;
  const vessel = getVessel(order.vesselId)?.name ?? order.vesselId;
  return `${flavor} in a ${vessel.toLowerCase()}`;
}
