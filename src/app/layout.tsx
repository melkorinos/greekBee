import "./globals.css";

import { Inter, JetBrains_Mono } from "next/font/google";

import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/shared/Shell";
import { OfflineModeProvider } from "@/hooks/useOfflineMode";
import { PLATFORM_NAME, PLATFORM_DESCRIPTION, PLATFORM_ORIGIN } from "@/config/platform";

// Greek subset is mandatory — this is a Greek word-game platform. Without it,
// every Greek glyph falls back to a system font.
const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin", "greek"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "greek"],
});

// A shared link is the whole soft launch, so this block is what a stranger sees
// first. `opengraph-image` / `icon` / `apple-icon` are NOT listed here — Next's
// file conventions inject those tags from src/app/, and naming them twice is how
// they drift. metadataBase is what turns those generated paths into the absolute
// URLs scrapers demand.
export const metadata: Metadata = {
  metadataBase: new URL(PLATFORM_ORIGIN),
  title: PLATFORM_NAME,
  description: PLATFORM_DESCRIPTION,
  openGraph: {
    title:       PLATFORM_NAME,
    description: PLATFORM_DESCRIPTION,
    url:         "/",
    siteName:    PLATFORM_NAME,
    locale:      "el_GR",
    type:        "website",
  },
  // Cheap, and worth more than Twitter itself here: several scrapers that are
  // not Twitter read these tags in preference to the Open Graph ones.
  twitter: {
    card:        "summary_large_image",
    title:       PLATFORM_NAME,
    description: PLATFORM_DESCRIPTION,
  },
};

// Lock the viewport so pinch-to-zoom can't push the game UI out of the layout on mobile.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="el"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs synchronously before first paint — prevents dark-mode flash on all
            pages. Must live in <head> as a raw <script> so it executes during HTML
            parse; next/script's beforeInteractive can't be an <html> child and a
            useEffect injection runs too late (post-paint = visible flash). React's
            dev-only "script tag while rendering" notice is the accepted cost; it is
            stripped from production builds, so users never see it. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme-preference')==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Offline Mode state is shared platform-wide: the Shell intercepts its own
            nav links, and Leksokipos suppresses its day-rollover redirect. */}
        <OfflineModeProvider>
          <Shell>{children}</Shell>
        </OfflineModeProvider>
      </body>
    </html>
  );
}
