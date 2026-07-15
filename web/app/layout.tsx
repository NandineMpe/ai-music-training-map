import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Music Training Data Map | Which Countries' Music Was Taken?",
  description:
    "Interactive world map showing which countries' music was scraped to train AI models. Based on The Atlantic's AI Watchdog investigation of the LAION-DISCO-12M dataset containing 12.3 million tracks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-white">
        {children}
      </body>
    </html>
  );
}
