import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Banorte · Interfaz Financiera Adaptativa",
  description: "Prototipo HackMTY — un agente de IA que genera la interfaz financiera en tiempo real vía MCP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen text-gray-900 antialiased">{children}</body>
    </html>
  );
}
