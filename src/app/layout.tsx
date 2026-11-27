import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Maths Snake",
  description: "A two-player maths Snake game",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
