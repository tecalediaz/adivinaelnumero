import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sala de juegos",
  description: "Juegos multijugador online: Adivina el número y Tateti",
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
