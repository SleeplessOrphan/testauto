import type { ReactNode } from "react";

export const metadata = {
  title: "testauto",
  description: "An app built by the auto coding system from spec/app.md",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
