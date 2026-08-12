"use client";

// Sound Cue playback (ADR 0021) — the only place in the Platform that touches Audio.
//
// Returns play(cue). Nothing is fetched at all while the preference is off, so a
// player who never enables sound never downloads a byte of audio.

import { useCallback, useRef } from "react";

import { SOUND_CUES, type SoundCue } from "@/config/sound";
import { useSoundEnabled } from "./useSoundEnabled";

export function useSoundCue() {
  const { soundEnabled } = useSoundEnabled();
  // One Audio per Cue, created on that Cue's first play and kept for the session.
  const audioRef = useRef<Partial<Record<SoundCue, HTMLAudioElement>>>({});

  const play = useCallback((cue: SoundCue) => {
    if (!soundEnabled) return;

    let audio = audioRef.current[cue];
    if (!audio) {
      const { src, volume } = SOUND_CUES[cue];
      audio = new Audio(src);
      audio.volume = volume;
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
