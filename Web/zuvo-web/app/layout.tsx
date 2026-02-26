import type { Metadata } from "next";
import "@/styles/globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: {
    default: "Zuvo",
    template: "%s | Zuvo",
  },
  description:
    "Zuvo — a production-grade distributed blogging and social platform.",
  keywords: ["blog", "social", "writing", "community"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "var(--color-surface)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
              borderRadius: "10px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            },
          }}
        />
      </body>
    </html>
  );
}
