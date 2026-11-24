'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import DerivModal from '@/components/DerivModal';
import { ArrowRight, Bell, Flame, ShieldAlert, Sparkles, Terminal, Trophy, Users, Zap } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [passInput, setPassInput] = useState('');
  const [isDerivOpen, setIsDerivOpen] = useState(false);

  const handleJoinPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passInput.trim()) return;
    const cleanId = passInput.trim().replace(/^.*\/match\//, '').replace(/^.*\/pass\//, '');
    router.push(`/match/${cleanId}`);
  };

  return (
    <div className="min-h-screen bg-arena-950 text-arena-100 bg-grid-pattern flex flex-col">
      <Navbar onOpenDerivModal={() => setIsDerivOpen(true)} />
      <DerivModal isOpen={isDerivOpen} onClose={() => setIsDerivOpen(false)} />

      {/* Hero Section */}
      <section className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-16 pb-12 sm:px-6 sm:pt-24 text-center">
        {/* Top Announcement Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-mono text-emerald-400 mb-8 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Live Deriv WebSocket Feed Active &bull; Zero Capital At Risk</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl">
          THE ARENA FOR <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            LIVE FOREX TRADERS.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base sm:text-lg text-arena-400 leading-relaxed">
          Step into the ring. Hand out boarding passes, ring the synchronized opening bell, and trade head-to-head on live markets with paper money. Discipline decides who leaves as champion.
        </p>

        {/* Action Controls & Boarding Pass Form */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
          <form onSubmit={handleJoinPass} className="relative flex-1 w-full">
            <input
              type="text"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="Paste Boarding Pass or Room ID..."
              className="w-full rounded-xl border border-arena-700 bg-arena-900/90 px-4 py-3 text-sm text-white placeholder-arena-500 font-mono focus:border-emerald-500 focus:outline-none shadow-lg shadow-black/40"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-xs font-bold text-arena-950 hover:bg-emerald-400 transition"
            >
              <span>Join</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <Link
            href="/host"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-arena-700 bg-arena-850 px-5 py-3 text-sm font-semibold text-white hover:bg-arena-800 transition"
          >
            <Bell className="h-4 w-4 text-amber-400" />
            <span>Host Match</span>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-4 flex items-center gap-4 text-xs font-mono text-arena-400">
          <span>Or try instantly:</span>
          <Link href="/solo" className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
            <Terminal className="h-3.5 w-3.5" />
            Solo Training Arena
          </Link>
          <span>&bull;</span>
          <Link href="/match/london-open-882" className="text-cyan-400 hover:underline font-semibold">
            Featured Heat #1
          </Link>
        </div>
      </section>

      {/* Featured Live Arena Card */}
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-arena-700 bg-gradient-to-b from-arena-900/90 to-arena-950 p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-arena-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                  FEATURED MATCH &bull; READY TO RING
                </span>
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">
                London Open Sprint #882
              </h2>
              <p className="text-xs text-arena-400 font-mono mt-0.5">
                EUR/USD &bull; $10,000 Paper Bankroll &bull; Over $600 Liquidation &bull; 0.01L 1-Click
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/match/london-open-882/stage"
                className="rounded-lg border border-arena-700 bg-arena-850 px-3 py-2 text-xs font-mono font-semibold text-arena-300 hover:text-white transition"
              >
                Spectator / OBS Stage
              </Link>
              <Link
                href="/match/london-open-882"
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-arena-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
              >
                <span>Enter Arena</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Corner Comparison Teaser */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="rounded-xl border border-emerald-500/30 bg-arena-900/60 p-4">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs font-bold text-emerald-400 uppercase">Corner A</span>
                <span className="text-xs text-arena-400">Seat 1</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-bold text-white">Alex_FX</span>
                <span className="font-mono text-base font-black text-emerald-400">$10,000.00</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-arena-400">
                <span>Drawdown: 0.0% / 15% Limit</span>
                <span className="text-emerald-400 font-semibold">Ready in Corner</span>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-arena-900/60 p-4">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs font-bold text-cyan-400 uppercase">Corner B</span>
                <span className="text-xs text-arena-400">Seat 2</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-bold text-white">Sarah_Pips</span>
                <span className="font-mono text-base font-black text-cyan-400">$10,000.00</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-arena-400">
                <span>Drawdown: 0.0% / 15% Limit</span>
                <span className="text-cyan-400 font-semibold">Ready in Corner</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 4 Core Pillars Grid */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            ENGINEERED FOR DISCIPLINE &amp; BROADCAST
          </h2>
          <p className="mt-2 text-3xl font-black text-white">
            Built for Serious Forex Execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="rounded-xl border border-arena-800 bg-arena-900/50 p-6 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Institutional Deriv Ticks</h3>
            <p className="mt-2 text-xs text-arena-400 leading-relaxed">
              Every fill and quote comes straight from Deriv&apos;s sub-second WebSocket feed. Trade EUR/USD, GBP/USD, USD/JPY, Gold, and 24/7 Volatility Synthetics with genuine spreads.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-arena-800 bg-arena-900/50 p-6 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 mb-4 border border-rose-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Over $600 Liquidation Knockout</h3>
            <p className="mt-2 text-xs text-arena-400 leading-relaxed">
              No reckless 100x YOLO gambles. Total loss over $600 triggers an immediate buzzer liquidation and closes all positions. Discipline counts as much as profit.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-arena-800 bg-arena-900/50 p-6 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 mb-4 border border-cyan-500/20">
              <Trophy className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">One-Click Boarding Passes</h3>
            <p className="mt-2 text-xs text-arena-400 leading-relaxed">
              No sign-up friction, no wallet deposit, no KYC. Hosts generate pass URLs; traders click and sit immediately in their corner with live voice audio ready.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-arena-800/80 bg-arena-950 py-8 px-4 text-center font-mono text-xs text-arena-500">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">PIPLEAGUE</span>
            <span>&bull;</span>
            <span>Paper Capital on Institutional Deriv Feeds</span>
          </div>
          <div>
            Nothing here constitutes financial advice. Purely competitive simulated trading.
          </div>
        </div>
      </footer>
    </div>
  );
}
