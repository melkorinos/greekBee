/**
 * The browser-tab favicon — icon 1, chosen by the operator 2026-08-16
 * (TICKET-10): the share card's fan reduced to a square.
 *
 * 32 px is the size the decision was made at. The whole fan with all three
 * letters is a lot to hold at this size; that trade-off was looked at on the
 * candidates page and taken deliberately, so do not "fix" it by dropping the
 * flanking letters here — that would be icon 2, a different pick.
 *
 * Next injects the `<link rel="icon">` tag from this file's presence, which is
 * why `layout.tsx` must not also name it.
 */
import { ImageResponse } from "next/og";

import { brandFont, FanIcon } from "./_brand/fan";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  // 0.2 is the 36 px corner radius the 180 px master was drawn with.
  return new ImageResponse(<FanIcon px={size.width} radiusRatio={0.2} />, {
    ...size,
    fonts: await brandFont(),
  });
}
