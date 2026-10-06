import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "N5Deal — local prototype",
  description: "Local development foundation for the N5Deal marketplace prototype.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
