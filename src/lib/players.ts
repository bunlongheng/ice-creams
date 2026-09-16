/**
 * Whose shop it is. Tapping the face at the window swaps the player, which
 * renames the shop and changes the child waiting there - the same pretend play,
 * with her own name over the door.
 */

export interface Player {
  id: string;
  name: string;
  /** Lives in `public/`. A missing file falls back to the initial. */
  photo: string;
}

export const PLAYERS: readonly Player[] = [
  { id: "mila", name: "Mila", photo: "/mila.png" },
  { id: "norden", name: "Norden", photo: "/norden.png" },
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
