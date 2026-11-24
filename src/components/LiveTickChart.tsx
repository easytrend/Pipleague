'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Candle, MarketTick, SUPPORTED_SYMBOLS, SymbolKey, Timeframe, TIMEFRAME_SECONDS, TradePosition } from '@/lib/types';
import { derivFeed } from '@/lib/deriv-feed';
import { ArrowRight, Crosshair, MoveHorizontal, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

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

  // Chart view viewport controls: zoom & scroll/pan
  const [visibleCount, setVisibleCount] = useState<number>(40); // Number of candles visible (15 to 100)
  const [panOffset, setPanOffset] = useState<number>(0); // 0 = pinned to latest live candle, > 0 = scrolled back in history
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartPanRef = useRef<number>(0);

  // Crosshair & hover inspection HUD
  const [hoverData, setHoverData] = useState<{
    x: number;
    y: number;
    price: number;
    candle?: Candle;
    timeText?: string;
  } | null>(null);

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

  // Mouse wheel zoom handler (scroll up = zoom in, scroll down = zoom out)
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? -4 : 4;
    setVisibleCount((prev) => Math.max(15, Math.min(100, prev + zoomDelta)));
  }, []);

  // Mouse drag handlers to scroll through historical chart
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      dragStartXRef.current = e.clientX;
      dragStartPanRef.current = panOffset;
    },
    [panOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isDragging) {
        const deltaX = e.clientX - dragStartXRef.current;
        const rightGutter = 75;
        const plotWidth = rect.width - rightGutter - 15;
        const candleSpacing = plotWidth / visibleCount;
        const candleDelta = Math.round(deltaX / candleSpacing);
        const maxPan = Math.max(0, candles.length - visibleCount);
        setPanOffset(Math.max(0, Math.min(maxPan, dragStartPanRef.current + candleDelta)));
      }

      // Calculate hovered candle
      if (timeframe !== 'tick' && candles.length > 0) {
        const total = candles.length;
        const endIdx = Math.max(visibleCount, total - panOffset);
        const startIdx = Math.max(0, endIdx - visibleCount);
        const visible = candles.slice(startIdx, endIdx);

        const rightGutter = 75;
        const plotWidth = rect.width - rightGutter - 15;
        const candleSpacing = plotWidth / visible.length;

        const candleIndex = Math.floor((mouseX - 15) / candleSpacing);
        const candle = visible[candleIndex];

        let timeText: string | undefined;
        if (candle?.epoch) {
          const d = new Date(candle.epoch * 1000);
          timeText = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }

        setHoverData({
          x: mouseX,
          y: mouseY,
          price: 0, // Computed in render loop
          candle,
          timeText,
        });
      } else {
        setHoverData({ x: mouseX, y: mouseY, price: 0 });
      }
    },
    [isDragging, visibleCount, candles, panOffset, timeframe]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoverData(null);
  }, []);

  // Touch handlers for mobile / tablet drag
  const touchStartXRef = useRef<number>(0);
  const touchStartPanRef = useRef<number>(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 1) {
        touchStartXRef.current = e.touches[0].clientX;
        touchStartPanRef.current = panOffset;
      }
    },
    [panOffset]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 1) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const deltaX = e.touches[0].clientX - touchStartXRef.current;
        const rightGutter = 75;
        const plotWidth = rect.width - rightGutter - 15;
        const candleSpacing = plotWidth / visibleCount;
        const candleDelta = Math.round(deltaX / candleSpacing);
        const maxPan = Math.max(0, candles.length - visibleCount);
        setPanOffset(Math.max(0, Math.min(maxPan, touchStartPanRef.current + candleDelta)));
      }
    },
    [visibleCount, candles.length]
  );

  // Canvas Render Loop with DPI Scaling, Scroll Window, and Crosshair
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
        const total = candles.length;
        const endIdx = Math.max(visibleCount, total - panOffset);
        const startIdx = Math.max(0, endIdx - visibleCount);
        const visibleCandles = candles.slice(startIdx, endIdx);

        // Pin the latest candle to the exact current live tick quote when live (panOffset === 0)
        if (panOffset === 0 && currentTick?.quote && visibleCandles.length > 0) {
          const last = visibleCandles[visibleCandles.length - 1];
          last.close = currentTick.quote;
          if (currentTick.quote > last.high) last.high = currentTick.quote;
          if (currentTick.quote < last.low) last.low = currentTick.quote;
        }

        const highs = visibleCandles.map((c) => c.high);
        const lows = visibleCandles.map((c) => c.low);

        let minPrice = Math.min(...lows);
        let maxPrice = Math.max(...highs);

        if (panOffset === 0 && currentTick?.quote) {
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
        const getPriceFromY = (y: number) => maxPrice - ((y - 25) / (height - 50)) * priceRange;

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

        // Interactive Cursor Crosshair & Price Label
        if (hoverData && hoverData.x > 0 && hoverData.x < width - rightGutter && hoverData.y > 0 && hoverData.y < height) {
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1;

          // Horizontal crosshair line
          ctx.beginPath();
          ctx.moveTo(0, hoverData.y);
          ctx.lineTo(width - rightGutter, hoverData.y);
          ctx.stroke();

          // Vertical crosshair line
          ctx.beginPath();
          ctx.moveTo(hoverData.x, 0);
          ctx.lineTo(hoverData.x, height);
          ctx.stroke();

          // Crosshair Right Axis Price Badge
          const cursorPrice = getPriceFromY(hoverData.y);
          ctx.setLineDash([]);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(width - 72, hoverData.y - 9, 70, 18);
          ctx.strokeStyle = '#64748b';
          ctx.strokeRect(width - 72, hoverData.y - 9, 70, 18);

          ctx.fillStyle = '#f1f5f9';
          ctx.font = 'bold 9px ui-monospace, monospace';
          ctx.textAlign = 'right';
          ctx.fillText(cursorPrice.toFixed(cfg.digits), width - 6, hoverData.y + 4);

          // Timestamp pill at bottom of vertical crosshair
          if (hoverData.timeText) {
            ctx.fillStyle = '#0f172a';
            const pillW = 55;
            ctx.fillRect(hoverData.x - pillW / 2, height - 18, pillW, 16);
            ctx.strokeStyle = '#64748b';
            ctx.strokeRect(hoverData.x - pillW / 2, height - 18, pillW, 16);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(hoverData.timeText, hoverData.x, height - 6);
          }

          ctx.restore();
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
  }, [symbol, timeframe, candles, openTrades, currentTick, lastTickDirection, cfg, visibleCount, panOffset, hoverData]);

  const timeframes: (Timeframe | 'tick')[] = ['1m', '2m', '3m', '5m', '15m', 'tick'];

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col rounded-xl border border-arena-800 bg-arena-900/70 p-4 overflow-hidden backdrop-blur-sm select-none"
    >
      {/* Chart Top Bar with Timeframe Switchers & Viewport Zoom Controls */}
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
              onClick={() => {
                setTimeframe(tf);
                setPanOffset(0);
              }}
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

        {/* Zoom & Reset Viewport Buttons */}
        <div className="flex items-center gap-1 bg-arena-850 p-1 rounded-lg border border-arena-750 font-mono text-xs">
          <button
            onClick={() => setVisibleCount((prev) => Math.max(15, prev - 8))}
            className="rounded p-1 text-arena-400 hover:bg-arena-800 hover:text-white transition"
            title="Zoom In (Fewer candles, larger view)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setVisibleCount((prev) => Math.min(100, prev + 8))}
            className="rounded p-1 text-arena-400 hover:bg-arena-800 hover:text-white transition"
            title="Zoom Out (More candles, wider trend)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setVisibleCount(40);
              setPanOffset(0);
            }}
            className="rounded p-1 text-arena-400 hover:bg-arena-800 hover:text-white transition"
            title="Reset Chart View & Return to Live"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
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

      {/* Top Inspection Ribbon: Shows Hovered Candle OHLC values */}
      {hoverData?.candle && (
        <div className="flex items-center gap-3 pt-2 text-[11px] font-mono text-arena-300 border-b border-arena-800/40 pb-1">
          <span className="text-arena-400 font-semibold flex items-center gap-1">
            <Crosshair className="h-3 w-3 text-cyan-400" />
            {hoverData.timeText || 'Candle'}:
          </span>
          <span>O: <strong className="text-white">{hoverData.candle.open.toFixed(cfg.digits)}</strong></span>
          <span>H: <strong className="text-emerald-400">{hoverData.candle.high.toFixed(cfg.digits)}</strong></span>
          <span>L: <strong className="text-rose-400">{hoverData.candle.low.toFixed(cfg.digits)}</strong></span>
          <span>C: <strong className="text-white">{hoverData.candle.close.toFixed(cfg.digits)}</strong></span>
          <span className={`font-bold ${hoverData.candle.close >= hoverData.candle.open ? 'text-emerald-400' : 'text-rose-400'}`}>
            {hoverData.candle.close >= hoverData.candle.open ? '+' : ''}
            {(hoverData.candle.close - hoverData.candle.open).toFixed(cfg.digits)}
          </span>
        </div>
      )}

      {/* Canvas Area with Interactive Drag Cursor & Wheel Zoom */}
      <div className="relative h-64 sm:h-72 w-full mt-2">
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          className={`h-full w-full block ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        />

        {/* Floating "Return to Live" Badge if user has scrolled back in history */}
        {panOffset > 0 && (
          <button
            onClick={() => setPanOffset(0)}
            className="absolute bottom-3 right-20 flex items-center gap-1.5 rounded-full bg-emerald-500/90 text-arena-950 px-3 py-1 text-xs font-mono font-black uppercase tracking-wider shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition animate-bounce"
          >
            <span>LIVE NOW</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Chart Footer with Candle Countdown & Drag/Zoom Interaction Hints */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-arena-800/60 text-[11px] font-mono text-arena-400">
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

        <div className="flex items-center gap-2 text-arena-400">
          <span className="flex items-center gap-1 text-[10px] text-arena-400/90">
            <MoveHorizontal className="h-3 w-3 text-cyan-400" />
            Drag to scroll &bull; Mouse wheel / buttons to zoom
          </span>
          <span>&bull;</span>
          <span>
            Spread: <strong className="text-arena-200">{cfg.defaultSpreadPips}p</strong>
          </span>
        </div>
      </div>
    </div>
  );
}