'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Candle, MarketTick, SUPPORTED_SYMBOLS, SymbolKey, Timeframe, TIMEFRAME_SECONDS, TradePosition } from '@/lib/types';
import { derivFeed } from '@/lib/deriv-feed';
import { Activity, BarChart3, Clock, LineChart, Sparkles } from 'lucide-react';

interface LiveTickChartProps {
  symbol: SymbolKey;
  currentTick: MarketTick;
  openTrades?: TradePosition[];
}

export default function LiveTickChart({ symbol, currentTick, openTrades = [] }: LiveTickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe | 'tick'>('1m');
  const [candles, setCandles] = useState<Candle[]>(() => derivFeed.getCandles(symbol, '1m'));
  const [secondsToNextCandle, setSecondsToNextCandle] = useState<number>(60);
  const [lastTickDirection, setLastTickDirection] = useState<'up' | 'down' | 'same'>('same');

  const tickHistoryRef = useRef<{ price: number; time: number }[]>([]);
  const cfg = SUPPORTED_SYMBOLS[symbol];

  // Record incoming ticks
  useEffect(() => {
    if (!currentTick || !currentTick.quote) return;
    const history = tickHistoryRef.current;
    history.push({ price: currentTick.quote, time: currentTick.time });
    if (history.length > 100) history.shift();
    if (currentTick.direction) setLastTickDirection(currentTick.direction);
  }, [currentTick]);

  // Subscribe to Deriv Candlesticks for active timeframe
  useEffect(() => {
    if (timeframe === 'tick') return;

    // Load existing candles without price jump
    const initial = derivFeed.getCandles(symbol, timeframe);
    setCandles([...initial]);

    const unsub = derivFeed.subscribeCandles(symbol, timeframe, (newCandles) => {
      if (newCandles && newCandles.length > 0) {
        setCandles([...newCandles]);
      }
    });

    return () => unsub();
  }, [symbol, timeframe]);

  // Candle countdown timer
  useEffect(() => {
    if (timeframe === 'tick') return;

    const interval = setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);
      const tfSec = TIMEFRAME_SECONDS[timeframe];
      const remainder = tfSec - (nowSec % tfSec);
      setSecondsToNextCandle(remainder);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeframe]);

  // Canvas Render Loop with Correct DPI Scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      // Ensure internal canvas size matches actual display size
      const targetWidth = Math.floor(rect.width * dpr);
      const targetHeight = Math.floor(rect.height * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.save();
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      // ==========================================
      // MODE 1: CANDLESTICK RENDERING (1m, 2m, 3m, 5m, 15m)
      // ==========================================
      if (timeframe !== 'tick' && candles.length > 0) {
        const visibleCandles = [...candles.slice(-40)];

        // Pin the latest candle to the exact current live tick quote in real time
        if (currentTick?.quote && visibleCandles.length > 0) {
          const last = visibleCandles[visibleCandles.length - 1];
          last.close = currentTick.quote;
          if (currentTick.quote > last.high) last.high = currentTick.quote;
          if (currentTick.quote < last.low) last.low = currentTick.quote;
        }

        const highs = visibleCandles.map((c) => c.high);
        const lows = visibleCandles.map((c) => c.low);

        let minPrice = Math.min(...lows);
        let maxPrice = Math.max(...highs);

        if (currentTick?.quote) {
          if (currentTick.quote > maxPrice) maxPrice = currentTick.quote;
          if (currentTick.quote < minPrice) minPrice = currentTick.quote;
        }

        openTrades.forEach((t) => {
          if (t.openPrice < minPrice) minPrice = t.openPrice;
          if (t.openPrice > maxPrice) maxPrice = t.openPrice;
        });

        const padding = Math.max((maxPrice - minPrice) * 0.15, cfg.pipScale * 6);
        minPrice -= padding;
        maxPrice += padding;
        const priceRange = maxPrice - minPrice || 1;

        const getY = (val: number) => height - ((val - minPrice) / priceRange) * (height - 50) - 25;

        // Draw horizontal grid lines & prices
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
          const y = 20 + ((height - 50) / gridSteps) * i;
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

        // Draw Open Trade Lines (BUY = green, SELL = red)
        openTrades.forEach((trade) => {
          const tradeY = getY(trade.openPrice);
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = trade.side === 'BUY' ? 'rgba(16, 185, 129, 0.85)' : 'rgba(244, 63, 94, 0.85)';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(0, tradeY);
          ctx.lineTo(width, tradeY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = trade.side === 'BUY' ? '#10b981' : '#f43f5e';
          ctx.fillRect(8, tradeY - 10, 100, 18);
          ctx.fillStyle = '#08090b';
          ctx.font = 'bold 9px ui-monospace, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(
            `${trade.side} ${trade.lotSize}L @ ${trade.openPrice.toFixed(cfg.digits)}`,
            12,
            tradeY + 3
          );
        });

        // Draw Japanese Candlesticks
        const rightGutter = 75;
        const plotWidth = width - rightGutter - 15;
        const candleSpacing = plotWidth / visibleCandles.length;
        const candleWidth = Math.max(3, candleSpacing - 3);

        visibleCandles.forEach((candle, idx) => {
          const x = 15 + idx * candleSpacing;
          const openY = getY(candle.open);
          const closeY = getY(candle.close);
          const highY = getY(candle.high);
          const lowY = getY(candle.low);

          const isBullish = candle.close >= candle.open;
          const color = isBullish ? '#10b981' : '#f43f5e';

          // Wick line
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x + candleWidth / 2, highY);
          ctx.lineTo(x + candleWidth / 2, lowY);
          ctx.stroke();

          // Candle body
          const bodyY = Math.min(openY, closeY);
          const bodyHeight = Math.max(2, Math.abs(closeY - openY));

          ctx.fillStyle = color;
          ctx.fillRect(x, bodyY, candleWidth, bodyHeight);
        });

        // Live Current Price Banner on Right Axis
        if (currentTick?.quote) {
          const currentY = getY(currentTick.quote);
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = lastTickDirection === 'up' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, currentY);
          ctx.lineTo(width, currentY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Right Price Tag Pill
          const tagBg = lastTickDirection === 'up' ? '#064e3b' : '#881337';
          const tagText = lastTickDirection === 'up' ? '#34d399' : '#fb7185';
          ctx.fillStyle = tagBg;
          ctx.fillRect(width - 72, currentY - 10, 70, 20);
          ctx.strokeStyle = tagText;
          ctx.strokeRect(width - 72, currentY - 10, 70, 20);

          ctx.fillStyle = tagText;
          ctx.font = 'bold 10px ui-monospace, monospace';
          ctx.textAlign = 'right';
          ctx.fillText(currentTick.quote.toFixed(cfg.digits), width - 6, currentY + 4);
        }
      }

      // ==========================================
      // MODE 2: TICK WAVE RENDERING
      // ==========================================
      else {
        const history = tickHistoryRef.current;
        if (history.length >= 2) {
          const prices = history.map((h) => h.price);
          let minPrice = Math.min(...prices);
          let maxPrice = Math.max(...prices);

          openTrades.forEach((t) => {
            if (t.openPrice < minPrice) minPrice = t.openPrice;
            if (t.openPrice > maxPrice) maxPrice = t.openPrice;
          });

          const padding = Math.max((maxPrice - minPrice) * 0.15, cfg.pipScale * 5);
          minPrice -= padding;
          maxPrice += padding;
          const priceRange = maxPrice - minPrice || 1;
          const getY = (val: number) => height - ((val - minPrice) / priceRange) * (height - 40) - 20;

          // Grid
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          for (let i = 0; i <= 4; i++) {
            const y = 20 + ((height - 40) / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            const gridPrice = maxPrice - (i / 4) * priceRange;
            ctx.fillStyle = '#54607b';
            ctx.font = '10px ui-monospace, monospace';
            ctx.textAlign = 'right';
            ctx.fillText(gridPrice.toFixed(cfg.digits), width - 8, y - 4);
          }

          // Line
          const stepX = width / (history.length - 1);
          ctx.beginPath();
          history.forEach((pt, idx) => {
            const x = idx * stepX;
            const y = getY(pt.price);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });

          const lastPrice = history[history.length - 1].price;
          const firstPrice = history[0].price;
          const isUp = lastPrice >= firstPrice;

          ctx.strokeStyle = isUp ? '#10b981' : '#f43f5e';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          const gradient = ctx.createLinearGradient(0, 0, 0, height);
          gradient.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [symbol, timeframe, candles, openTrades, currentTick, lastTickDirection, cfg]);

  const timeframes: (Timeframe | 'tick')[] = ['1m', '2m', '3m', '5m', '15m', 'tick'];

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col rounded-xl border border-arena-800 bg-arena-900/70 p-4 overflow-hidden backdrop-blur-sm"
    >
      {/* Chart Top Bar with Timeframe Switchers & Live Feed Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-arena-800/80">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold text-white flex items-center gap-2">
              {cfg.displayName}
              <span className="rounded bg-arena-800 px-1.5 py-0.5 font-mono text-[10px] text-arena-400">
                {cfg.category}
              </span>
            </span>
            <span className="font-mono text-[11px] text-arena-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Deriv Live Stream: <span className="text-arena-200 font-semibold">{cfg.derivSymbol}</span>
            </span>
          </div>
        </div>

        {/* Timeframe Buttons: 1m, 2m, 3m, 5m, 15m, tick */}
        <div className="flex items-center gap-1 rounded-lg bg-arena-850 p-1 border border-arena-750 font-mono text-xs">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded px-2.5 py-1 font-bold transition uppercase ${
                timeframe === tf
                  ? 'bg-emerald-500 text-arena-950 shadow-sm'
                  : 'text-arena-400 hover:text-white hover:bg-arena-800'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Live Bid / Ask Badges */}
        <div className="flex items-center gap-2 font-mono">
          <div className="flex flex-col items-end rounded-lg bg-arena-850 px-2.5 py-1 border border-arena-750">
            <span className="text-[9px] uppercase tracking-wider text-arena-400">Live Quote</span>
            <span
              className={`text-sm font-bold transition-colors duration-150 ${
                lastTickDirection === 'up'
                  ? 'text-emerald-400'
                  : lastTickDirection === 'down'
                  ? 'text-rose-400'
                  : 'text-white'
              }`}
            >
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

      {/* Chart Footer with Candle Countdown */}
      <div className="flex items-center justify-between pt-2 border-t border-arena-800/60 text-[11px] font-mono text-arena-400">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {timeframe !== 'tick' ? `${timeframe.toUpperCase()} Candlesticks` : 'Sub-second Tick Wave'}
          </span>
          {timeframe !== 'tick' && (
            <span className="text-arena-400">
              &bull; Next candle in <strong className="text-white">{secondsToNextCandle}s</strong>
            </span>
          )}
        </div>

        <span>
          Spread: <strong className="text-arena-200">{cfg.defaultSpreadPips} pips</strong> &bull; Contract: {cfg.contractSize.toLocaleString()}L
        </span>
      </div>
    </div>
  );
}
