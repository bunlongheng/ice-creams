import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Grandstander } from "next/font/google";
import "./globals.css";

const bagel = Bagel_Fat_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bagel",
  display: "swap",
});

const grandstander = Grandstander({
  subsets: ["latin"],
  variable: "--font-grandstander",
  display: "swap",
});

/**
 * Absolute base for canonical and Open Graph URLs. Optional everywhere.
 * Vercel's per-deployment URL would make every preview its own canonical, so
 * prefer the stable production domain it also exposes.
 */
const vercelHost =
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (vercelHost ? `https://${vercelHost}` : undefined);

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: "Ice Creams - Pretend Play Ice Cream Shop",
  description:
    "A toddler-friendly 3D ice cream shop. Pick a swirl or scoops, choose flavours, a cone or cup, pile on toppings, then serve the order.",
  applicationName: "Ice Creams",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Ice Creams - Pretend Play Ice Cream Shop",
    description: "Make and serve pretend ice cream in 3D. Built for little hands.",
    type: "website",
    url: "/",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fff4e2",
  width: "device-width",
  initialScale: 1,
  // No maximum-scale: blocking pinch-zoom would lock out low-vision users.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bagel.variable} ${grandstander.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
