import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "N5Deal — demo marketplace", template: "%s | N5Deal" },
  description: "Explore the N5Deal prototype with fictional demo accounts.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
