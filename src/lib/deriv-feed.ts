import { Candle, MarketTick, SUPPORTED_SYMBOLS, SymbolKey, Timeframe, TIMEFRAME_SECONDS } from './types';

type TickListener = (tick: MarketTick) => void;
type CandleListener = (candles: Candle[]) => void;

class DerivFeedService {
  private ws: WebSocket | null = null;
  private tickListeners: Set<TickListener> = new Set();
  private candleListeners: Map<string, Set<CandleListener>> = new Map();
  private currentTicks: Map<SymbolKey, MarketTick> = new Map();
  private candlesMap: Map<string, Candle[]> = new Map();
  private subscribedSymbols: Set<SymbolKey> = new Set();
  private isConnecting: boolean = false;
  private fallbackInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private reqIdCounter: number = 100;
  private reqIdToKey: Map<number, { symbol: SymbolKey; timeframe: Timeframe }> = new Map();

  constructor() {
    this.initDefaultPrices();
  }

  private initDefaultPrices() {
    const now = Date.now();
    const defaults: Record<SymbolKey, { quote: number; spread: number }> = {
      'EUR/USD': { quote: 1.09350, spread: 0.00008 },
      'GBP/USD': { quote: 1.29420, spread: 0.00012 },
      'USD/JPY': { quote: 154.650, spread: 0.012 },
      'XAU/USD': { quote: 3668.50, spread: 0.35 },
      'Volatility 100': { quote: 1708.50, spread: 0.40 },
    };

    (Object.keys(defaults) as SymbolKey[]).forEach((sym) => {
      const cfg = SUPPORTED_SYMBOLS[sym];
      const d = defaults[sym];
      const bid = Number((d.quote - d.spread / 2).toFixed(cfg.digits));
      const ask = Number((d.quote + d.spread / 2).toFixed(cfg.digits));
      this.currentTicks.set(sym, {
        symbol: sym,
        derivSymbol: cfg.derivSymbol,
        quote: d.quote,
        bid,
        ask,
        time: now,
        direction: 'same',
      });

      // Generate seed candles ending exactly on d.quote for each timeframe
      (['1m', '2m', '3m', '5m', '15m'] as Timeframe[]).forEach((tf) => {
        this.generateInitialCandles(sym, tf, d.quote);
      });
    });
  }

  // Work backwards from basePrice so candle[last].close is ALWAYS basePrice (the live price)
  private generateInitialCandles(symbol: SymbolKey, timeframe: Timeframe, basePrice: number) {
    const cfg = SUPPORTED_SYMBOLS[symbol];
    const sec = TIMEFRAME_SECONDS[timeframe];
    const count = 50;
    const nowSec = Math.floor(Date.now() / 1000);
    const latestEpoch = Math.floor(nowSec / sec) * sec;

    const candles: Candle[] = new Array(count);
    let currClose = basePrice;

    for (let i = count - 1; i >= 0; i--) {
      const epoch = latestEpoch - (count - 1 - i) * sec;
      const variation = (Math.random() - 0.49) * (cfg.pipScale * 6);
      const open = Number((currClose - variation).toFixed(cfg.digits));
      const high = Number((Math.max(open, currClose) + Math.random() * cfg.pipScale * 3).toFixed(cfg.digits));
      const low = Number((Math.min(open, currClose) - Math.random() * cfg.pipScale * 3).toFixed(cfg.digits));

      candles[i] = {
        epoch,
        open,
        high,
        low,
        close: currClose,
      };

      currClose = open;
    }

    const key = `${symbol}_${timeframe}`;
    this.candlesMap.set(key, candles);
  }

  public getLatestTick(symbol: SymbolKey): MarketTick {
    return (
      this.currentTicks.get(symbol) || {
        symbol,
        derivSymbol: SUPPORTED_SYMBOLS[symbol].derivSymbol,
        quote: 1.09350,
        bid: 1.09346,
        ask: 1.09354,
        time: Date.now(),
        direction: 'same',
      }
    );
  }

  public getCandles(symbol: SymbolKey, timeframe: Timeframe): Candle[] {
    const key = `${symbol}_${timeframe}`;
    const latestTick = this.getLatestTick(symbol);
    let candles = this.candlesMap.get(key);

    if (!candles || candles.length === 0) {
      this.generateInitialCandles(symbol, timeframe, latestTick.quote);
      candles = this.candlesMap.get(key) || [];
    } else {
      // Ensure the very last candle always matches latest live quote
      const last = candles[candles.length - 1];
      if (last && latestTick?.quote) {
        last.close = latestTick.quote;
        if (latestTick.quote > last.high) last.high = latestTick.quote;
        if (latestTick.quote < last.low) last.low = latestTick.quote;
      }
    }

    return candles;
  }

  public subscribe(listener: TickListener): () => void {
    this.tickListeners.add(listener);
    this.currentTicks.forEach((tick) => listener(tick));
    this.ensureConnection();

    return () => {
      this.tickListeners.delete(listener);
    };
  }

