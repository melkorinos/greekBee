"use client";

// Sound Cue playback (ADR 0021) — the only place in the Platform that touches
// Audio or Web Audio.
//
// Returns play(cue). Nothing is fetched or constructed at all while sound is off —
// whether that is FEATURE_FLAGS.soundCues (the Platform-wide switch, and since
// 2026-08-26 the only one) or a player's stored preference.
//
// Two kinds of Cue, both dispatched from here: file Cues stream an MP3 through an
// HTMLAudioElement, synth Cues are generated on the spot and have no asset at all.
// Which kind a Cue is belongs to src/config/sound.ts, not to any call site — play()
// takes a Cue name and nothing else.

import { useCallback, useRef } from "react";

import { FEATURE_FLAGS } from "@/config/featureFlags";
import { SOUND_CUES, type CueSound, type SoundCue } from "@/config/sound";
import { useSoundEnabled } from "./useSoundEnabled";

type SynthCue = Extract<CueSound, { kind: "synth" }>;

/**
 * Play one synthesized Cue: a single oscillator through a gain envelope, no asset.
 *
 * Returns the AudioContext it used (creating one on first call) so the caller can
 * keep it for the session — browsers cap how many a page may open, so one per Cue
 * would eventually stop working. `undefined` means Web Audio is unavailable, which
 * is the state under jsdom and on any engine without an `AudioContext`.
 */
function playSynth(existing: AudioContext | null, { volume, frequency, duration }: SynthCue) {
  if (typeof window === "undefined" || !window.AudioContext) return undefined;

  try {
    const ctx = existing ?? new window.AudioContext();
    // A context can start suspended; every Cue follows a tap or a keypress, so a
    // resume here is always inside the user gesture the autoplay policy wants.
    if (ctx.state === "suspended") void ctx.resume();

    const now  = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);

    // The attack has to be a ramp, not a jump. A gain that steps straight from 0
    // to full clicks on its own — an artefact, not the click we asked for — and
    // the decay is exponential because a linear fade to zero clicks at the end
    // for the same reason. Exponential cannot reach 0, hence the epsilon floor.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
    return ctx;
  } catch {
    // Same contract as a rejected play(): a Cue is decoration and must never
    // throw into a round. A context creation refused by the browser lands here.
    return undefined;
  }
}

export function useSoundCue() {
  const { soundEnabled } = useSoundEnabled();
  // One Audio per file Cue, created on that Cue's first play and kept for the session.
  const audioRef = useRef<Partial<Record<SoundCue, HTMLAudioElement>>>({});
  // One AudioContext for every synth Cue, likewise created on first play.
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback((cue: SoundCue) => {
    // The flag moved here on 2026-08-26, when the Shell's toggle was removed. It
    // used to gate that button, and gating a control that no longer exists gates
    // nothing — so it now gates playback itself and becomes the Platform's ONLY
    // off switch for sound: one edit silences every Cue everywhere, without
    // touching any player's stored preference.
    if (!FEATURE_FLAGS.soundCues) return;
    if (!soundEnabled) return;

    const sound: CueSound = SOUND_CUES[cue];
    if (sound.kind === "synth") {
      ctxRef.current = playSynth(ctxRef.current, sound) ?? ctxRef.current;
      return;
    }

    let audio = audioRef.current[cue];
    if (!audio) {
      audio = new Audio(sound.src);
      audio.volume = sound.volume;
      audioRef.current[cue] = audio;
    }

    // Restart rather than stack: three fast finds should retrigger the click,
    // not layer three copies of it.
    audio.currentTime = 0;

    // play() rejects when autoplay policy blocks it or the file is missing, and
    // some engines (older Safari, jsdom) return undefined instead of a Promise.
    // Either way a Cue must never throw into the round — it is decoration.
    audio.play()?.catch(() => {});
  }, [soundEnabled]);

  return { play };
}
