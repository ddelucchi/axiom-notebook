import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axiom Notebook",
  description:
    "A math-native interactive notebook for derivations. Type, draw, and reason — math stored as raw LaTeX, canonical MathJSON, and SymPy form.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

