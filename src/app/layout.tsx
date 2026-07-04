import "./globals.css";

import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";

import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/shared/Shell";
import { PLATFORM_NAME, PLATFORM_DESCRIPTION } from "@/config/platform";

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

export const metadata: Metadata = {
  title: PLATFORM_NAME,
  description: PLATFORM_DESCRIPTION,
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
      <body className="min-h-full flex flex-col">
        <Shell>{children}</Shell>
      </body>
      {/* Runs before first paint — prevents a dark-mode flash on all pages.
          beforeInteractive injects it into the initial HTML head; a raw <script>
          rendered in the React tree trips React 19's "scripts are never executed
          when rendering on the client" warning during hydration. */}
      <Script id="theme-no-flash" strategy="beforeInteractive">
        {`(function(){try{if(localStorage.getItem('theme-preference')==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`}
      </Script>
    </html>
  );
}
