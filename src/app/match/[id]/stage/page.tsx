'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LiveTickChart from '@/components/LiveTickChart';
import TraderCam from '@/components/TraderCam';
import MatchRecorder from '@/components/MatchRecorder';
import { derivFeed } from '@/lib/deriv-feed';
import { roomManager } from '@/lib/room-store';
import { MarketTick, MatchRoom, SUPPORTED_SYMBOLS } from '@/lib/types';
import { AlertOctagon, ArrowLeft, Clock, Radio, Trophy, Users, Zap } from 'lucide-react';

export default function SpectatorStagePage() {
  const params = useParams();
  const roomId = (params?.id as string) || 'london-open-882';

  const [room, setRoom] = useState<MatchRoom | null>(null);
  const [currentTick, setCurrentTick] = useState<MarketTick | null>(null);

  useEffect(() => {
    let r = roomManager.getRoom(roomId);
    if (!r) {
      r = roomManager.createRoom({
        title: `Match ${roomId.toUpperCase()}`,
        symbol: 'EUR/USD',
        startingBalance: 10000,
        durationSeconds: 300,
        maxDrawdownPct: 15,
      });
    }
    setRoom({ ...r });
  }, [roomId]);

  useEffect(() => {
    if (!room) return;
    derivFeed.watchSymbol(room.symbol);

    const unsub = derivFeed.subscribe((tick) => {
      if (tick.symbol === room.symbol) {
        setCurrentTick(tick);
        roomManager.updatePrices(room.id, tick);
        const updated = roomManager.getRoom(room.id);
        if (updated) setRoom({ ...updated });
      }
    });

    return () => unsub();
  }, [room?.symbol, room?.id]);

  useEffect(() => {
    if (!room || room.status !== 'ACTIVE') return;
    const timer = setInterval(() => {
      const updated = roomManager.tickClock(room.id);
      if (updated) setRoom({ ...updated });
    }, 1000);
    return () => clearInterval(timer);
  }, [room?.status, room?.id]);

  if (!room) return null;

  const cfg = SUPPORTED_SYMBOLS[room.symbol];
  const minutes = Math.floor(room.timeRemaining / 60);
  const seconds = room.timeRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const allOpenTrades = [...room.cornerA.openTrades, ...room.cornerB.openTrades];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* Top Streamer Header */}
      <div className="flex items-center justify-between pb-4 border-b border-arena-800">
        <div className="flex items-center gap-3">
          <Link
            href={`/match/${room.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-arena-900 border border-arena-750 text-arena-400 hover:text-white"
            title="Back to Match"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-400">
                PIPLEAGUE ON AIR &bull; OBS BROADCAST HUD
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black">{room.title}</h1>
          </div>
        </div>

        {/* Big Center Countdown Clock & Recorder */}
        <div className="flex items-center gap-4">
          <MatchRecorder matchTitle={room.title} isMatchEnded={room.status === 'ENDED'} />

          <div className="flex items-center gap-3 rounded-2xl border border-arena-700 bg-arena-900/90 px-6 py-2.5 font-mono shadow-2xl">
            <Clock className={`h-6 w-6 ${room.timeRemaining <= 30 && room.status === 'ACTIVE' ? 'text-rose-400 animate-spin' : 'text-emerald-400'}`} />
            <div className="flex flex-col">
              <span className="text-[10px] text-arena-400 uppercase tracking-widest">ROUND CLOCK</span>
              <span className={`text-2xl font-black ${room.timeRemaining <= 10 && room.status === 'ACTIVE' ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                {timeFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Live Instrument Ticker */}
        <div className="flex items-center gap-3 font-mono">
          <div className="rounded-xl border border-arena-800 bg-arena-900 px-4 py-2 text-right">
            <span className="text-[10px] text-arena-400 uppercase">{room.symbol}</span>
            <div className="text-lg font-bold text-emerald-400">
              {currentTick?.quote ? currentTick.quote.toFixed(cfg.digits) : '---'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Broadcast Stage Content */}
      <div className="my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1">
        {/* Corner A Stream Card (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-arena-900 to-arena-950 p-5 shadow-2xl relative overflow-hidden">
          {room.cornerA.isKnockedOut && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-4 text-center">
              <AlertOctagon className="h-12 w-12 text-rose-500 animate-bounce mb-2" />
              <span className="font-mono text-xl font-black text-rose-400 uppercase">
                KNOCKED OUT
              </span>
            </div>
          )}

          <div className="mb-3">
            <TraderCam
              traderName={room.cornerA.traderName}
              corner="A"
              isLocalUser={false}
              isAiBot={true}
              compact={true}
              avatarSeed="👨‍💻"
            />
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-arena-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400 text-black font-black text-xs">
                A
              </span>
              <span className="text-lg font-black">{room.cornerA.traderName}</span>
            </div>
            {room.winner === 'A' && (
              <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-mono font-bold text-amber-300 border border-amber-400/40">
                <Trophy className="h-3 w-3" />
                WINNER
              </span>
            )}
          </div>

          <div className="mt-3 space-y-2.5 font-mono">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-arena-400 uppercase">Equity:</span>
              <span className="text-xl font-black text-emerald-400">
                ${room.cornerA.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-arena-400 uppercase">Net Pips:</span>
              <span className="text-base font-bold text-white">
                {room.cornerA.netPips >= 0 ? '+' : ''}{room.cornerA.netPips.toFixed(1)} pips
              </span>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-arena-400">
                <span>Trailing Drawdown:</span>
                <span className={room.cornerA.drawdownPercent > 10 ? 'text-rose-400 font-bold' : 'text-arena-200'}>
                  {room.cornerA.drawdownPercent.toFixed(1)}% / {room.maxDrawdownPct}% Limit
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-arena-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (room.cornerA.drawdownPercent / room.maxDrawdownPct) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Live Candlestick / Tick Chart (4 cols) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-center">
          <LiveTickChart
            symbol={room.symbol}
            currentTick={currentTick || derivFeed.getLatestTick(room.symbol)}
            openTrades={allOpenTrades}
          />
        </div>

        {/* Corner B Stream Card (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-b from-arena-900 to-arena-950 p-5 shadow-2xl relative overflow-hidden">
          {room.cornerB.isKnockedOut && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-4 text-center">
              <AlertOctagon className="h-12 w-12 text-rose-500 animate-bounce mb-2" />
              <span className="font-mono text-xl font-black text-rose-400 uppercase">
                KNOCKED OUT
              </span>
            </div>
          )}

          <div className="mb-3">
            <TraderCam
              traderName={room.cornerB.traderName}
              corner="B"
              isLocalUser={false}
              isAiBot={true}
              compact={true}
              avatarSeed="⚡"
            />
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-arena-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400 text-black font-black text-xs">
                B
              </span>
              <span className="text-lg font-black">{room.cornerB.traderName}</span>
            </div>
            {room.winner === 'B' && (
              <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-mono font-bold text-amber-300 border border-amber-400/40">
                <Trophy className="h-3 w-3" />
                WINNER
              </span>
            )}
          </div>

          <div className="mt-3 space-y-2.5 font-mono">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-arena-400 uppercase">Equity:</span>
              <span className="text-xl font-black text-cyan-400">
                ${room.cornerB.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-arena-400 uppercase">Net Pips:</span>
              <span className="text-base font-bold text-white">
                {room.cornerB.netPips >= 0 ? '+' : ''}{room.cornerB.netPips.toFixed(1)} pips
              </span>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-arena-400">
                <span>Trailing Drawdown:</span>
                <span className={room.cornerB.drawdownPercent > 10 ? 'text-rose-400 font-bold' : 'text-arena-200'}>
                  {room.cornerB.drawdownPercent.toFixed(1)}% / {room.maxDrawdownPct}% Limit
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-arena-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (room.cornerB.drawdownPercent / room.maxDrawdownPct) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Lower Thirds Ticker */}
      <div className="rounded-xl border border-arena-800 bg-arena-950/90 p-3 font-mono text-xs flex items-center justify-between text-arena-400">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-bold text-white">DERIV STREAM TICK FEED:</span>
          <span>EUR/USD &bull; GBP/USD &bull; USD/JPY &bull; XAU/USD (GOLD) &bull; VOLATILITY 100</span>
        </div>
        <div>
          Discipline Rule: <strong>{room.maxDrawdownPct}% Peak Drawdown Knockout</strong>
        </div>
      </div>
    </div>
  );
}
