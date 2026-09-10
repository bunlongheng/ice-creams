/**
 * Every sound is synthesised with the Web Audio API - no audio files to load and
 * nothing to wait for on a slow connection. The context is created lazily on the
 * first tap because browsers block audio before a gesture.
 */

export type SoundName = "pick" | "scoop" | "sprinkle" | "pour" | "serve" | "reset";

const STORAGE_KEY = "ice-creams:muted";

class SoundBoard {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted: boolean | null = null;
  private readonly listeners = new Set<() => void>();

  /** Subscribe/getSnapshot pair for React's useSyncExternalStore. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Reads the saved preference once, then serves it from memory. */
  isMuted = (): boolean => {
    if (this.muted === null) {
      try {
        this.muted = window.localStorage.getItem(STORAGE_KEY) === "1";
      } catch {
        this.muted = false; // Private mode - just play sound.
      }
    }
    return this.muted;
  };

  /** The server has no storage, so it always renders "sound on". */
  isMutedOnServer = (): boolean => false;

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {
      // Storage is optional; the toggle still works for this session.
    }
    for (const listener of this.listeners) listener();
  }

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  private tone(
    context: AudioContext,
    { type, from, to, start, duration, gain }: { type: OscillatorType; from: number; to: number; start: number; duration: number; gain: number },
  ): void {
    if (!this.master) return;
    const osc = context.createOscillator();
    const envelope = context.createGain();
    const at = context.currentTime + start;

    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), at + duration);

    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(envelope).connect(this.master);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  /** Filtered white noise - the shaker for sprinkles and the fizz for pours. */
  private noise(context: AudioContext, { start, duration, frequency, gain }: { start: number; duration: number; frequency: number; gain: number }): void {
    if (!this.master) return;
    const frames = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);

    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.9;

    const envelope = context.createGain();
    envelope.gain.value = gain;

    source.connect(filter).connect(envelope).connect(this.master);
    source.start(context.currentTime + start);
  }

  play(name: SoundName): void {
    if (this.isMuted()) return;
    const context = this.ensure();
    if (!context) return;

    switch (name) {
      case "pick":
        this.tone(context, { type: "sine", from: 520, to: 940, start: 0, duration: 0.16, gain: 0.5 });
        break;
      case "scoop":
        this.tone(context, { type: "triangle", from: 320, to: 140, start: 0, duration: 0.2, gain: 0.55 });
        this.tone(context, { type: "sine", from: 880, to: 620, start: 0.04, duration: 0.14, gain: 0.25 });
        break;
      case "sprinkle":
        this.noise(context, { start: 0, duration: 0.34, frequency: 5200, gain: 0.5 });
        this.tone(context, { type: "sine", from: 1300, to: 1900, start: 0.02, duration: 0.12, gain: 0.18 });
        break;
      case "pour":
        this.noise(context, { start: 0, duration: 0.5, frequency: 900, gain: 0.35 });
        this.tone(context, { type: "sine", from: 240, to: 160, start: 0, duration: 0.4, gain: 0.22 });
        break;
      case "serve": {
        // A little major arpeggio, then a shimmer.
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
          this.tone(context, { type: "triangle", from: frequency, to: frequency, start: index * 0.09, duration: 0.34, gain: 0.5 });
        });
        this.tone(context, { type: "sine", from: 1568, to: 2093, start: 0.4, duration: 0.7, gain: 0.3 });
        this.noise(context, { start: 0.36, duration: 0.6, frequency: 6400, gain: 0.28 });
        break;
      }
      case "reset":
        this.tone(context, { type: "sine", from: 700, to: 320, start: 0, duration: 0.22, gain: 0.4 });
        break;
    }
  }
}

export const sounds = new SoundBoard();
