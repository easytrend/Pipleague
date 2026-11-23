import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PipLeague | Live Forex Trading Arena',
  description: 'Trade head-to-head on live markets with paper money. Synchronized opening bells, 15% peak-drawdown knockouts, and institutional Deriv feeds.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-arena-950 text-arena-100 antialiased selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
