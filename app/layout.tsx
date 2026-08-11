import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

// Inter for body copy, Oswald (condensed, heavy) for headlines and scores —
// the second one is what gives the site its broadcast-graphics feel instead
// of reading like a generic dashboard.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ddfl.vercel.app"),
  title: {
    default: "DDFL — Digital Dash Fantasy League",
    template: "%s · DDFL",
  },
  description:
    "Ten years of Digital Dash Fantasy League: standings, drafts, playoff brackets, records, and all-time rivalries across our dynasty and redraft leagues.",
  // icon.png / apple-icon.png / opengraph-image.png / twitter-image.png in
  // this folder are Next.js file conventions — just having them here is what
  // wires up <link rel="icon">, apple-touch-icon, and og:image/twitter:image.
  // No explicit `icons`/`openGraph.images` needed.
};

// Tints mobile browser chrome (address bar, task switcher) navy to match.
export const viewport: Viewport = {
  themeColor: "#050b1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${oswald.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
