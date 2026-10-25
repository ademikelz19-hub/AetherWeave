import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

export const metadata: Metadata = {
  title: "AetherWeave — Webhook Chaos Orchestrator",
  description:
    "A deterministic, asynchronous event orchestrator and webhook chaos testing platform for AI-driven SaaS applications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-slate-950 text-slate-100 antialiased min-h-screen`}
      >
        {/* Ambient background grid */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(6,182,212,0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6,182,212,0.15) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />
          {/* Radial glow */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
