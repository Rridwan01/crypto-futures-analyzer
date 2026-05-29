# 🚀 BANDHASHIRA: Crypto Futures Algorithmic Analyzer

BANDHASHIRA is a premium, real-time cryptocurrency futures trading analysis dashboard. Built with **React 19**, **Vite**, **Zustand**, and TradingView's **Lightweight Charts**, it provides professional-grade algorithmic charting, technical indicator computations, rule-based candlestick pattern recognition, and multi-indicator confluence scoring.

---

## 🌟 Key Features

### 1. Real-Time Data Streams & Direct Integration
*   **WebSockets Integration**: Establishes direct connection to `fstream.binance.com` for real-time Kline (candle) data and Aggregated Trade (`aggTrade`) streams.
*   **Cumulative Volume Delta (CVD)**: Real-time order flow momentum tracker computed directly from live tick-by-tick buyer/seller volume deltas.
*   **Order Book Flow**: Real-time bid/ask depth visualization showing buyer/seller walls, cumulative volumes, and order book imbalances.

### 2. Algorithmic Technical Indicators Engine
All technical indicators are calculated on a **rolling-window basis** in pure JavaScript for lightning-fast frontend computation:
*   **Moving Averages Stack**: Exponential Moving Averages (EMA 9, 21, 55) and Simple Moving Averages (SMA 200) for trend bias.
*   **Volume Weighted Average Price (VWAP)**: Session-anchored (daily reset) intraday institutional support/resistance level.
*   **Relative Strength Index (RSI)**: Includes a **RSI Divergence Detector** identifying regular and hidden bullish/bearish divergence patterns.
*   **MACD (Moving Average Convergence Divergence)**: Computes the MACD line, Signal line, and Histogram momentum.
*   **Bollinger Bands**: Volatility bands mapping Upper, Middle, Lower, Bandwidth, and %B values.
*   **Average True Range (ATR)** & **On-Balance Volume (OBV)**: For volatility tracking and volume direction confirmation.
*   **Volume Profile (VPVR)**: Computes Point of Control (POC), Value Area High (VAH), and Value Area Low (VAL) across 24 price bins.

### 3. Rule-Based Candlestick Pattern Recognition
Recognizes critical reversal and continuation candlestick formations dynamically:
*   **Single-Bar Patterns**: Doji, Marubozu, Hammer, Hanging Man, Shooting Star, Inverted Hammer.
*   **Double-Bar Patterns**: Bullish/Bearish Engulfing, Piercing Line, Dark Cloud Cover, Bullish/Bearish Harami, Tweezer Tops/Bottoms.
*   **Three-Bar Patterns**: Morning Star, Evening Star, Three White Soldiers, Three Black Crows.

### 4. High Timeframe (HTF) Trend & Bias Classification
*   **Broader Trend Context**: Automatically maps and loads HTF candles (e.g., 5m -> 1h, 15m -> 4h, 1h -> 1d) in the background.
*   **Dynamic Multiplier Modulation**: Classifies HTF bias (`STRONG_BULLISH`, `BULLISH`, `TRANSITIONAL`, etc.) and scales the main signal scores (boosting confluence on alignment or penalizing conflict).

### 5. Composite Confluence Scoring Engine
Combines technical metrics into a unified trend rating:
*   **Normalized Scorer**: Rates momentum from `-100` (Extreme Bearish) to `+100` (Extreme Bullish).
*   **Customizable Weights**: User-defined weights for RSI, MACD, Moving Averages, Volume, CVD, Patterns, and Market Sentiment.
*   **Confluence Check**: Require agreements from at least 3 categories before generating a `STRONG LONG` or `STRONG SHORT` recommendation.

### 6. Quantitative Strategy Backtester
*   **Historical Simulation Replay**: Replays the scoring strategy over the loaded 500-candle history.
*   **Trade Log Table**: Details entry/exit prices, direction, timestamps, and individual trade percentage returns based on a custom 3.0% TP and 1.5% SL risk profile.
*   **Advanced Metrics**: Displays performance stats including Trade count, Win Rate %, Profit Factor, Max Drawdown %, Sharpe Ratio, Net Compounded Return, and a custom SVG equity growth curve.

