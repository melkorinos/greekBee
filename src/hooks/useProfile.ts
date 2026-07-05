"use client";

// useProfile — shared cross-device profile management.
//
// Wraps all profile API calls and keeps profileLinked state in sync with
// localStorage (via useGameStore). Used identically by all three game boards.
//
// Flow:
//   createProfile(name)        → POST /api/profile → sets profileLinked=true
//   generateTransferCode()     → POST /api/transfer → returns 6-char code
//   claimTransferCode(code)    → POST /api/transfer/claim → adopts source device_uuid
//   disconnect()               → clears profileLinked, generates fresh deviceId

import { useState } from "react";
import {
  disconnectIdentity as storeDisconnect,
  getOrCreateDeviceId,
  isProfileLinked,
  setDeviceId as storeSetDeviceId,
  setDisplayName as storeSetDisplayName,
  setProfileLinked,
} from "./useGameStore";
import { reloadApp } from "@/lib/reload";
import { getSupabaseClient } from "@/lib/supabase";

export interface UseProfileOptions {
  deviceId:            string;
  onDeviceIdChange:    (id: string)   => void;
  onDisplayNameChange: (name: string) => void;
}

export interface UseProfileReturn {
  profileLinked:       boolean;
  createProfile:       (name: string)       => Promise<void>;
  generateTransferCode:() => Promise<string>;
  claimTransferCode:   (code: string)       => Promise<void>;
  disconnect:          () => void;
}

export function useProfile({
  deviceId,
  onDeviceIdChange,
  onDisplayNameChange,
}: UseProfileOptions): UseProfileReturn {
  const [profileLinked, setProfileLinkedState] = useState<boolean>(
    () => typeof window === "undefined" ? false : isProfileLinked(),
  );

  async function createProfile(name: string): Promise<void> {
    // A signed-in player's profile row is auth.uid()-scoped by RLS, so the write
    // must carry their access token; anonymous players send none (anon client).
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

    const res = await fetch("/api/profile", {
      method:  "POST",
      headers,
      body:    JSON.stringify({ display_name: name, device_uuid: deviceId }),
    });
    if (!res.ok) throw new Error("profile create failed");
    const trimmed = name.trim() || "Ανώνυμος";
    storeSetDisplayName(trimmed);
    onDisplayNameChange(trimmed);
    setProfileLinked(true);
    setProfileLinkedState(true);
  }

  async function generateTransferCode(): Promise<string> {
    const res = await fetch("/api/transfer", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ device_uuid: deviceId }),
    });
    if (!res.ok) throw new Error("transfer code generation failed");
    const data = (await res.json()) as { code: string };
    return data.code;
  }

  async function claimTransferCode(code: string): Promise<void> {
    const res = await fetch("/api/transfer/claim", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ code }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error: string };
      throw new Error(err.error ?? "claim failed");
    }
    const data = (await res.json()) as { device_uuid: string; display_name: string };
    storeSetDeviceId(data.device_uuid);
    onDeviceIdChange(data.device_uuid);
    if (data.display_name) {
      storeSetDisplayName(data.display_name);
      onDisplayNameChange(data.display_name);
    }
    setProfileLinked(true);
    setProfileLinkedState(true);
    // Signal leksokipos to restore found words on the next mount or immediately
    // if the game is already open (GameBoard wraps claimTransferCode to handle that).
    localStorage.setItem("leksokipos-needs-restore", "true");
  }

  function disconnect(): void {
    storeDisconnect();
    const newId = getOrCreateDeviceId();
    onDeviceIdChange(newId);
    onDisplayNameChange("");
    setProfileLinkedState(false);
    // Mounted boards still hold the old identity's deviceId and session state
    // in React memory — only a reload makes the device truly anonymous.
    reloadApp();
  }

  return { profileLinked, createProfile, generateTransferCode, claimTransferCode, disconnect };
}
