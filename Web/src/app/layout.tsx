import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Zuvo | Next-Gen Social Experience",
  description: "Connect, share, and discover in a premium decentralized social world.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased pt-24 pb-12`}>
        <Navbar />
        <Sidebar />
        <div className="lg:pl-80 pr-6 max-w-7xl mx-auto">
          {children}
        </div>
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,_rgba(112,0,255,0.1),_transparent_50%)] pointer-events-none" />
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_30%,_rgba(0,242,255,0.05),_transparent_40%)] pointer-events-none" />
      </body>
    </html>
  );
}
