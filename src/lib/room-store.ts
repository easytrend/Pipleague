import { CornerState, MatchRoom, MarketTick, OrderSide, SUPPORTED_SYMBOLS, SymbolKey, TradePosition } from './types';
import { sound } from './audio-effects';

export class RoomManager {
  private rooms: Map<string, MatchRoom> = new Map();

  constructor() {
    this.createDemoRoom();
  }

  private createDemoRoom(): MatchRoom {
    const demoId = 'london-open-882';
    const room: MatchRoom = {
      id: demoId,
      title: 'London Open Heat #1',
      symbol: 'EUR/USD',
      status: 'LOBBY',
      startingBalance: 10000,
      maxDrawdownPct: 15,
      maxDrawdownAmount: 600,
      durationSeconds: 300, // 5 min blitz
      timeRemaining: 300,
      spectatorCount: 42,
      cornerA: this.initCornerState('A', 'Alex_FX', 10000),
      cornerB: this.initCornerState('B', 'Sarah_Pips', 10000),
    };
    this.rooms.set(demoId, room);
    return room;
  }

  public initCornerState(corner: 'A' | 'B', traderName: string, balance: number): CornerState {
    return {
      corner,
      traderName,
      connected: true,
      speaking: false,
      muted: false,
      startingBalance: balance,
      balance,
      equity: balance,
      peakEquity: balance,
      floatingPnl: 0,
      realizedPnl: 0,
      netPips: 0,
      drawdownPercent: 0,
      drawdownAmount: 0,
      isKnockedOut: false,
      openTrades: [],
      closedTrades: [],
    };
  }

  public getRoom(id: string): MatchRoom | undefined {
    return this.rooms.get(id);
  }

  public createRoom(params: {
    title: string;
    symbol: SymbolKey;
    startingBalance: number;
    durationSeconds: number;
    maxDrawdownPct: number;
    maxDrawdownAmount?: number;
    traderAName?: string;
    traderBName?: string;
  }): MatchRoom {
    const id = 'pl-' + Math.random().toString(36).substring(2, 8);
    const room: MatchRoom = {
      id,
      title: params.title || 'PipLeague Arena Match',
      symbol: params.symbol,
      status: 'LOBBY',
      startingBalance: params.startingBalance,
      maxDrawdownPct: params.maxDrawdownPct,
      maxDrawdownAmount: params.maxDrawdownAmount || 600,
      durationSeconds: params.durationSeconds,
      timeRemaining: params.durationSeconds,
      spectatorCount: 1,
      cornerA: this.initCornerState('A', params.traderAName || 'Corner A', params.startingBalance),
      cornerB: this.initCornerState('B', params.traderBName || 'Corner B', params.startingBalance),
    };
    this.rooms.set(id, room);
    return room;
  }

  public ringTheBell(roomId: string): MatchRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.status = 'ACTIVE';
    room.startedAt = Date.now();
    sound.playBell();

