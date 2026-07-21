import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adivina el número",
  description: "Juego multijugador online para adivinar un número del 0 al 1000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
