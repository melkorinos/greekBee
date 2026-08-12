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
    act(() => { result.current.play("wordFound"); });

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
    // Three fast finds must restart the click, not layer three of them.
    enableSound();
    const { result } = renderHook(() => useSoundCue());
    act(() => { result.current.play("wordFound"); });
    created[0].currentTime = 5; // pretend it is mid-playback
    act(() => { result.current.play("wordFound"); });

    expect(created).toHaveLength(1);
    expect(created[0].currentTime).toBe(0);
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps a separate Audio per Cue", () => {
    enableSound();
    const { result } = renderHook(() => useSoundCue());
    act(() => { result.current.play("wordFound"); });
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
