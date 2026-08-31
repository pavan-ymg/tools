import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YMG Ops",
  description: "Internal tools — leads, leaderboard, call intake",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="flower-decoration flower-decoration-br" aria-hidden="true" />
        <div className="flower-decoration flower-decoration-tl" aria-hidden="true" />
        <div className="flower-decoration flower-decoration-center" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
