'use client';

import React from 'react';
import { CornerState, SUPPORTED_SYMBOLS, SymbolKey } from '@/lib/types';
import { AlertOctagon, CheckCircle2, Mic, MicOff, ShieldAlert, TrendingDown, TrendingUp, X } from 'lucide-react';

interface CornerCardProps {
  corner: CornerState;
  symbol: SymbolKey;
  maxDrawdownPct: number;
  isUserCorner?: boolean;
  onToggleMute?: () => void;
  onCloseTrade?: (tradeId: string) => void;
}

export default function CornerCard({
  corner,
  symbol,
  maxDrawdownPct,
  isUserCorner = false,
  onToggleMute,
  onCloseTrade,
}: CornerCardProps) {
  const cfg = SUPPORTED_SYMBOLS[symbol];
  const isA = corner.corner === 'A';
  const themeColor = isA ? 'emerald' : 'cyan';

  const ddProgress = Math.min(100, (corner.drawdownPercent / maxDrawdownPct) * 100);
  const isDangerDD = corner.drawdownPercent >= maxDrawdownPct * 0.75;

  return (
    <div
      className={`relative flex flex-col rounded-xl border p-4 backdrop-blur-sm transition-all duration-200 ${
        corner.isKnockedOut
          ? 'border-rose-900/60 bg-rose-950/20 opacity-70'
          : isA
          ? 'border-emerald-500/30 bg-arena-900/80 shadow-lg shadow-emerald-950/20'
          : 'border-cyan-500/30 bg-arena-900/80 shadow-lg shadow-cyan-950/20'
      }`}
    >
      {/* Knockout Overlay Banner if Eliminated */}
      {corner.isKnockedOut && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-arena-950/85 backdrop-blur-md p-4 text-center">
          <AlertOctagon className="h-10 w-10 text-rose-500 animate-bounce mb-2" />
          <span className="font-mono text-base font-black uppercase tracking-wider text-rose-400">
            KNOCKED OUT
          </span>
          <span className="mt-1 font-mono text-xs text-arena-400 max-w-xs">
            Exceeded {maxDrawdownPct}% Trailing Drawdown Limit. All positions liquidated.
          </span>
        </div>
      )}

      {/* Corner Header */}
      <div className="flex items-center justify-between pb-3 border-b border-arena-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-black text-arena-950 ${
              isA ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
            }`}
          >
            {corner.corner}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white flex items-center gap-1.5">
              {corner.traderName}
              {isUserCorner && (
                <span className="rounded bg-arena-800 px-1.5 py-0.2 text-[9px] font-mono text-arena-300">
                  YOU
                </span>
              )}
            </span>
            <span className="font-mono text-[10px] text-arena-400 uppercase">
              Corner {corner.corner} Contender
            </span>
          </div>
        </div>

        {/* Audio / Mic Indicator */}
        <div className="flex items-center gap-1.5">
          {corner.speaking && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400 animate-pulse border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              VOICE
            </span>
          )}

          {isUserCorner && (
            <button
              onClick={onToggleMute}
              className={`rounded-lg p-1.5 text-xs transition border ${
                corner.muted
                  ? 'border-rose-800 bg-rose-950/40 text-rose-400'
                  : 'border-arena-700 bg-arena-800 text-arena-300 hover:text-white'
              }`}
              title={corner.muted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {corner.muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Score Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 py-3 border-b border-arena-800/80 font-mono text-center">
        {/* Equity */}
        <div className="flex flex-col rounded-lg bg-arena-850/60 p-2 border border-arena-800">
          <span className="text-[10px] uppercase text-arena-400">Equity</span>
          <span
            className={`text-sm font-black ${
              corner.equity >= corner.startingBalance ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            ${corner.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-arena-500">
            Bal: ${corner.balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Net Pips */}
        <div className="flex flex-col rounded-lg bg-arena-850/60 p-2 border border-arena-800">
          <span className="text-[10px] uppercase text-arena-400">Net Pips</span>
          <span
            className={`text-sm font-black flex items-center justify-center gap-0.5 ${
              corner.netPips >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {corner.netPips >= 0 ? '+' : ''}
            {corner.netPips.toFixed(1)}
            <span className="text-[10px] font-normal text-arena-400">p</span>
          </span>
          <span className="text-[9px] text-arena-500">
            {corner.closedTrades.length} Closed
          </span>
        </div>

        {/* Floating PnL */}
        <div className="flex flex-col rounded-lg bg-arena-850/60 p-2 border border-arena-800">
          <span className="text-[10px] uppercase text-arena-400">Floating PnL</span>
          <span
            className={`text-sm font-black ${
              corner.floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {corner.floatingPnl >= 0 ? `+$${corner.floatingPnl.toFixed(2)}` : `-$${Math.abs(corner.floatingPnl).toFixed(2)}`}
          </span>
          <span className="text-[9px] text-arena-500">
            {corner.openTrades.length} Active
          </span>
        </div>
      </div>

      {/* Knockout Drawdown Pressure Meter */}
      <div className="flex flex-col gap-1.5 py-3 border-b border-arena-800/80 font-mono">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-arena-400">
            <ShieldAlert className={`h-3.5 w-3.5 ${isDangerDD ? 'text-rose-400 animate-pulse' : 'text-arena-400'}`} />
            Peak Drawdown:
          </span>
          <span className={`font-bold ${isDangerDD ? 'text-rose-400 font-black' : 'text-white'}`}>
            {corner.drawdownPercent.toFixed(1)}% / {maxDrawdownPct}% Limit
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-arena-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              isDangerDD ? 'bg-rose-500 animate-pulse' : corner.drawdownPercent > 5 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${ddProgress}%` }}
          />
        </div>
      </div>

      {/* Active Open Positions List */}
      <div className="flex flex-col gap-1.5 pt-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-arena-400">
          Open Positions ({corner.openTrades.length})
        </span>

        {corner.openTrades.length === 0 ? (
          <div className="rounded-lg bg-arena-850/40 py-3 text-center font-mono text-[11px] text-arena-500 border border-arena-800/40">
            No open exposure. Sitting flat.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
            {corner.openTrades.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg bg-arena-850 p-2 font-mono text-[11px] border border-arena-800"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded px-1 py-0.5 text-[9px] font-bold ${
                      t.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {t.side} {t.lotSize}L
                  </span>
                  <span className="text-arena-400">@{t.openPrice.toFixed(cfg.digits)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.pnl >= 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`} ({t.pips >= 0 ? '+' : ''}{t.pips}p)
                  </span>

                  {isUserCorner && onCloseTrade && (
                    <button
                      onClick={() => onCloseTrade(t.id)}
                      className="rounded p-1 text-arena-400 hover:bg-arena-800 hover:text-white"
                      title="Close Trade"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
