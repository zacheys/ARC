import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARCTrack — ARC Request Tracking",
  description:
    "Architectural Review Committee request tracking with Texas Property Code §209.00505 deadline management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
