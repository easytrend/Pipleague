'use client';

import React, { useEffect, useRef } from 'react';
import { MarketTick, SUPPORTED_SYMBOLS, SymbolKey, TradePosition } from '@/lib/types';

interface LiveTickChartProps {
  symbol: SymbolKey;
  currentTick: MarketTick;
  openTrades?: TradePosition[];
}

export default function LiveTickChart({ symbol, currentTick, openTrades = [] }: LiveTickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tickHistoryRef = useRef<{ price: number; time: number }[]>([]);
  const cfg = SUPPORTED_SYMBOLS[symbol];

  // Record incoming tick into buffer
  useEffect(() => {
    if (!currentTick || !currentTick.quote) return;
    const history = tickHistoryRef.current;
    history.push({ price: currentTick.quote, time: currentTick.time });
    if (history.length > 80) {
      history.shift();
    }
  }, [currentTick]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const history = tickHistoryRef.current;
      if (history.length < 2) {
        animationId = requestAnimationFrame(render);
        return;
      }

      const prices = history.map((h) => h.price);
      let minPrice = Math.min(...prices);
      let maxPrice = Math.max(...prices);

      // Include open trades in min/max bounds so lines are always visible
      openTrades.forEach((t) => {
        if (t.openPrice < minPrice) minPrice = t.openPrice;
        if (t.openPrice > maxPrice) maxPrice = t.openPrice;
      });

      // Add padding
      const padding = Math.max((maxPrice - minPrice) * 0.15, cfg.pipScale * 5);
      minPrice -= padding;
      maxPrice += padding;
      const priceRange = maxPrice - minPrice || 1;

      const getY = (val: number) => height - ((val - minPrice) / priceRange) * (height - 40) - 20;

      // Draw horizontal grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSteps = 4;
      for (let i = 0; i <= gridSteps; i++) {
        const y = 20 + ((height - 40) / gridSteps) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        const gridPrice = maxPrice - (i / gridSteps) * priceRange;
        ctx.fillStyle = '#54607b';
        ctx.font = '10px ui-monospace, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(gridPrice.toFixed(cfg.digits), width - 8, y - 4);
      }

      // Draw open trade levels
      openTrades.forEach((trade) => {
        const tradeY = getY(trade.openPrice);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = trade.side === 'BUY' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(0, tradeY);
        ctx.lineTo(width, tradeY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Trade tag
        ctx.fillStyle = trade.side === 'BUY' ? '#10b981' : '#f43f5e';
        ctx.fillRect(8, tradeY - 10, 85, 18);
        ctx.fillStyle = '#08090b';
        ctx.font = 'bold 9px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${trade.side} ${trade.lotSize}L @ ${trade.openPrice.toFixed(cfg.digits)}`,
          12,
          tradeY + 3
        );
      });

      // Draw Tick Wave line
      const stepX = width / (history.length - 1);
      ctx.beginPath();
      history.forEach((pt, idx) => {
        const x = idx * stepX;
        const y = getY(pt.price);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      // Line style
      const lastPrice = history[history.length - 1].price;
      const firstPrice = history[0].price;
      const isUp = lastPrice >= firstPrice;

      ctx.strokeStyle = isUp ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = isUp ? 'rgba(16, 185, 129, 0.5)' : 'rgba(244, 63, 94, 0.5)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Area fill underneath
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Current Price Pulse Point
      const lastX = width;
      const lastY = getY(lastPrice);
      ctx.beginPath();
      ctx.arc(lastX - 2, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = isUp ? '#34d399' : '#fb7185';
      ctx.fill();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [symbol, openTrades, cfg]);

  // Handle high-DPI resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative flex flex-col rounded-xl border border-arena-800 bg-arena-900/60 p-4 overflow-hidden backdrop-blur-sm">
      {/* Chart Header */}
      <div className="flex items-center justify-between pb-3 border-b border-arena-800/80">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold text-white flex items-center gap-2">
              {cfg.displayName}
              <span className="rounded bg-arena-800 px-1.5 py-0.5 font-mono text-[10px] text-arena-400">
                {cfg.category}
              </span>
            </span>
            <span className="font-mono text-[11px] text-arena-400">
              Deriv Symbol: <span className="text-arena-300">{cfg.derivSymbol}</span>
            </span>
          </div>
        </div>

        {/* Live Bid / Ask / Spread Badges */}
        <div className="flex items-center gap-2 font-mono">
          <div className="flex flex-col items-end rounded-lg bg-arena-850 px-2.5 py-1 border border-arena-750">
            <span className="text-[9px] uppercase tracking-wider text-arena-400">Live Quote</span>
            <span className="text-sm font-bold text-white">
              {currentTick?.quote ? currentTick.quote.toFixed(cfg.digits) : '---'}
            </span>
          </div>
          <div className="flex flex-col items-end rounded-lg bg-arena-850 px-2.5 py-1 border border-arena-750">
            <span className="text-[9px] uppercase tracking-wider text-emerald-400">Bid / Ask</span>
            <span className="text-[11px] font-semibold text-arena-300">
              {currentTick?.bid?.toFixed(cfg.digits)} / {currentTick?.ask?.toFixed(cfg.digits)}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative h-64 sm:h-72 w-full mt-2">
        <canvas ref={canvasRef} className="h-full w-full block" />
      </div>

      {/* Chart Footer Indicator */}
      <div className="flex items-center justify-between pt-2 border-t border-arena-800/60 text-[11px] font-mono text-arena-400">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Sub-second Deriv Tick Stream
        </span>
        <span>
          Contract: <strong className="text-arena-200">{cfg.contractSize.toLocaleString()} units</strong> / lot
        </span>
      </div>
    </div>
  );
}
