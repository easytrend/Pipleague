'use client';

import React, { useState } from 'react';
import { MarketTick, OrderSide, SUPPORTED_SYMBOLS, SymbolKey, TradePosition } from '@/lib/types';
import { ArrowDownRight, ArrowUpRight, Ban, DollarSign, Shield, Zap } from 'lucide-react';

interface OrderPadProps {
  symbol: SymbolKey;
  currentTick: MarketTick;
  disabled?: boolean;
  openTrades?: TradePosition[];
  onExecute: (side: OrderSide, lotSize: number, slPips?: number, tpPips?: number) => void;
  onCloseAll: () => void;
}

export default function OrderPad({
  symbol,
  currentTick,
  disabled = false,
  openTrades = [],
  onExecute,
  onCloseAll,
}: OrderPadProps) {
  const cfg = SUPPORTED_SYMBOLS[symbol];
  const [selectedLot, setSelectedLot] = useState<number>(0.01);
  const [slPips, setSlPips] = useState<number | undefined>(undefined);
  const [tpPips, setTpPips] = useState<number | undefined>(undefined);

  const lotOptions = [0.01, 0.05, 0.1, 0.5, 1.0];
  const slOptions = [
    { label: 'None', val: undefined },
    { label: '10p', val: 10 },
    { label: '15p', val: 15 },
    { label: '25p', val: 25 },
    { label: '50p', val: 50 },
  ];
  const tpOptions = [
    { label: 'None', val: undefined },
    { label: '15p', val: 15 },
    { label: '30p', val: 30 },
    { label: '50p', val: 50 },
    { label: '100p', val: 100 },
  ];

  const bidPrice = currentTick?.bid ? currentTick.bid.toFixed(cfg.digits) : '---';
  const askPrice = currentTick?.ask ? currentTick.ask.toFixed(cfg.digits) : '---';

  const totalOpenFloating = openTrades.reduce((acc, t) => acc + t.pnl, 0);
  const pipDollarValue = (cfg.pipScale * cfg.contractSize * selectedLot).toFixed(2);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-arena-800 bg-arena-900/60 p-4 backdrop-blur-sm">
      {/* 1-Click Fast Execution Status Banner */}
      <div className="flex items-center justify-between rounded-lg bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 font-mono text-xs">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
          <span className="font-black uppercase tracking-wider">1-Click Fast Trading: ACTIVE</span>
        </div>
        <span className="text-[11px] text-emerald-300 font-semibold">
          1 Pip = ${pipDollarValue}
        </span>
      </div>

      {/* Lot Presets */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-arena-400">Execution Size:</span>
          <span className="text-white font-bold">
            {selectedLot} Lot {selectedLot === 0.01 && <span className="text-emerald-400 text-[10px] font-normal">(Safe Default)</span>}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {lotOptions.map((lot) => (
            <button
              key={lot}
              onClick={() => setSelectedLot(lot)}
              disabled={disabled}
              className={`rounded-lg py-1.5 text-xs font-mono font-semibold transition ${
                selectedLot === lot
                  ? 'bg-emerald-400 text-arena-950 font-black shadow-sm ring-1 ring-emerald-300'
                  : 'bg-arena-800/80 text-arena-300 hover:bg-arena-750 hover:text-white'
              }`}
            >
              {lot} L
            </button>
          ))}
        </div>
      </div>

      {/* Instant 1-Click 0.01 Quick Buttons Bar */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onExecute('SELL', 0.01, slPips, tpPips)}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/30 py-2 font-mono text-xs font-bold text-rose-300 hover:bg-rose-900/50 hover:text-white transition active:scale-95 disabled:opacity-50"
        >
          <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
          <span>1-Click SELL 0.01 L</span>
        </button>

        <button
          onClick={() => onExecute('BUY', 0.01, slPips, tpPips)}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 py-2 font-mono text-xs font-bold text-emerald-300 hover:bg-emerald-900/50 hover:text-white transition active:scale-95 disabled:opacity-50"
        >
          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
          <span>1-Click BUY 0.01 L</span>
        </button>
      </div>

      {/* Main Buy / Sell Split Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* SELL Button (Bid) */}
        <button
          onClick={() => onExecute('SELL', selectedLot, slPips, tpPips)}
          disabled={disabled}
          className="group relative flex flex-col items-center justify-center rounded-xl border border-rose-500/40 bg-gradient-to-b from-rose-950/40 to-rose-900/80 p-4 transition-all duration-150 hover:border-rose-400 hover:from-rose-900/60 hover:to-rose-800/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-rose-950/30"
        >
          <div className="flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-rose-300">
            <ArrowDownRight className="h-4 w-4" />
            <span>SELL ({selectedLot}L)</span>
          </div>
          <span className="mt-1 font-mono text-xl sm:text-2xl font-black tracking-tight text-white group-hover:scale-105 transition-transform">
            {bidPrice}
          </span>
          <span className="mt-0.5 font-mono text-[10px] text-rose-300/80">
            1-Click at Deriv Bid
          </span>
        </button>

        {/* BUY Button (Ask) */}
        <button
          onClick={() => onExecute('BUY', selectedLot, slPips, tpPips)}
          disabled={disabled}
          className="group relative flex flex-col items-center justify-center rounded-xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 to-emerald-900/80 p-4 transition-all duration-150 hover:border-emerald-400 hover:from-emerald-900/60 hover:to-emerald-800/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-emerald-950/30"
        >
          <div className="flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
            <ArrowUpRight className="h-4 w-4" />
            <span>BUY ({selectedLot}L)</span>
          </div>
          <span className="mt-1 font-mono text-xl sm:text-2xl font-black tracking-tight text-white group-hover:scale-105 transition-transform">
            {askPrice}
          </span>
          <span className="mt-0.5 font-mono text-[10px] text-emerald-300/80">
            1-Click at Deriv Ask
          </span>
        </button>
      </div>

      {/* Liquidation Rule Warning Badge */}
      <div className="rounded-lg bg-rose-950/30 border border-rose-500/25 px-3 py-1.5 font-mono text-[10px] text-rose-300 flex items-center justify-between">
        <span className="flex items-center gap-1 font-semibold">
          <Shield className="h-3 w-3 text-rose-400" />
          Liquidation Limit:
        </span>
        <strong className="text-white font-bold">Over $600 Loss = Instant Knockout</strong>
      </div>

      {/* Stop Loss & Take Profit Selection */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-arena-800/80">
        {/* SL */}
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-semibold uppercase text-rose-400 flex items-center gap-1">
            <Shield className="h-3 w-3" /> Stop Loss
          </span>
          <div className="grid grid-cols-5 gap-1">
            {slOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSlPips(opt.val)}
                className={`rounded py-1 text-[10px] font-mono font-medium transition ${
                  slPips === opt.val
                    ? 'bg-rose-500 text-white font-bold'
                    : 'bg-arena-850 text-arena-400 hover:bg-arena-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* TP */}
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-semibold uppercase text-emerald-400 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Take Profit
          </span>
          <div className="grid grid-cols-5 gap-1">
            {tpOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => setTpPips(opt.val)}
                className={`rounded py-1 text-[10px] font-mono font-medium transition ${
                  tpPips === opt.val
                    ? 'bg-emerald-500 text-white font-bold'
                    : 'bg-arena-850 text-arena-400 hover:bg-arena-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Flatten All Open Trades Button */}
      {openTrades.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-arena-850 p-2.5 border border-arena-800">
          <div className="flex flex-col font-mono">
            <span className="text-[10px] text-arena-400 uppercase">
              {openTrades.length} Active {openTrades.length === 1 ? 'Trade' : 'Trades'}
            </span>
            <span
              className={`text-xs font-bold ${
                totalOpenFloating >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalOpenFloating >= 0 ? `+$${totalOpenFloating.toFixed(2)}` : `-$${Math.abs(totalOpenFloating).toFixed(2)}`}
            </span>
          </div>

          <button
            onClick={onCloseAll}
            className="flex items-center gap-1.5 rounded-md bg-arena-800 px-3 py-1.5 text-xs font-mono font-bold text-rose-300 hover:bg-rose-500 hover:text-white transition"
          >
            <Ban className="h-3.5 w-3.5" />
            <span>FLATTEN ALL</span>
          </button>
        </div>
      )}
    </div>
  );
}