### 7. Multi-Symbol Market Scanner
*   Scans major futures pairs in the background (`BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `BNBUSDT`, `ARBUSDT`, `DOGEUSDT`).
*   Runs scoring computations asynchronously and updates a compact market table.
*   Triggers global system alerts when a remote scanned symbol hits a high-confluence setup.

### 8. CORS-Free Fallback Simulator
*   **Seamless Mock Simulator**: If the Binance API is rate-limited, blocked by CORS in production, or offline, the app automatically transitions to a **local real-time simulator**.
*   **Deterministic Mock Data**: Generates realistic seedable historical candles and real-time random-walk ticks, order books, and trade deltas so that the entire dashboard remains fully interactive offline.

### 9. Alerts & Custom Notifications
*   **Web Audio API Synth**: Plays soft synthesized tones (high frequency for long, low frequency for short signals).
*   **System Notifications**: Integrates with the browser's native Notification API to dispatch desktop push alerts on signal changes.
*   **Toast Manager**: Rich slide-in card toasts on the dashboard for instant signal awareness.

---

## 🛠️ Technology Stack

*   **Frontend Library**: [React 19](https://react.dev/)
*   **Build Tool**: [Vite](https://vite.dev/)
*   **State Management**: [Zustand 5](https://github.com/pmndrs/zustand)
*   **Charting Library**: [Lightweight Charts](https://krx.github.io/lightweight-charts/) (TradingView)
*   **Styling**: [TailwindCSS 3](https://tailwindcss.com/) & PostCSS
*   **Icons**: [Lucide React](https://lucide.dev/)

---

## 📂 Project Structure

```
crypto-futures-analyzer/
├── public/                 # Static assets
├── src/
│   ├── components/         # Dashboard UI Components
│   │   ├── AlertsManager.jsx      # System notification & UI toast manager
│   │   ├── ChartPanel.jsx         # Interactive candles, Bollinger Bands & MA chart
│   │   ├── IndicatorPanels.jsx    # RSI & MACD sub-charts
│   │   ├── MarketScanner.jsx      # Background scanning panel for watchlists
│   │   ├── OrderBookFlow.jsx      # Real-time bid/ask depth & imbalance bar
│   │   ├── QuantBacktestPanel.jsx # Quantitative backtest metrics & equity chart
│   │   ├── SentimentBar.jsx       # Fear & Greed / Funding / Open Interest ticker
│   │   ├── SettingsModal.jsx      # Customize parameters & indicators visibility
│   │   ├── SignalDashboard.jsx    # Score breakdown, confluence indicator & history
│   │   └── SymbolSwitcher.jsx     # Trading pair and timeframe selector
│   │
│   ├── services/           # Business Logic & Algorithms
│   │   ├── backtester.js          # Historical backtesting simulation engine
│   │   ├── binance.js             # API integrations, WebSocket stream & Simulator
│   │   ├── htfBias.js             # High timeframe trend classification logic
│   │   ├── indicators.js          # Technical indicator rolling-window algorithms
│   │   ├── patterns.js            # Candlestick pattern recognition rules
│   │   └── scorer.js              # Composite scoring & signal logic
│   │
│   ├── store/
│   │   └── useTradingStore.js     # Unified Zustand store for settings & data state
│   │
│   ├── App.jsx             # Shell layout & background polling scheduler
│   ├── index.css           # Global Tailwind utilities & custom styles
│   └── main.jsx            # React root injection point
│
├── tailwind.config.js      # Custom theme configurations
├── vite.config.js          # Dev proxies and build settings
└── package.json            # Scripts & project dependencies
```

---

## 🚀 Getting Started

Follow these steps to run the application locally on your machine:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Installation
Clone the repository and install the dependencies:
```bash
# Install package dependencies
npm install
```

### 3. Run Development Server
Start the local Vite development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 4. Build for Production
Create an optimized production bundle:
```bash
npm run build
```
Preview the production build locally:
```bash
npm run preview
```

---

## ⚙️ How the Simulator / API Proxy Works
In development, the Vite dev server uses a proxy configuration in [vite.config.js](file:///c:/Users/HP/.gemini/antigravity/scratch/crypto-futures-analyzer/vite.config.js) to redirect REST API requests to Binance to bypass local CORS headers:
*   `/binance-fapi` requests are proxied to `https://fapi.binance.com`
*   `/alternative-fng` requests are proxied to `https://api.alternative.me`

In production, if direct API calls are blocked by browser CORS restrictions, the system falls back automatically to a CORS-bypassing public gateway (`corsproxy.io`) or launches the **local simulator** if gateways are unreachable.

---

## ⚖️ Disclaimer
*This tool is for educational and analytical purposes only. Nothing contained here constitutes financial, investment, or trading advice. Trading cryptocurrencies and futures contracts involves significant risk of loss.*
