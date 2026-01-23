import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Federación de Voley de Ushuaia',
  description: 'Sistema Oficial de Gestión',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Aquí NO debe haber Navbar, solo el children */}
        {children}
      </body>
    </html>
  );
}