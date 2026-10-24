import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";

import { ClerkRoot } from "@/components/clerk-root";

import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "MiUcha",
  description: "Mi dinero. Mis decisiones.",
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
