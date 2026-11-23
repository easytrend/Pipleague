# PipLeague | The Live Forex Esports Arena

> **Trade head-to-head on live markets with paper money. Synchronized opening bells, 15% peak-drawdown knockouts, and institutional Deriv tick feeds.**
> Zero real funds required. Full Deriv WebSocket live data + EarnDuel tournament & broadcast format + High-speed execution dock.

---

## 1. What is PipLeague?

PipLeague transforms forex trading into a live, competitive discipline sport.
Instead of risking real savings or dealing with cumbersome account setups:
- **Zero Friction**: Competitors join directly through one-click **Boarding Passes** (`/match/[id]?seat=A`). No deposits, no KYC, no installs.
- **Institutional Deriv Feed**: Real sub-second bid/ask price ticks for **EUR/USD, GBP/USD, USD/JPY, Gold (XAU/USD), and 24/7 Volatility Synthetics**.
- **Ring the Bell**: Matches start synchronously down to the millisecond, locking in baseline entry prices simultaneously.
- **The Knockout Rule (Discipline Over Degeneracy)**: If any trader's equity drops **15% below their highest peak equity**, the server triggers an automatic buzzer liquidation. They are eliminated from the round!
- **OBS Broadcast HUD**: Stream-ready 1080p overlay for Twitch, YouTube, and Kick broadcasters (`/match/[id]/stage`).

---

## 2. Supported Instruments & Markets

PipLeague connects to the Deriv Public WebSocket API (`wss://api.derivws.com/trading/v1/options/ws/public`), streaming free real-time institutional quotes:

| Pair / Asset | Deriv Symbol | Category | Digits | Default Spread |
| :--- | :--- | :--- | :--- | :--- |
| **EUR/USD** | `frxEURUSD` | Forex Majors | 5 | 0.8 pips |
| **GBP/USD** | `frxGBPUSD` | Forex Majors | 5 | 1.1 pips |
| **USD/JPY** | `frxUSDJPY` | Forex Majors | 3 | 1.0 pips |
| **XAU/USD** | `frxXAUUSD` | Metals / Gold | 2 | 2.5 pips |
| **Volatility 100** | `1HZ100V` | Synthetics (24/7) | 2 | 2.0 pips |

> **Weekend Feature:** Deriv Synthetic Indices run 24 hours a day, 7 days a week, 365 days a year—enabling trading competitions on Saturdays and Sundays when traditional forex markets are closed!

---

## 3. Project Routes

- **Landing Page (`/`)**: Discover matches, paste boarding passes, or jump into solo practice.
- **Host Director Console (`/host`)**: Pick market, duration, bankroll, knockout limit, issue pass links, and ring the bell.
- **Match Arena (`/match/[id]`)**: Full interactive trading floor with real-time tick chart, split Buy/Sell pad, lot sizes, and ringside corner scores.
- **Spectator / OBS Stage (`/match/[id]/stage`)**: Dedicated broadcast HUD for streaming matches.
- **Solo Practice Pad (`/solo`)**: Single-player simulator to test trading strategies against live Deriv ticks.

---

## 4. Quick Start & Local Run

```bash
cd pipleague
npm run dev
```

Open `http://localhost:3000` to start trading!
