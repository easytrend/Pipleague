'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LiveTickChart from '@/components/LiveTickChart';
import OrderPad from '@/components/OrderPad';
import CornerCard from '@/components/CornerCard';
import DerivModal from '@/components/DerivModal';
import { derivFeed } from '@/lib/deriv-feed';
import { roomManager } from '@/lib/room-store';
import { sound } from '@/lib/audio-effects';
import { MarketTick, MatchRoom, OrderSide, SUPPORTED_SYMBOLS } from '@/lib/types';
import confetti from 'canvas-confetti';
import { AlertTriangle, Bell, Clock, Eye, Radio, RefreshCw, Trophy, Volume2, Zap } from 'lucide-react';

export default function MatchArenaPage() {
  const params = useParams();
  const roomId = (params?.id as string) || 'london-open-882';

  const [room, setRoom] = useState<MatchRoom | null>(null);
  const [currentTick, setCurrentTick] = useState<MarketTick | null>(null);
  const [activeCorner, setActiveCorner] = useState<'A' | 'B'>('A');
  const [isDerivModalOpen, setIsDerivModalOpen] = useState(false);

  // Initialize room
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

  // Subscribe to Deriv tick feed
  useEffect(() => {
    if (!room) return;
    derivFeed.watchSymbol(room.symbol);

    const unsub = derivFeed.subscribe((tick) => {
      if (tick.symbol === room.symbol) {
        setCurrentTick(tick);
        roomManager.updatePrices(room.id, tick);
        const updated = roomManager.getRoom(room.id);
        if (updated) {
          setRoom({ ...updated });
        }
      }
    });

    return () => unsub();
  }, [room?.symbol, room?.id]);

  // Match countdown timer loop
  useEffect(() => {
    if (!room || room.status !== 'ACTIVE') return;

    const timer = setInterval(() => {
      const updated = roomManager.tickClock(room.id);
      if (updated) {
        setRoom({ ...updated });
        if (updated.status === 'ENDED' && updated.winner && updated.winner !== 'DRAW') {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [room?.status, room?.id]);

  // Handle Ring Bell
  const handleRingBell = useCallback(() => {
    if (!room) return;
    const updated = roomManager.ringTheBell(room.id);
    if (updated) {
      setRoom({ ...updated });
    }
  }, [room]);

  // Order Execution
  const handleExecuteTrade = useCallback(
    (side: OrderSide, lotSize: number, slPips?: number, tpPips?: number) => {
      if (!room || !currentTick || room.status !== 'ACTIVE') return;
      roomManager.executeTrade(room.id, activeCorner, side, lotSize, currentTick, slPips, tpPips);
      const updated = roomManager.getRoom(room.id);
      if (updated) setRoom({ ...updated });
    },
    [room, currentTick, activeCorner]
  );

  // Close Trade
  const handleCloseTrade = useCallback(
    (tradeId: string) => {
      if (!room || !currentTick) return;
      roomManager.closeTrade(room.id, tradeId, currentTick);
      const updated = roomManager.getRoom(room.id);
      if (updated) setRoom({ ...updated });
    },
    [room, currentTick]
  );

  // Close All Trades
  const handleCloseAllTrades = useCallback(() => {
    if (!room || !currentTick) return;
    roomManager.closeAllTrades(room.id, activeCorner, currentTick);
    const updated = roomManager.getRoom(room.id);
    if (updated) setRoom({ ...updated });
  }, [room, currentTick, activeCorner]);

  if (!room) {
    return (
      <div className="min-h-screen bg-arena-950 flex items-center justify-center text-arena-400 font-mono text-sm">
        Loading Arena Match...
      </div>
    );
  }

  const cfg = SUPPORTED_SYMBOLS[room.symbol];
  const userCornerState = activeCorner === 'A' ? room.cornerA : room.cornerB;
  const minutes = Math.floor(room.timeRemaining / 60);
  const seconds = room.timeRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-arena-950 text-arena-100 flex flex-col">
      <Navbar onOpenDerivModal={() => setIsDerivModalOpen(true)} />
      <DerivModal isOpen={isDerivModalOpen} onClose={() => setIsDerivModalOpen(false)} />

      {/* Arena Stage Sub-Header */}
      <div className="border-b border-arena-800 bg-arena-900/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          {/* Match Title & Symbol */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white">{room.title}</h1>
                <span className="rounded bg-arena-800 px-2 py-0.5 font-mono text-[10px] text-arena-300">
                  {room.symbol}
                </span>
                <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 font-mono text-[10px] text-rose-400">
                  {room.maxDrawdownPct}% Max DD Knockout
                </span>
              </div>
              <p className="font-mono text-xs text-arena-400">
                Starting Bankroll: ${room.startingBalance.toLocaleString()} &bull; Deriv Feed: {cfg.derivSymbol}
              </p>
            </div>
          </div>

          {/* Center Clock & Match Bell */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border border-arena-750 bg-arena-850 px-4 py-2 font-mono">
              <Clock className={`h-4 w-4 ${room.timeRemaining <= 30 && room.status === 'ACTIVE' ? 'text-rose-400 animate-spin' : 'text-emerald-400'}`} />
              <span className="text-xs text-arena-400 uppercase">Clock:</span>
              <span className={`text-base font-black ${room.timeRemaining <= 10 && room.status === 'ACTIVE' ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                {timeFormatted}
              </span>
            </div>

            {room.status === 'LOBBY' && (
              <button
                onClick={handleRingBell}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-4 py-2 text-xs font-black uppercase text-arena-950 hover:from-amber-400 hover:to-yellow-300 transition shadow-lg shadow-amber-500/25 active:scale-95"
              >
                <Bell className="h-4 w-4" />
                <span>Ring Opening Bell</span>
              </button>
            )}

            {room.status === 'ACTIVE' && (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-mono font-bold text-emerald-400 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                ON AIR &bull; LIVE
              </span>
            )}

            {room.status === 'ENDED' && (
              <span className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/40 px-3 py-1 text-xs font-mono font-bold text-rose-400">
                MATCH SETTLED
              </span>
            )}
          </div>

          {/* Seat / Corner Selector */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-arena-400 hidden sm:inline">Your Seat:</span>
            <div className="flex rounded-lg bg-arena-850 p-1 border border-arena-750">
              <button
                onClick={() => setActiveCorner('A')}
                className={`rounded px-3 py-1 font-bold transition ${
                  activeCorner === 'A'
                    ? 'bg-emerald-500 text-arena-950 shadow-sm'
                    : 'text-arena-400 hover:text-white'
                }`}
              >
                Corner A
              </button>
              <button
                onClick={() => setActiveCorner('B')}
                className={`rounded px-3 py-1 font-bold transition ${
                  activeCorner === 'B'
                    ? 'bg-cyan-500 text-arena-950 shadow-sm'
                    : 'text-arena-400 hover:text-white'
                }`}
              >
                Corner B
              </button>
            </div>

            <Link
              href={`/match/${room.id}/stage`}
              className="rounded-lg border border-arena-700 bg-arena-850 p-2 text-arena-300 hover:text-white"
              title="OBS Broadcast HUD"
            >
              <Eye className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Winner / Knockout Announcement Banner */}
      {room.status === 'ENDED' && (
        <div className="bg-gradient-to-r from-amber-950/70 via-arena-900 to-amber-950/70 border-b border-amber-500/30 py-3 px-4 text-center">
          <div className="flex items-center justify-center gap-2 font-mono text-sm font-bold text-amber-300">
            <Trophy className="h-5 w-5 text-amber-400" />
            <span>
              {room.winner === 'A'
                ? `CHAMPION: Corner A (${room.cornerA.traderName}) with $${room.cornerA.equity.toFixed(2)} Equity!`
                : room.winner === 'B'
                ? `CHAMPION: Corner B (${room.cornerB.traderName}) with $${room.cornerB.equity.toFixed(2)} Equity!`
                : 'MATCH RESULT: Dead Heat Draw!'}
            </span>
          </div>
          {room.knockoutReason && (
            <p className="text-xs font-mono text-rose-400 mt-0.5">
              Reason: {room.knockoutReason}
            </p>
          )}
        </div>
      )}

      {/* Main Arena Workspace Grid */}
      <main className="mx-auto flex-1 w-full max-w-7xl p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Chart + Execution Dock (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Real-Time Tick Wave Chart */}
          <LiveTickChart
            symbol={room.symbol}
            currentTick={currentTick || derivFeed.getLatestTick(room.symbol)}
            openTrades={userCornerState.openTrades}
          />

          {/* Order Pad Execution Dock */}
          <OrderPad
            symbol={room.symbol}
            currentTick={currentTick || derivFeed.getLatestTick(room.symbol)}
            disabled={room.status !== 'ACTIVE' || userCornerState.isKnockedOut}
            openTrades={userCornerState.openTrades}
            onExecute={handleExecuteTrade}
            onCloseAll={handleCloseAllTrades}
          />
        </div>

        {/* Right Column: Ringside Corner Standings (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Corner A Card */}
          <CornerCard
            corner={room.cornerA}
            symbol={room.symbol}
            maxDrawdownPct={room.maxDrawdownPct}
            isUserCorner={activeCorner === 'A'}
            onCloseTrade={handleCloseTrade}
          />

          {/* Corner B Card */}
          <CornerCard
            corner={room.cornerB}
            symbol={room.symbol}
            maxDrawdownPct={room.maxDrawdownPct}
            isUserCorner={activeCorner === 'B'}
            onCloseTrade={handleCloseTrade}
          />

          {/* Match Telemetry / Rules Summary */}
          <div className="rounded-xl border border-arena-800 bg-arena-900/40 p-4 font-mono text-xs text-arena-400 space-y-2">
            <span className="font-bold text-arena-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              Arena Settlement Rules
            </span>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>Discipline Rule: <strong>{room.maxDrawdownPct}% peak drawdown</strong> triggers automatic buzzer knockout.</li>
              <li>Fills occur instantly on Deriv ask (for buys) and bid (for sells).</li>
              <li>Highest equity at zero-clock takes the championship ring.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
