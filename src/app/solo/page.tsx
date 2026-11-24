'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import LiveTickChart from '@/components/LiveTickChart';
import OrderPad from '@/components/OrderPad';
import CornerCard from '@/components/CornerCard';
import DerivModal from '@/components/DerivModal';
import MatchRecorder from '@/components/MatchRecorder';
import { derivFeed } from '@/lib/deriv-feed';
import { roomManager } from '@/lib/room-store';
import { MarketTick, MatchRoom, OrderSide, SUPPORTED_SYMBOLS, SymbolKey } from '@/lib/types';
import { Clock, RefreshCw, Terminal, Trophy, Zap } from 'lucide-react';

export default function SoloArenaPage() {
  const [symbol, setSymbol] = useState<SymbolKey>('EUR/USD');
  const [currentTick, setCurrentTick] = useState<MarketTick | null>(null);
  const [room, setRoom] = useState<MatchRoom | null>(null);
  const [isDerivModalOpen, setIsDerivModalOpen] = useState(false);

  // Initialize or reset Solo Room
  const initSolo = useCallback((sym: SymbolKey) => {
    const soloRoom = roomManager.createRoom({
      title: 'Solo Practice Simulation',
      symbol: sym,
      startingBalance: 10000,
      durationSeconds: 900,
      maxDrawdownPct: 15,
      maxDrawdownAmount: 600,
      traderAName: 'Solo_Trader',
      traderBName: 'Benchmark Bot',
    });
    roomManager.ringTheBell(soloRoom.id);
    setRoom({ ...soloRoom });
  }, []);

  useEffect(() => {
    initSolo(symbol);
  }, [symbol, initSolo]);

  // Subscribe to Deriv
  useEffect(() => {
    derivFeed.watchSymbol(symbol);
    const unsub = derivFeed.subscribe((tick) => {
      if (tick.symbol === symbol) {
        setCurrentTick(tick);
        if (room) {
          roomManager.updatePrices(room.id, tick);
          const updated = roomManager.getRoom(room.id);
          if (updated) setRoom({ ...updated });
        }
      }
    });
    return () => unsub();
  }, [symbol, room?.id]);

  const handleExecuteTrade = (side: OrderSide, lotSize: number, slPips?: number, tpPips?: number) => {
    if (!room || !currentTick) return;
    roomManager.executeTrade(room.id, 'A', side, lotSize, currentTick, slPips, tpPips);
    const updated = roomManager.getRoom(room.id);
    if (updated) setRoom({ ...updated });
  };

  const handleCloseTrade = (tradeId: string) => {
    if (!room || !currentTick) return;
    roomManager.closeTrade(room.id, tradeId, currentTick);
    const updated = roomManager.getRoom(room.id);
    if (updated) setRoom({ ...updated });
  };

  const handleCloseAllTrades = () => {
    if (!room || !currentTick) return;
    roomManager.closeAllTrades(room.id, 'A', currentTick);
    const updated = roomManager.getRoom(room.id);
    if (updated) setRoom({ ...updated });
  };

  if (!room) return null;

  return (
    <div className="min-h-screen bg-arena-950 text-arena-100 flex flex-col">
      <Navbar onOpenDerivModal={() => setIsDerivModalOpen(true)} />
      <DerivModal isOpen={isDerivModalOpen} onClose={() => setIsDerivModalOpen(false)} />

      {/* Header bar */}
      <div className="border-b border-arena-800 bg-arena-900/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white">Solo Practice Pad</h1>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                  LIVE SIMULATION
                </span>
              </div>
              <p className="font-mono text-xs text-arena-400">
                Test execution &amp; drawdown discipline against real Deriv ticks
              </p>
            </div>
          </div>

          {/* Symbol Quick Switcher & Video Recorder */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <MatchRecorder matchTitle="Solo-Practice" isMatchEnded={false} />

            <div className="flex items-center gap-1.5">
              {(Object.keys(SUPPORTED_SYMBOLS) as SymbolKey[]).map((sym) => (
                <button
                  key={sym}
                  onClick={() => setSymbol(sym)}
                  className={`rounded-lg px-2.5 py-1 transition font-bold ${
                    symbol === sym
                      ? 'bg-emerald-500 text-arena-950'
                      : 'bg-arena-850 text-arena-400 hover:text-white'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>

            <button
              onClick={() => initSolo(symbol)}
              className="flex items-center gap-1 rounded-lg border border-arena-700 bg-arena-850 px-2.5 py-1 text-arena-300 hover:text-white"
              title="Reset Bankroll"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <main className="mx-auto flex-1 w-full max-w-7xl p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <LiveTickChart
            symbol={symbol}
            currentTick={currentTick || derivFeed.getLatestTick(symbol)}
            openTrades={room.cornerA.openTrades}
          />

          <OrderPad
            symbol={symbol}
            currentTick={currentTick || derivFeed.getLatestTick(symbol)}
            disabled={room.cornerA.isKnockedOut}
            openTrades={room.cornerA.openTrades}
            onExecute={handleExecuteTrade}
            onCloseAll={handleCloseAllTrades}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <CornerCard
            corner={room.cornerA}
            symbol={symbol}
            maxDrawdownPct={room.maxDrawdownPct}
            maxDrawdownAmount={room.maxDrawdownAmount || 600}
            isUserCorner={true}
            onCloseTrade={handleCloseTrade}
          />

          <div className="rounded-xl border border-arena-800 bg-arena-900/40 p-4 font-mono text-xs text-arena-400 space-y-2">
            <span className="font-bold text-arena-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              Practice Rules:
            </span>
            <p className="text-[11px] leading-relaxed">
              Default order size is <strong>0.01 lot</strong> with 1-click execution. Cumulative loss <strong>over $600.00</strong> will trigger instant liquidation. Use <strong>1m, 2m, 3m, 5m, 15m</strong> timeframe tabs to time your entries.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
