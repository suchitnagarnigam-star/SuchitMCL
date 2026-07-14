import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ਸੁਚਿਤ ਨਗਰ ਨਿਗਮ — Suchit Nagar Nigam MCL",
  description: "Municipal Corporation Ludhiana (MCL) Media Intelligence and Dispatch System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pa">
      <body className="antialiased bg-background text-textPrimary">
        {children}
      </body>
    </html>
  );
}
