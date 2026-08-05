import type { Metadata } from "next";
import "./fonts";
import "./globals.css";

export const metadata: Metadata = { title: "AXON Coach", description: "Fixture-backed AXON coach dashboard" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
