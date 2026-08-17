/**
 * The iOS home-screen tile — the same mark as `icon.tsx` at 180 px, which is
 * the size the candidates page called "apple-icon".
 *
 * The one difference is the corner radius, and it is not a design change: iOS
 * applies its own rounded mask to whatever it is given, so a pre-rounded image
 * renders as a rounded square floating inside a second rounded square, with the
 * transparent corners showing through. Passing 0 hands iOS a full-bleed square
 * and lets it do the rounding, which is what Apple asks for.
 */
import { ImageResponse } from "next/og";

import { brandFont, FanIcon } from "./_brand/fan";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(<FanIcon px={size.width} radiusRatio={0} />, {
    ...size,
    fonts: await brandFont(),
  });
}
