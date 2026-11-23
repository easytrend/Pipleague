'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { derivFeed } from '@/lib/deriv-feed';
import { MarketTick, SUPPORTED_SYMBOLS, SymbolKey } from '@/lib/types';
import { Activity, Bell, ShieldAlert, Sparkles, Terminal, Volume2 } from 'lucide-react';

export default function Navbar({ onOpenDerivModal }: { onOpenDerivModal?: () => void }) {
  const [ticks, setTicks] = useState<Record<SymbolKey, MarketTick>>({} as Record<SymbolKey, MarketTick>);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsub = derivFeed.subscribe((tick) => {
      setTicks((prev) => ({ ...prev, [tick.symbol]: tick }));
      setConnected(true);
    });
    return () => unsub();
  }, []);

  const symbolsToShow: SymbolKey[] = ['EUR/USD', 'GBP/USD', 'XAU/USD', 'Volatility 100'];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-arena-800 bg-arena-950/90 backdrop-blur-md">
      {/* Top Bar with Live Deriv Tickers */}
      <div className="flex h-9 items-center justify-between border-b border-arena-800/60 px-4 text-xs">
        <div className="flex items-center gap-2 text-arena-400">
          <span className="flex h-2 w-2 relative">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </span>
          <span className="font-mono text-[11px] font-semibold tracking-wider text-arena-300 uppercase">
            DERIV STREAM: {connected ? 'LIVE TICK FEED' : 'CONNECTING...'}
          </span>
        </div>

        {/* Live Scrolling Ticker Ribbon */}
        <div className="hidden md:flex items-center gap-6 overflow-hidden">
          {symbolsToShow.map((sym) => {
            const tick = ticks[sym];
            const cfg = SUPPORTED_SYMBOLS[sym];
            if (!tick) return null;
            const isUp = tick.direction === 'up';
            const isDown = tick.direction === 'down';

            return (
              <div key={sym} className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-arena-400 font-medium">{sym}</span>
                <span className={`font-semibold transition-colors duration-200 ${isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-arena-200'}`}>
                  {tick.quote.toFixed(cfg.digits)}
                </span>
                <span className="text-[10px] text-arena-500">
                  (Spread: {cfg.defaultSpreadPips}p)
                </span>
              </div>
            );
          })}
        </div>

        {/* Deriv Connection Badge */}
        <button
          onClick={onOpenDerivModal}
          className="flex items-center gap-1.5 rounded-full border border-arena-700 bg-arena-900 px-2.5 py-0.5 text-[11px] font-mono text-arena-300 hover:border-arena-600 hover:text-white transition"
        >
          <Activity className="h-3 w-3 text-emerald-400" />
          <span>Deriv Account Link</span>
        </button>
      </div>

      {/* Main Nav */}
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-arena-950 font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              <span className="text-lg tracking-tighter">P</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                PIPLEAGUE
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                  PRO
                </span>
              </span>
              <span className="text-[10px] text-arena-400 tracking-wider uppercase font-mono">
                Live Forex Esports
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/solo"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-arena-300 hover:bg-arena-850 hover:text-white transition"
            >
              Solo Training
            </Link>
            <Link
              href="/match/london-open-882"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-arena-300 hover:bg-arena-850 hover:text-white transition"
            >
              Featured Match
            </Link>
            <Link
              href="/host"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-arena-300 hover:bg-arena-850 hover:text-white transition"
            >
              Host a Match
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/solo"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-arena-700 bg-arena-900 px-3 py-1.5 text-xs font-medium text-arena-300 hover:bg-arena-800 hover:text-white transition"
          >
            <Terminal className="h-3.5 w-3.5 text-arena-400" />
            <span>Practice Pad</span>
          </Link>

          <Link
            href="/host"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-arena-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 transition"
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Create Match</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
