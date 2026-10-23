import type { Metadata } from "next";
import localFont from "next/font/local";

import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Notice } from "@/components/notice";
import { Providers } from "@/components/providers";
import "./globals.css";

const serif = localFont({ src: "./fonts/instrument-serif-400.woff2", variable: "--font-serif-face", display: "swap" });
const sans = localFont({ src: "./fonts/schibsted-grotesk-variable.woff2", variable: "--font-sans-face", display: "swap" });
const mono = localFont({ src: "./fonts/azeret-mono-variable.woff2", variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  title: "Standing | Compliance bonds, decided by evidence",
  description:
    "Write what a supplier must prove, freeze it, and let GenLayer validators read the evidence. The bond pays out by the shares you froze.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>
          <Nav />
          <Notice />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