    return room;
  }

  public executeTrade(
    roomId: string,
    corner: 'A' | 'B',
    side: OrderSide,
    lotSize: number,
    tick: MarketTick,
    slPips?: number,
    tpPips?: number
  ): TradePosition | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'ACTIVE') return null;

    const cornerState = corner === 'A' ? room.cornerA : room.cornerB;
    if (cornerState.isKnockedOut) return null;

    // Buy fills at Ask, Sell fills at Bid
    const executionPrice = side === 'BUY' ? tick.ask : tick.bid;

    const newTrade: TradePosition = {
      id: 'trade-' + Math.random().toString(36).substring(2, 9),
      corner,
      traderName: cornerState.traderName,
      symbol: room.symbol,
      side,
      lotSize,
      openPrice: executionPrice,
      openTime: Date.now(),
      slPips,
      tpPips,
      pnl: 0,
      pips: 0,
      status: 'OPEN',
    };

    cornerState.openTrades.push(newTrade);
    sound.playOrderFill(side);

    this.recalculateCorner(room, corner, tick);
    return newTrade;
  }

  public closeTrade(roomId: string, tradeId: string, tick: MarketTick): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    for (const corner of ['A', 'B'] as const) {
      const cornerState = corner === 'A' ? room.cornerA : room.cornerB;
      const tradeIndex = cornerState.openTrades.findIndex((t) => t.id === tradeId);
      if (tradeIndex !== -1) {
        const trade = cornerState.openTrades[tradeIndex];
        const closePrice = trade.side === 'BUY' ? tick.bid : tick.ask;

        trade.closePrice = closePrice;
        trade.closeTime = Date.now();
        trade.status = 'CLOSED';

        const cfg = SUPPORTED_SYMBOLS[room.symbol];
        const pipDiff =
          trade.side === 'BUY'
            ? (closePrice - trade.openPrice) * cfg.pipMultiplier
            : (trade.openPrice - closePrice) * cfg.pipMultiplier;

        trade.pips = Number(pipDiff.toFixed(1));
        trade.pnl = Number((pipDiff * (cfg.pipScale * cfg.contractSize * trade.lotSize)).toFixed(2));

        cornerState.balance += trade.pnl;
        cornerState.realizedPnl += trade.pnl;
        cornerState.closedTrades.push(trade);
        cornerState.openTrades.splice(tradeIndex, 1);

        this.recalculateCorner(room, corner, tick);
        return true;
      }
    }
    return false;
  }

  public closeAllTrades(roomId: string, corner: 'A' | 'B', tick: MarketTick) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const cornerState = corner === 'A' ? room.cornerA : room.cornerB;
    const tradesToClose = [...cornerState.openTrades];
    tradesToClose.forEach((trade) => this.closeTrade(roomId, trade.id, tick));
  }

  public updatePrices(roomId: string, tick: MarketTick) {
    const room = this.rooms.get(roomId);
    if (!room || room.symbol !== tick.symbol) return;

    this.recalculateCorner(room, 'A', tick);
    this.recalculateCorner(room, 'B', tick);

    // Check Knockouts
    this.checkKnockout(room, 'A');
    this.checkKnockout(room, 'B');
  }

  private recalculateCorner(room: MatchRoom, corner: 'A' | 'B', tick: MarketTick) {
    const cornerState = corner === 'A' ? room.cornerA : room.cornerB;
    if (cornerState.isKnockedOut) return;

    const cfg = SUPPORTED_SYMBOLS[room.symbol];
    let totalFloating = 0;
    let totalNetPips = cornerState.closedTrades.reduce((acc, t) => acc + t.pips, 0);

    cornerState.openTrades.forEach((trade) => {
      const currentPrice = trade.side === 'BUY' ? tick.bid : tick.ask;
      const pipDiff =
        trade.side === 'BUY'
          ? (currentPrice - trade.openPrice) * cfg.pipMultiplier
          : (trade.openPrice - currentPrice) * cfg.pipMultiplier;

      trade.pips = Number(pipDiff.toFixed(1));
      trade.pnl = Number((pipDiff * (cfg.pipScale * cfg.contractSize * trade.lotSize)).toFixed(2));

      totalFloating += trade.pnl;
      totalNetPips += trade.pips;

      // Auto TP / SL execution & single-trade liquidation limit
      const maxLoss = room.maxDrawdownAmount || 600;
      if (trade.tpPips && trade.pips >= trade.tpPips) {
        setTimeout(() => this.closeTrade(room.id, trade.id, tick), 0);
      } else if (trade.slPips && trade.pips <= -trade.slPips) {
        setTimeout(() => this.closeTrade(room.id, trade.id, tick), 0);
      } else if (trade.pnl <= -maxLoss) {
        // Individual position liquidation if single trade loss reaches threshold
        setTimeout(() => this.closeTrade(room.id, trade.id, tick), 0);
      }
    });

    cornerState.floatingPnl = Number(totalFloating.toFixed(2));
    cornerState.equity = Number((cornerState.balance + totalFloating).toFixed(2));
    cornerState.netPips = Number(totalNetPips.toFixed(1));

    if (cornerState.equity > cornerState.peakEquity) {
      cornerState.peakEquity = cornerState.equity;
    }

    // Cumulative drawdown & loss amount calculation
    const lossFromPeak = Math.max(0, cornerState.peakEquity - cornerState.equity);
    const lossFromStart = Math.max(0, cornerState.startingBalance - cornerState.equity);
    const totalCurrentLoss = Math.max(lossFromPeak, lossFromStart, -cornerState.floatingPnl);
    cornerState.drawdownAmount = Number(totalCurrentLoss.toFixed(2));

    if (cornerState.peakEquity > 0) {
      const ddPct = Math.max(0, (lossFromPeak / cornerState.peakEquity) * 100);
      cornerState.drawdownPercent = Number(ddPct.toFixed(2));
    }
  }

  private checkKnockout(room: MatchRoom, corner: 'A' | 'B') {
    if (room.status !== 'ACTIVE') return;
    const cornerState = corner === 'A' ? room.cornerA : room.cornerB;
    const opponent = corner === 'A' ? room.cornerB : room.cornerA;

    const maxLoss = room.maxDrawdownAmount || 600;
    const isOverLossLimit = cornerState.drawdownAmount >= maxLoss;
    const isOverPctLimit = cornerState.drawdownPercent >= room.maxDrawdownPct;

    if (!cornerState.isKnockedOut && (isOverLossLimit || isOverPctLimit)) {
      cornerState.isKnockedOut = true;
      cornerState.eliminatedAt = Date.now();
      cornerState.openTrades = []; // Force liquidate all positions
      room.status = 'ENDED';
      room.winner = opponent.corner;
      room.knockoutReason = isOverLossLimit
        ? `${cornerState.traderName} LIQUIDATED: Loss reached $${cornerState.drawdownAmount.toFixed(2)} (Exceeded $${maxLoss} limit)`
        : `${cornerState.traderName} exceeded ${room.maxDrawdownPct}% Max Drawdown (Knockout)`;
      sound.playKnockoutBuzzer();
    }
  }

  public tickClock(roomId: string): MatchRoom | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'ACTIVE') return null;

    room.timeRemaining = Math.max(0, room.timeRemaining - 1);

    if (room.timeRemaining <= 10 && room.timeRemaining > 0) {
      sound.playCountdownTick();
    }

    if (room.timeRemaining === 0) {
      room.status = 'ENDED';
      room.endedAt = Date.now();
      sound.playBell();

      // Determine winner by Equity
      if (room.cornerA.equity > room.cornerB.equity) {
        room.winner = 'A';
      } else if (room.cornerB.equity > room.cornerA.equity) {
        room.winner = 'B';
      } else {
        room.winner = 'DRAW';
      }
    }

    return room;
  }
}

export const roomManager = new RoomManager();