  public subscribeCandles(symbol: SymbolKey, timeframe: Timeframe, listener: CandleListener): () => void {
    const key = `${symbol}_${timeframe}`;
    if (!this.candleListeners.has(key)) {
      this.candleListeners.set(key, new Set());
    }
    this.candleListeners.get(key)!.add(listener);

    // Send immediate snapshot with aligned price
    const current = this.getCandles(symbol, timeframe);
    listener(current);

    // Request from Deriv if connected
    this.requestDerivCandles(symbol, timeframe);
    this.ensureConnection();

    return () => {
      this.candleListeners.get(key)?.delete(listener);
    };
  }

  public watchSymbol(symbol: SymbolKey) {
    this.subscribedSymbols.add(symbol);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendDerivSubscription(symbol);
    }
  }

  private requestDerivCandles(symbol: SymbolKey, timeframe: Timeframe) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const cfg = SUPPORTED_SYMBOLS[symbol];
    const granularity = TIMEFRAME_SECONDS[timeframe];
    const reqId = ++this.reqIdCounter;
    this.reqIdToKey.set(reqId, { symbol, timeframe });

    this.ws.send(
      JSON.stringify({
        ticks_history: cfg.derivSymbol,
        end: 'latest',
        count: 50,
        style: 'candles',
        granularity: granularity,
        subscribe: 1,
        req_id: reqId,
      })
    );
  }

  private ensureConnection() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      const socket = new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');
      this.ws = socket;

      socket.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        if (this.fallbackInterval) {
          clearInterval(this.fallbackInterval);
          this.fallbackInterval = null;
        }

        // Subscribe to tick streams
        (Object.keys(SUPPORTED_SYMBOLS) as SymbolKey[]).forEach((sym) => {
          this.sendDerivSubscription(sym);
        });

        // Request subscribed candles
        this.candleListeners.forEach((_, key) => {
          const [sym, tf] = key.split('_') as [SymbolKey, Timeframe];
          this.requestDerivCandles(sym, tf);
        });
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.tick) {
            this.handleIncomingDerivTick(data.tick);
          } else if (data.msg_type === 'candles' && data.candles) {
            this.handleIncomingCandles(data);
          } else if (data.msg_type === 'ohlc' && data.ohlc) {
            this.handleIncomingOhlc(data.ohlc);
          }
        } catch {
          // Ignore parse errors
        }
      };

      socket.onerror = () => {
        this.isConnecting = false;
        this.startFallbackSimulation();
      };

      socket.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.startFallbackSimulation();
        setTimeout(() => this.ensureConnection(), 4000);
      };
    } catch {
      this.isConnecting = false;
      this.startFallbackSimulation();
    }
  }

  private sendDerivSubscription(symbolKey: SymbolKey) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const cfg = SUPPORTED_SYMBOLS[symbolKey];
    this.ws.send(
      JSON.stringify({
        ticks: cfg.derivSymbol,
        subscribe: 1,
      })
    );
  }

  private handleIncomingDerivTick(derivTick: { symbol: string; quote: number; bid?: number; ask?: number; epoch?: number }) {
    const foundEntry = Object.entries(SUPPORTED_SYMBOLS).find(
      ([, cfg]) => cfg.derivSymbol === derivTick.symbol
    );
    if (!foundEntry) return;

    const [symKey, cfg] = foundEntry as [SymbolKey, typeof SUPPORTED_SYMBOLS[SymbolKey]];
    const prevTick = this.currentTicks.get(symKey);

    const quote = Number(derivTick.quote.toFixed(cfg.digits));
    const spreadHalf = (cfg.defaultSpreadPips * cfg.pipScale) / 2;
    const bid = derivTick.bid !== undefined ? Number(derivTick.bid.toFixed(cfg.digits)) : Number((quote - spreadHalf).toFixed(cfg.digits));
    const ask = derivTick.ask !== undefined ? Number(derivTick.ask.toFixed(cfg.digits)) : Number((quote + spreadHalf).toFixed(cfg.digits));

    let direction: 'up' | 'down' | 'same' = 'same';
    if (prevTick) {
      if (quote > prevTick.quote) direction = 'up';
      else if (quote < prevTick.quote) direction = 'down';
    }

    const newTick: MarketTick = {
      symbol: symKey,
      derivSymbol: derivTick.symbol,
      quote,
      bid,
      ask,
      time: derivTick.epoch ? derivTick.epoch * 1000 : Date.now(),
      direction,
    };

    this.currentTicks.set(symKey, newTick);
    this.broadcastTick(newTick);

    // Update active candles with new tick price
    this.updateCandlesWithTick(symKey, quote, derivTick.epoch || Math.floor(Date.now() / 1000));
  }

  private handleIncomingCandles(data: { req_id?: number; candles: { epoch: number; open: number; high: number; low: number; close: number }[] }) {
    if (!data.req_id) return;
    const meta = this.reqIdToKey.get(data.req_id);
    if (!meta) return;

    const key = `${meta.symbol}_${meta.timeframe}`;
    const cleanCandles: Candle[] = data.candles.map((c) => ({
      epoch: c.epoch,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    // Align latest candle with our active live tick quote
    const latestTick = this.currentTicks.get(meta.symbol);
    if (latestTick && cleanCandles.length > 0) {
      const last = cleanCandles[cleanCandles.length - 1];
      last.close = latestTick.quote;
      if (latestTick.quote > last.high) last.high = latestTick.quote;
      if (latestTick.quote < last.low) last.low = latestTick.quote;
    }

    this.candlesMap.set(key, cleanCandles);
    this.broadcastCandles(key, cleanCandles);
  }

  private handleIncomingOhlc(ohlc: { symbol: string; granularity: number; epoch: number; open: number; high: number; low: number; close: number }) {
    const foundEntry = Object.entries(SUPPORTED_SYMBOLS).find(
      ([, cfg]) => cfg.derivSymbol === ohlc.symbol
    );
    if (!foundEntry) return;
    const [symKey] = foundEntry as [SymbolKey, typeof SUPPORTED_SYMBOLS[SymbolKey]];

    const tfEntry = Object.entries(TIMEFRAME_SECONDS).find(([, sec]) => sec === ohlc.granularity);
    if (!tfEntry) return;
    const [timeframe] = tfEntry as [Timeframe, number];

    const key = `${symKey}_${timeframe}`;
    const candles = this.candlesMap.get(key) || [];

    const lastIdx = candles.length - 1;
    if (lastIdx >= 0 && candles[lastIdx].epoch === ohlc.epoch) {
      candles[lastIdx] = {
        epoch: ohlc.epoch,
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
      };
    } else {
      candles.push({
        epoch: ohlc.epoch,
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
      });
      if (candles.length > 70) candles.shift();
    }

    this.candlesMap.set(key, [...candles]);
    this.broadcastCandles(key, candles);
  }

  private updateCandlesWithTick(symbol: SymbolKey, quote: number, epochSec: number) {
    (['1m', '2m', '3m', '5m', '15m'] as Timeframe[]).forEach((tf) => {
      const key = `${symbol}_${tf}`;
      const candles = this.candlesMap.get(key);
      if (!candles || candles.length === 0) return;

      const sec = TIMEFRAME_SECONDS[tf];
      const candleEpoch = Math.floor(epochSec / sec) * sec;

      const lastCandle = candles[candles.length - 1];
      if (lastCandle.epoch === candleEpoch) {
        lastCandle.close = quote;
        if (quote > lastCandle.high) lastCandle.high = quote;
        if (quote < lastCandle.low) lastCandle.low = quote;
      } else if (candleEpoch > lastCandle.epoch) {
        candles.push({
          epoch: candleEpoch,
          open: quote,
          high: quote,
          low: quote,
          close: quote,
        });
        if (candles.length > 70) candles.shift();
      }

      this.broadcastCandles(key, [...candles]);
    });
  }

  private startFallbackSimulation() {
    if (this.fallbackInterval) return;

    this.fallbackInterval = setInterval(() => {
      const symbols: SymbolKey[] = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'Volatility 100'];
      const targetSym = symbols[Math.floor(Math.random() * symbols.length)];
      const prev = this.currentTicks.get(targetSym);
      if (!prev) return;

      const cfg = SUPPORTED_SYMBOLS[targetSym];
      const changePips = (Math.random() - 0.49) * 1.5;
      const delta = changePips * cfg.pipScale;
      const newQuote = Number((prev.quote + delta).toFixed(cfg.digits));

      const spreadHalf = (cfg.defaultSpreadPips * cfg.pipScale) / 2;
      const bid = Number((newQuote - spreadHalf).toFixed(cfg.digits));
      const ask = Number((newQuote + spreadHalf).toFixed(cfg.digits));

      const updatedTick: MarketTick = {
        symbol: targetSym,
        derivSymbol: cfg.derivSymbol,
        quote: newQuote,
        bid,
        ask,
        time: Date.now(),
        direction: newQuote > prev.quote ? 'up' : newQuote < prev.quote ? 'down' : 'same',
      };

      this.currentTicks.set(targetSym, updatedTick);
      this.broadcastTick(updatedTick);
      this.updateCandlesWithTick(targetSym, newQuote, Math.floor(Date.now() / 1000));
    }, 500);
  }

  private broadcastTick(tick: MarketTick) {
    this.tickListeners.forEach((fn) => {
      try {
        fn(tick);
      } catch (err) {
        console.error('Tick listener error:', err);
      }
    });
  }

  private broadcastCandles(key: string, candles: Candle[]) {
    const listeners = this.candleListeners.get(key);
    if (!listeners) return;
    listeners.forEach((fn) => {
      try {
        fn(candles);
      } catch (err) {
        console.error('Candle listener error:', err);
      }
    });
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      activeSymbols: Array.from(this.currentTicks.keys()),
    };
  }
}

export const derivFeed = new DerivFeedService();
