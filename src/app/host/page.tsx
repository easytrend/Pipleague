'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import DerivModal from '@/components/DerivModal';
import { roomManager } from '@/lib/room-store';
import { SUPPORTED_SYMBOLS, SymbolKey } from '@/lib/types';
import { ArrowRight, Bell, Check, Copy, Flame, Play, ShieldAlert, Sparkles, Trophy, Users, Zap } from 'lucide-react';

export default function HostPage() {
  const router = useRouter();
  const [isDerivModalOpen, setIsDerivModalOpen] = useState(false);

  const [title, setTitle] = useState('New York Session Clash #1');
  const [symbol, setSymbol] = useState<SymbolKey>('EUR/USD');
  const [startingBalance, setStartingBalance] = useState<number>(10000);
  const [durationSeconds, setDurationSeconds] = useState<number>(300);
  const [maxDrawdownPct, setMaxDrawdownPct] = useState<number>(15);
  const [maxDrawdownAmount, setMaxDrawdownAmount] = useState<number>(600);
  const [traderAName, setTraderAName] = useState('Alpha_Trader');
  const [traderBName, setTraderBName] = useState('Pip_Hunter');

  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [copiedCorner, setCopiedCorner] = useState<string | null>(null);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const newRoom = roomManager.createRoom({
      title,
      symbol,
      startingBalance,
      durationSeconds,
      maxDrawdownPct,
      maxDrawdownAmount,
      traderAName,
      traderBName,
    });
    setCreatedRoomId(newRoom.id);
  };

  const copyToClipboard = (text: string, corner: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedCorner(corner);
      setTimeout(() => setCopiedCorner(null), 1500);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="min-h-screen bg-arena-950 text-arena-100 flex flex-col bg-grid-pattern">
      <Navbar onOpenDerivModal={() => setIsDerivModalOpen(true)} />
      <DerivModal isOpen={isDerivModalOpen} onClose={() => setIsDerivModalOpen(false)} />

      <main className="mx-auto w-full max-w-4xl p-4 sm:p-8 flex-1">
        {/* Header */}
        <div className="pb-8 border-b border-arena-800">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-0.5 text-xs font-mono text-emerald-400 mb-3">
            <Bell className="h-3.5 w-3.5 text-amber-400" />
            <span>DIRECTOR &amp; BROADCAST CONSOLE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            Host a PipLeague Match
          </h1>
          <p className="mt-1 text-sm text-arena-400">
            Configure match rules, pick the market, emit boarding passes, and ring the opening bell.
          </p>
        </div>

        {/* Creation Form */}
        {!createdRoomId ? (
          <form onSubmit={handleCreateRoom} className="mt-8 space-y-6">
            {/* Title */}
            <div className="space-y-1.5 font-mono">
              <label className="text-xs font-bold uppercase text-arena-300">
                Match Title / Event Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. London Open Finals, Gold Scalp Sprint..."
                className="w-full rounded-xl border border-arena-700 bg-arena-900 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            {/* Symbol Selector */}
            <div className="space-y-2 font-mono">
              <label className="text-xs font-bold uppercase text-arena-300">
                Market Instrument (Deriv Feed)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(SUPPORTED_SYMBOLS) as SymbolKey[]).map((sym) => {
                  const cfg = SUPPORTED_SYMBOLS[sym];
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setSymbol(sym)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                        symbol === sym
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold shadow-md shadow-emerald-950/50'
                          : 'border-arena-800 bg-arena-900/60 text-arena-400 hover:border-arena-700 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-black">{sym}</span>
                      <span className="text-[10px] text-arena-500">{cfg.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Starting Capital & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              {/* Balance */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-arena-300">
                  Paper Bankroll
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[5000, 10000, 50000].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setStartingBalance(b)}
                      className={`rounded-lg py-2 text-xs font-bold transition border ${
                        startingBalance === b
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-arena-800 bg-arena-900 text-arena-400 hover:text-white'
                      }`}
                    >
                      ${b / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-arena-300">
                  Match Clock
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: '3m', sec: 180 },
                    { label: '5m', sec: 300 },
                    { label: '15m', sec: 900 },
                  ].map((d) => (
                    <button
                      key={d.sec}
                      type="button"
                      onClick={() => setDurationSeconds(d.sec)}
                      className={`rounded-lg py-2 text-xs font-bold transition border ${
                        durationSeconds === d.sec
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-arena-800 bg-arena-900 text-arena-400 hover:text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Liquidation Cap */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-arena-300">
                  Liquidation Max Loss Cap
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[300, 600, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setMaxDrawdownAmount(amt)}
                      className={`rounded-lg py-2 text-xs font-bold transition border ${
                        maxDrawdownAmount === amt
                          ? 'border-rose-500 bg-rose-500/20 text-rose-400 font-black'
                          : 'border-arena-800 bg-arena-900 text-arena-400 hover:text-white'
                      }`}
                    >
                      ${amt} {amt === 600 && '⭐'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Contender Handles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-emerald-400">
                  Corner A Trader Name
                </label>
                <input
                  type="text"
                  value={traderAName}
                  onChange={(e) => setTraderAName(e.target.value)}
                  className="w-full rounded-xl border border-arena-700 bg-arena-900 px-4 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-cyan-400">
                  Corner B Trader Name
                </label>
                <input
                  type="text"
                  value={traderBName}
                  onChange={(e) => setTraderBName(e.target.value)}
                  className="w-full rounded-xl border border-arena-700 bg-arena-900 px-4 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 font-mono text-sm font-black text-arena-950 uppercase tracking-wider hover:from-emerald-400 hover:to-teal-400 transition shadow-xl shadow-emerald-500/25 active:scale-[0.99]"
              >
                <Zap className="h-4 w-4" />
                <span>Create Arena Room &amp; Issue Passes</span>
              </button>
            </div>
          </form>
        ) : (
          /* Created Passes Display */
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-6 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
                <Check className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-black text-white">
                Match Room Is Live &bull; {createdRoomId.toUpperCase()}
              </h2>
              <p className="mt-1 text-xs text-arena-300 font-mono">
                Share boarding pass links with both contenders. Guests join instantly without signup.
              </p>
            </div>

            {/* Passes Box */}
            <div className="space-y-3 font-mono">
              {/* Corner A Pass */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-arena-900 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400 text-arena-950 font-black text-xs">
                    A
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">Corner A Boarding Pass ({traderAName})</span>
                    <p className="text-[10px] text-arena-400">{origin}/match/{createdRoomId}?seat=A</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(`${origin}/match/${createdRoomId}?seat=A`, 'A')}
                  className="flex items-center gap-1.5 rounded-lg bg-arena-800 px-3 py-1.5 text-xs text-arena-200 hover:bg-emerald-500 hover:text-arena-950 transition"
                >
                  {copiedCorner === 'A' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCorner === 'A' ? 'Copied!' : 'Copy Pass'}</span>
                </button>
              </div>

              {/* Corner B Pass */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-xl border border-cyan-500/30 bg-arena-900 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400 text-arena-950 font-black text-xs">
                    B
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">Corner B Boarding Pass ({traderBName})</span>
                    <p className="text-[10px] text-arena-400">{origin}/match/{createdRoomId}?seat=B</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(`${origin}/match/${createdRoomId}?seat=B`, 'B')}
                  className="flex items-center gap-1.5 rounded-lg bg-arena-800 px-3 py-1.5 text-xs text-arena-200 hover:bg-cyan-500 hover:text-arena-950 transition"
                >
                  {copiedCorner === 'B' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCorner === 'B' ? 'Copied!' : 'Copy Pass'}</span>
                </button>
              </div>

              {/* Spectator / OBS HUD Pass */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-xl border border-arena-750 bg-arena-900 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-arena-950 font-black text-xs">
                    OBS
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">Spectator / OBS Broadcast HUD</span>
                    <p className="text-[10px] text-arena-400">{origin}/match/{createdRoomId}/stage</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(`${origin}/match/${createdRoomId}/stage`, 'OBS')}
                  className="flex items-center gap-1.5 rounded-lg bg-arena-800 px-3 py-1.5 text-xs text-arena-200 hover:bg-amber-400 hover:text-arena-950 transition"
                >
                  {copiedCorner === 'OBS' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCorner === 'OBS' ? 'Copied!' : 'Copy HUD Link'}</span>
                </button>
              </div>
            </div>

            {/* Launch into Match */}
            <div className="pt-4 flex items-center gap-4">
              <Link
                href={`/match/${createdRoomId}`}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 p-4 font-mono text-sm font-black text-arena-950 uppercase hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25"
              >
                <span>Enter Match Arena</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                onClick={() => setCreatedRoomId(null)}
                className="rounded-xl border border-arena-700 bg-arena-850 px-5 py-4 font-mono text-sm font-semibold text-white hover:bg-arena-800 transition"
              >
                Create Another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
