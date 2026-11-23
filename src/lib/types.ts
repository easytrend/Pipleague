export type SymbolKey = 'EUR/USD' | 'GBP/USD' | 'USD/JPY' | 'XAU/USD' | 'Volatility 100';

export interface SymbolConfig {
  key: SymbolKey;
  derivSymbol: string;
  displayName: string;
  category: 'Forex' | 'Metals' | 'Synthetics 24/7';
  digits: number;
  pipScale: number; // 0.0001 for EUR/USD, 0.01 for USD/JPY, 0.1 for Gold
  pipMultiplier: number; // 10000 for EUR/USD, 100 for USD/JPY, 10 for Gold
  defaultSpreadPips: number;
  contractSize: number; // e.g. 100,000 for standard lot
}

export const SUPPORTED_SYMBOLS: Record<SymbolKey, SymbolConfig> = {
  'EUR/USD': {
    key: 'EUR/USD',
    derivSymbol: 'frxEURUSD',
    displayName: 'EUR/USD',
    category: 'Forex',
    digits: 5,
    pipScale: 0.0001,
    pipMultiplier: 10000,
    defaultSpreadPips: 0.8,
    contractSize: 100000,
  },
  'GBP/USD': {
    key: 'GBP/USD',
    derivSymbol: 'frxGBPUSD',
    displayName: 'GBP/USD (Cable)',
    category: 'Forex',
    digits: 5,
    pipScale: 0.0001,
    pipMultiplier: 10000,
    defaultSpreadPips: 1.1,
    contractSize: 100000,
  },
  'USD/JPY': {
    key: 'USD/JPY',
    derivSymbol: 'frxUSDJPY',
    displayName: 'USD/JPY (Ninja)',
    category: 'Forex',
    digits: 3,
    pipScale: 0.01,
    pipMultiplier: 100,
    defaultSpreadPips: 1.0,
    contractSize: 100000,
  },
  'XAU/USD': {
    key: 'XAU/USD',
    derivSymbol: 'frxXAUUSD',
    displayName: 'XAU/USD (Gold)',
    category: 'Metals',
    digits: 2,
    pipScale: 0.1,
    pipMultiplier: 10,
    defaultSpreadPips: 2.5,
    contractSize: 100,
  },
  'Volatility 100': {
    key: 'Volatility 100',
    derivSymbol: '1HZ100V',
    displayName: 'Volatility 100 (24/7)',
    category: 'Synthetics 24/7',
    digits: 2,
    pipScale: 0.01,
    pipMultiplier: 100,
    defaultSpreadPips: 2.0,
    contractSize: 10,
  },
};

export interface MarketTick {
  symbol: SymbolKey;
  derivSymbol: string;
  quote: number;
  bid: number;
  ask: number;
  time: number;
  direction?: 'up' | 'down' | 'same';
}

export type OrderSide = 'BUY' | 'SELL';

export interface TradePosition {
  id: string;
  corner: 'A' | 'B';
  traderName: string;
  symbol: SymbolKey;
  side: OrderSide;
  lotSize: number;
  openPrice: number;
  openTime: number;
  closePrice?: number;
  closeTime?: number;
  slPips?: number;
  tpPips?: number;
  pnl: number;
  pips: number;
  status: 'OPEN' | 'CLOSED';
}

export interface CornerState {
  corner: 'A' | 'B';
  traderName: string;
  connected: boolean;
  speaking: boolean;
  muted: boolean;
  startingBalance: number;
  balance: number;
  equity: number;
  peakEquity: number;
  floatingPnl: number;
  realizedPnl: number;
  netPips: number;
  drawdownPercent: number; // 0 to 100%
  isKnockedOut: boolean;
  eliminatedAt?: number;
  openTrades: TradePosition[];
  closedTrades: TradePosition[];
}

export type MatchStatus = 'LOBBY' | 'COUNTDOWN' | 'ACTIVE' | 'PAUSED' | 'ENDED';

export interface MatchRoom {
  id: string;
  title: string;
  symbol: SymbolKey;
  status: MatchStatus;
  startingBalance: number;
  maxDrawdownPct: number; // e.g. 15 (means 15% drop from peak equity = knockout)
  durationSeconds: number; // e.g. 300 (5m), 900 (15m), 1800 (30m)
  timeRemaining: number;
  startedAt?: number;
  endedAt?: number;
  winner?: 'A' | 'B' | 'DRAW' | null;
  knockoutReason?: string;
  cornerA: CornerState;
  cornerB: CornerState;
  spectatorCount: number;
}
