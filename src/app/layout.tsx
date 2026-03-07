import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/context/ThemeContext';
import MobileNav from '@/components/MobileNav';
import { Toaster } from 'sonner';

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
        <ThemeProvider>
          {children}
          <MobileNav />
          <Toaster position="bottom-center" richColors theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}