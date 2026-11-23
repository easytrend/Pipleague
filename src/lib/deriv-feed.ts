import { MarketTick, SUPPORTED_SYMBOLS, SymbolKey } from './types';

type TickListener = (tick: MarketTick) => void;

class DerivFeedService {
  private ws: WebSocket | null = null;
  private listeners: Set<TickListener> = new Set();
  private currentTicks: Map<SymbolKey, MarketTick> = new Map();
  private subscribedSymbols: Set<SymbolKey> = new Set();
  private isConnecting: boolean = false;
  private fallbackInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

  constructor() {
    // Initialize base prices for fallback or instant display
    this.initDefaultPrices();
  }

  private initDefaultPrices() {
    const now = Date.now();
    const defaults: Record<SymbolKey, { quote: number; spread: number }> = {
      'EUR/USD': { quote: 1.09385, spread: 0.00008 },
      'GBP/USD': { quote: 1.29420, spread: 0.00012 },
      'USD/JPY': { quote: 154.650, spread: 0.012 },
      'XAU/USD': { quote: 3668.50, spread: 0.35 },
      'Volatility 100': { quote: 1689.50, spread: 0.40 },
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
    });
  }

  public getLatestTick(symbol: SymbolKey): MarketTick {
    return (
      this.currentTicks.get(symbol) || {
        symbol,
        derivSymbol: SUPPORTED_SYMBOLS[symbol].derivSymbol,
        quote: 1.0000,
        bid: 0.9999,
        ask: 1.0001,
        time: Date.now(),
        direction: 'same',
      }
    );
  }

  public subscribe(listener: TickListener): () => void {
    this.listeners.add(listener);
    // Send immediate snapshot of all current ticks
    this.currentTicks.forEach((tick) => listener(tick));
    this.ensureConnection();

    return () => {
      this.listeners.delete(listener);
    };
  }

  public watchSymbol(symbol: SymbolKey) {
    this.subscribedSymbols.add(symbol);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendDerivSubscription(symbol);
    }
  }

  private ensureConnection() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      // Connect to Deriv Public Options WebSocket (Streams real ticks without requiring an API key)
      const socket = new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');
      this.ws = socket;

      socket.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        // Clear fallback interval if running
        if (this.fallbackInterval) {
          clearInterval(this.fallbackInterval);
          this.fallbackInterval = null;
        }

        // Subscribe to all default symbols
        (Object.keys(SUPPORTED_SYMBOLS) as SymbolKey[]).forEach((sym) => {
          this.sendDerivSubscription(sym);
        });
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.tick) {
            this.handleIncomingDerivTick(data.tick);
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
        // Retry connection after 5 seconds
        setTimeout(() => this.ensureConnection(), 5000);
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
    // Find matching symbolKey
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
  }

  private startFallbackSimulation() {
    if (this.fallbackInterval) return;

    // Simulate micro-fluctuations so testing is always active even if offline or weekend
    this.fallbackInterval = setInterval(() => {
      const symbols: SymbolKey[] = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'Volatility 100'];
      const targetSym = symbols[Math.floor(Math.random() * symbols.length)];
      const prev = this.currentTicks.get(targetSym);
      if (!prev) return;

      const cfg = SUPPORTED_SYMBOLS[targetSym];
      const pipStep = cfg.pipScale;
      const changePips = (Math.random() - 0.49) * 1.5;
      const delta = changePips * pipStep;
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
    }, 400);
  }

  private broadcastTick(tick: MarketTick) {
    this.listeners.forEach((fn) => {
      try {
        fn(tick);
      } catch (err) {
        console.error('Tick listener error:', err);
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
