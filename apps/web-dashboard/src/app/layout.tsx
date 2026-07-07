import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nami AI Assistant",
  description: "Kaif's personal AI operating system dashboard."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
