// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import MobileNav from "../components/MobileNav";
import { AuthProvider } from "../context/AuthContext"; // <--- 1. Importamos el escudo
import Script from 'next/script'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Federación Oficial de Voley Ushuaia",
  description: "Plataforma oficial de gestión de la liga.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-50 text-slate-900 pb-20 md:pb-0`}>
        <Script src="https://cdn.tailwindcss.com" />
        {/* 2. Aquí empieza el abrazo del AuthProvider */}
        <AuthProvider>
          
          <Navbar />
          
          <main className="min-h-screen">
            {children}
          </main>
          
          <MobileNav />

        </AuthProvider>
        {/* Aquí termina el abrazo */}
      </body>
    </html>
  );
}
