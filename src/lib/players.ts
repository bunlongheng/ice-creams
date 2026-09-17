/**
 * Whose shop it is. Tapping the face at the window swaps the player, which
 * renames the shop and changes the child waiting there - the same pretend play,
 * with her own name over the door.
 */

/**
 * How busy the counter gets. Every child plays the same shop at their own
 * speed: one calm, one rushing.
 */
export interface Mode {
  /** How often a new customer walks in. */
  arrivalEveryMs: number;
  /** The most tickets the rail will hold at once. */
  queueSize: number;
  /** How long a customer waits before giving up. */
  patienceMs: number;
  /** Fast serves in a row before the shop catches fire. 0 means never. */
  fireAt: number;
  /** Extra coins on every serve while on fire. */
  fireBonus: number;
}

/** Mila's shop: one customer a minute, no rush, nothing to chase. */
export const CALM: Mode = { arrivalEveryMs: 60_000, queueSize: 3, patienceMs: 120_000, fireAt: 0, fireBonus: 0 };
/**
 * Norden's shop: twice the traffic, a rail of five, and a streak to keep alive.
 * His customers wait half a minute longer than Mila's - not to be kinder, but
 * because at one every thirty seconds that is what lets a fifth ticket stack up.
 */
export const RUSH: Mode = { arrivalEveryMs: 30_000, queueSize: 5, patienceMs: 150_000, fireAt: 3, fireBonus: 2 };

export interface Player {
  id: string;
  name: string;
  /** Lives in `public/`. A missing file falls back to the initial. */
  photo: string;
  mode: Mode;
}

export const PLAYERS: readonly Player[] = [
  { id: "mila", name: "Mila", photo: "/mila.png", mode: CALM },
  { id: "norden", name: "Norden", photo: "/norden.png", mode: RUSH },
] as const;

const STORAGE_KEY = "ice-creams:player";

export const DEFAULT_PLAYER: Player = PLAYERS[0]!;

const byId = (id: string): Player | undefined => PLAYERS.find((player) => player.id === id);

/** The next face round the counter, wrapping back to the first. */
function nextPlayer(current: Player): Player {
  const index = PLAYERS.findIndex((player) => player.id === current.id);
  return PLAYERS[(index + 1) % PLAYERS.length] ?? DEFAULT_PLAYER;
}

/**
 * The remembered choice, read through the same subscribe/getSnapshot pair the
 * sound board uses - the server renders the default, the browser corrects to
 * whoever played last without a second render pass of its own.
 */
class PlayerStore {
  private current: Player | null = null;
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Reads the saved choice once, then serves it from memory. */
  get = (): Player => {
    if (this.current === null) {
      try {
        this.current = byId(window.localStorage.getItem(STORAGE_KEY) ?? "") ?? DEFAULT_PLAYER;
      } catch {
        this.current = DEFAULT_PLAYER; // Private mode - just start as the default.
      }
    }
    return this.current;
  };

  /** The server has no storage, so it always renders the default. */
  getOnServer = (): Player => DEFAULT_PLAYER;

  /** Hands the shop to the next child and remembers it. */
  next = (): Player => {
    const player = nextPlayer(this.get());
    this.current = player;
    try {
      window.localStorage.setItem(STORAGE_KEY, player.id);
    } catch {
      // Storage is optional; the switch still works for this session.
    }
    for (const listener of this.listeners) listener();
    return player;
  };
}

export const players = new PlayerStore();
