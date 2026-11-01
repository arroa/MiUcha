import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";

import { ClerkRoot } from "@/components/clerk-root";

import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "MiUcha",
  description: "Mi dinero. Mis decisiones.",
  applicationName: "MiUcha",
  manifest: "/manifest.webmanifest",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6d4cff" },
    { media: "(prefers-color-scheme: dark)", color: "#6d4cff" },
  ],
  appleWebApp: {
    capable: true,
    title: "MiUcha",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkRoot>
      <html lang="es" className={`${nunito.variable} ${fraunces.variable} h-full antialiased`}>
        <body className="min-h-full font-sans">{children}</body>
      </html>
    </ClerkRoot>
  );
}
