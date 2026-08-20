// useSoundCue — the Sound Cue playback hook (ADR 0021).
//
// These tests use REAL jsdom Audio objects and spy on HTMLMediaElement.prototype
// rather than stubbing a fake Audio class. A hand-rolled Audio mock is a claim
// about the browser's contract, and this repo has been burned by exactly that
// (s132: router.prefetch returns void, and the mock said otherwise). jsdom's own
// play() is the same shape of trap — it exists, returns undefined, and never
// resolves — which is why src/test/setup.ts replaces it unconditionally.
//
// Nothing here asserts audibility. Nothing in this stack can (ADR 0021).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { SOUND_CUES, SOUND_PREFERENCE_KEY } from "@/config/sound";
import { useSoundCue } from "@/hooks/useSoundCue";

/** Every Audio the hook constructs during a test, in construction order. */
let created: HTMLAudioElement[] = [];
let playSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  created = [];
  const RealAudio = globalThis.Audio;
  // Subclass rather than replace: the instances stay real jsdom media elements,
  // so volume/currentTime/src behave exactly as the hook will find them at runtime.
  class TrackedAudio extends RealAudio {
    constructor(src?: string) {
      super(src);
      created.push(this);
    }
  }
  vi.stubGlobal("Audio", TrackedAudio);
  playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");
});

afterEach(() => {
  vi.unstubAllGlobals();
  playSpy.mockRestore();
});

function enableSound() {
  localStorage.setItem(SOUND_PREFERENCE_KEY, "on");
}

describe("useSoundCue", () => {
  it("fetches nothing at all while the preference is off", () => {
    // The whole point of opt-in: a player who never turns sound on never
    // downloads a byte of audio.
    const { result } = renderHook(() => useSoundCue());
    act(() => { result.current.play("missingCenter"); });

    expect(created).toHaveLength(0);
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("plays the registered file at the registered volume when sound is on", () => {
    enableSound();
    const { result } = renderHook(() => useSoundCue());
    act(() => { result.current.play("pangram"); });

    expect(created).toHaveLength(1);
    expect(created[0].src).toContain(SOUND_CUES.pangram.src);
    expect(created[0].volume).toBe(SOUND_CUES.pangram.volume);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it("reuses one Audio per Cue and restarts it instead of stacking", () => {
    // Three fast rejections must restart the slow clap, not layer three of them.
    enableSound();
    const { result } = renderHook(() => useSoundCue());
    act(() => { result.current.play("missingCenter"); });
    created[0].currentTime = 5; // pretend it is mid-playback
    act(() => { result.current.play("missingCenter"); });

    expect(created).toHaveLength(1);
    expect(created[0].currentTime).toBe(0);
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps a separate Audio per Cue", () => {
    enableSound();
    const { result } = renderHook(() => useSoundCue());
    act(() => { result.current.play("missingCenter"); });
    act(() => { result.current.play("pangram"); });

    expect(created).toHaveLength(2);
    expect(created[1].src).toContain(SOUND_CUES.pangram.src);
  });

  it("survives a rejected play() — a blocked or missing file never throws", async () => {
    // Autoplay policy rejections and a 404 on the MP3 both land here. TICKET-05
    // sources the files separately, so "missing" is a real state today.
    enableSound();
    playSpy.mockReturnValue(Promise.reject(new Error("NotAllowedError")));
    const { result } = renderHook(() => useSoundCue());

    expect(() => act(() => { result.current.play("pangram"); })).not.toThrow();
    await Promise.resolve();
  });

  it("survives a play() that returns undefined instead of a Promise", () => {
    // Older Safari does this, and so does jsdom. Calling .catch() on the return
    // value unguarded is a TypeError, not a swallowed rejection.
    enableSound();
    playSpy.mockReturnValue(undefined as unknown as Promise<void>);
    const { result } = renderHook(() => useSoundCue());

    expect(() => act(() => { result.current.play("pangram"); })).not.toThrow();
  });
});

// ── Synth Cues ───────────────────────────────────────────────────────────────
//
// `wordFound` has no file: the hook builds it from an oscillator (src/config/sound.ts,
// `CueSound`). Unlike Audio above there is NO real object to subclass — a probe
// confirmed jsdom defines neither `AudioContext` nor `webkitAudioContext`, so these
// tests stub an absent API rather than tracking a real one. That is a weaker
// position and the assertions are written to match it: they pin the WIRING the hook
// controls (nothing constructed while off, one context reused, start/stop bracket
// the configured duration) and claim nothing about the sound, which is unhearable
// here for the same reason every other Cue's is (ADR 0021).

/** Minimal stand-in for the slice of Web Audio the hook actually calls. */
function stubAudioContext() {
  const started: number[] = [];
  const stopped: number[] = [];
  let constructed = 0;

  class StubAudioContext {
    state = "running";
    currentTime = 0;
    destination = {};
    constructor() { constructed += 1; }
    resume() { return Promise.resolve(); }
    createOscillator() {
      return {
        type: "", frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(),
        start: (t: number) => { started.push(t); },
        stop:  (t: number) => { stopped.push(t); },
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
  }

  vi.stubGlobal("AudioContext", StubAudioContext);
  return { started, stopped, count: () => constructed };
}

describe("useSoundCue — synth Cues", () => {
  it("constructs no AudioContext while the preference is off", () => {
    const ctx = stubAudioContext();
    const { result } = renderHook(() => useSoundCue());
    act(() => { result.current.play("wordFound"); });

    expect(ctx.count()).toBe(0);
  });

  it("does not throw where Web Audio is missing entirely", () => {
    // The shipped state under jsdom, and the state on any engine without an
    // AudioContext. A Cue is decoration; it must never throw into a round.
    enableSound();
    expect(globalThis.AudioContext).toBeUndefined();
    const { result } = renderHook(() => useSoundCue());

    expect(() => act(() => { result.current.play("wordFound"); })).not.toThrow();
  });

  it("plays a synth Cue for its configured duration and constructs no Audio", () => {
    enableSound();
    const ctx = stubAudioContext();
    const { result } = renderHook(() => useSoundCue());
    act(() => { result.current.play("wordFound"); });

    const cue = SOUND_CUES.wordFound;
    expect(ctx.started).toEqual([0]);
    expect(ctx.stopped).toEqual([cue.duration]);
    // The whole point of a synth Cue: no asset is fetched for it, ever.
    expect(created).toHaveLength(0);
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("reuses one AudioContext across plays — browsers cap how many a page may open", () => {
    enableSound();
    const ctx = stubAudioContext();
    const { result } = renderHook(() => useSoundCue());
    act(() => { result.current.play("wordFound"); });
    act(() => { result.current.play("wordFound"); });
    act(() => { result.current.play("wordFound"); });

    expect(ctx.count()).toBe(1);
    expect(ctx.started).toHaveLength(3);
  });
});
