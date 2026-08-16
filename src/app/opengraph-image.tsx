/**
 * The Open Graph share card — card 18, chosen by the operator 2026-08-16
 * (TICKET-10). This is what a stranger sees when the link is posted into
 * Messenger, Viber or Facebook, which is the whole of the soft launch.
 *
 * Next's file convention wires this up on its own: the `<meta property="og:image">`
 * tag is injected from this file's presence, which is why `layout.tsx` must NOT
 * also name it in its `metadata` object.
 *
 * The emoji game grid is deliberately absent — three Games are `hidden`
 * (ADR 0022) and a grid would advertise Games no surface links to.
 */
import { ImageResponse } from "next/og";

import { PLATFORM_NAME } from "@/config/platform";
import { brandFont, CARD_FAN, Fan, INK, WHITE } from "./_brand/fan";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** `og:image:alt`. Read aloud by screen readers and shown when an image fails
 *  to load, so it describes the platform rather than the drawing. Accents are
 *  fine here — this string is a meta tag, not something satori has to draw. */
export const alt = `${PLATFORM_NAME} — Ελληνικά παιχνίδια λέξεων`;

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: INK,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Fan spec={CARD_FAN} />
        <div
          style={{
            marginTop: 52,
            display: "flex",
            fontSize: 86,
            fontWeight: 700,
            letterSpacing: -2,
            color: WHITE,
          }}
        >
          {PLATFORM_NAME}
        </div>
      </div>
    ),
    { ...size, fonts: await brandFont() },
  );
}
