import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import React from "react";

// Load fonts properly and apply them to the body
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

// Export metadata (optional but recommended)
export const metadata: Metadata = {
  title: "Hack-A-Cure - AI RAG Competition",
  description:
    "Build intelligent RAG models and compete for prizes in the Hack-A-Cure competition",
  icons: "/logo.svg",
};

// RootLayout must return <html> and <body> as per Next.js requirements
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
        {/* <Analytics /> */}
      </body>
    </html>
  );
}
