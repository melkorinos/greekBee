// Regression + coverage tests for POST /api/auth/link.
//
// The route reaches its DB layer via `const db = supabase.from.bind(supabase)`.
// supabase-js implements `from(relation) { return this.rest.from(relation); }`,
// so a *detached* reference (`const db = supabase.from`) is called with
// this === undefined (ESM strict mode) and throws
// "Cannot read properties of undefined (reading 'rest')" → an unhandled 500.
//
// A plain `vi.fn()` mock can't catch this — it ignores `this`. So the fake
// service client below implements `from` as a real method that dereferences
// `this.rest`, faithfully reproducing the footgun: these tests only pass when
// the route binds `from` to the client.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { tableShim } from "@/test/helpers/supabaseMock";

type ResultFor = (table: string, kind: "single" | "await") => unknown;

const h = vi.hoisted(() => {
  // Chainable postgrest stand-in. `from(table)` returns a proxy where every
  // builder method returns the same proxy; the terminal `maybeSingle()` and
  // `await` (via `then`) resolve to whatever `resultFor(table, kind)` returns.
  function makeServiceClient(resultFor: (table: string, kind: "single" | "await") => unknown) {
    function makeQuery(table: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p: any = new Proxy(() => p, {
        get(_t, prop) {
          if (prop === "then") {
            return (res: (v: unknown) => unknown) =>
              Promise.resolve(resultFor(table, "await")).then(res);
          }
          if (prop === "maybeSingle") return () => Promise.resolve(resultFor(table, "single"));
          return () => p;
        },
      });
      return p;
    }
    return {
      rest: { marker: true },
      // Mirrors supabase-js: dereferences `this.rest`. Detached → this undefined → throws.
      from(this: { rest: unknown }, table: string) {
        void this.rest;
        return makeQuery(table);
      },
    };
  }

  const benign: ResultFor = () => ({ data: null, error: null });

  return {
    getUser: vi.fn(),
    makeServiceClient,
    // Mutable holder so each test can swap the client the route receives.
    ref: { client: makeServiceClient(benign) as unknown },
  };
});

vi.mock("@/lib/supabase", () => ({
  table: tableShim,
  getSupabaseClient:    () => ({ auth: { getUser: h.getUser } }),
  getServiceRoleClient: () => h.ref.client,
}));

function linkRequest(body: unknown, token = "valid-token") {
  return new NextRequest("http://localhost/api/auth/link", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

describe("POST /api/auth/link", () => {
  beforeEach(() => {
    getUserAsPlayer();
    h.ref.client = h.makeServiceClient(() => ({ data: null, error: null }));
  });

  function getUserAsPlayer() {
    h.getUser.mockReset();
    h.getUser.mockResolvedValue({
      data:  { user: { id: "auth-user-1", user_metadata: { full_name: "Test Player" } } },
      error: null,
    });
  }

  it("first link succeeds — DB access is bound to the client (regression: detached from() 500)", async () => {
    const { POST } = await import("@/app/api/auth/link/route");
    const res = await POST(linkRequest({ device_uuid: "device-1" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, device_uuid: "device-1", restored: false });
  });

  it("rejects a request with no bearer token (401)", async () => {
    const { POST } = await import("@/app/api/auth/link/route");
    const req = new NextRequest("http://localhost/api/auth/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ device_uuid: "device-1" }),
    });
    expect((await POST(req)).status).toBe(401);
  });

  it("rejects a body with no device_uuid (400)", async () => {
    const { POST } = await import("@/app/api/auth/link/route");
    expect((await POST(linkRequest({}))).status).toBe(400);
  });

  // Sign-in Restore: the account is already anchored to another device. The route
  // adopts that canonical device and returns restored:true — exercising the
  // restore() helper (which also drives `db` through the bound client).
  it("Sign-in Restore — adopts the anchored canonical device and returns restored:true", async () => {
    h.ref.client = h.makeServiceClient((table, kind) => {
      // The account already lives on a different device than the caller's.
      if (table === "player_profiles" && kind === "single") {
        return { data: { device_uuid: "canonical-device", display_name: "Canonical Name" } };
      }
      // No scores on either device → empty merge plan, restore just re-points identity.
      if (table === "game_scores" && kind === "await") return { data: [] };
      return { data: null, error: null };
    });

    const { POST } = await import("@/app/api/auth/link/route");
    const res = await POST(linkRequest({ device_uuid: "old-device" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok:           true,
      device_uuid:  "canonical-device",
      display_name: "Canonical Name",
      restored:     true,
    });
  });
});
