import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ConfirmationProvider } from "@/context/ConfirmationContext";
import { SocketProvider } from "@/context/SocketContext";
import LayoutWrapper from "./components/LayoutWrapper";

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
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased min-h-screen bg-[#09090b] text-[#fafafa] selection:bg-white/20 selection:text-white`}>
        <ToastProvider>
          <AuthProvider>
            <ConfirmationProvider>
              <SocketProvider>
                <LayoutWrapper>{children}</LayoutWrapper>
              </SocketProvider>
            </ConfirmationProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
