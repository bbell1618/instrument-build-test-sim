# Instrument Build & Test Pipeline Simulator

Interactive web-based **Monte Carlo simulator** for electro-mechanical instrument production pipelines. Define build and test stages, configure failure rates and rework policies, then run simulations to analyze yield, cycle time, and throughput.

> This is a generic demo — all numbers and stages are synthetic and not tied to any specific product.

---

## Features

- **Interactive pipeline editor** — add, remove, and configure stages with failure probabilities, rework toggles, and timing parameters.
- **Monte Carlo simulation** — simulate thousands of units flowing through your pipeline using Box-Muller-transformed duration variance and probability-based failure/rework logic.
- **Real-time analytics** — view overall yield, average cycle time, P95 cycle time, scrap rate, per-stage yield breakdowns, and cumulative throughput trends.
- **Rich visualizations** — stage yield bar charts, cumulative throughput area charts, and cycle time distribution histograms powered by Recharts.
- **Configuration persistence** — pipeline configs auto-save to localStorage so your work survives page refreshes.
- **Data export** — download simulation results as CSV for further analysis.
- **Input validation** — real-time validation prevents invalid configurations before simulation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.8 |
| UI Framework | React 19 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Testing | Vitest |

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/bbell1618/instrument-build-test-sim.git
cd instrument-build-test-sim

# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
instrument-build-test-sim/
├── index.html              # HTML entry point
├── index.tsx               # React app bootstrap
├── App.tsx                 # Main application component
├── types.ts                # TypeScript type definitions
├── constants.ts            # Default pipeline configuration
├── components/
│   ├── ConfigEditor.tsx    # Pipeline stage configuration UI
│   ├── ResultsView.tsx     # Simulation results & charts
│   └── ErrorBoundary.tsx   # Graceful error handling
├── services/
│   └── simulator.ts        # Core Monte Carlo simulation engine
├── __tests__/
│   └── simulator.test.ts   # Unit tests for simulation logic
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## How It Works

1. **Configure** your production pipeline — each stage has a name, mean duration, failure probability, and optional rework settings.
2. **Run** a Monte Carlo simulation with N units (100–50,000).
3. **Analyze** results: overall yield, cycle time statistics, per-stage breakdowns, and distribution charts.

The simulator uses a Box-Muller transform to generate Gaussian-distributed stage durations and simple probability rolls for pass/fail decisions. When rework is enabled, failed units get additional attempts (configurable) with time penalties before being scrapped.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests with Vitest |

---

## Disclaimer

This simulator is intentionally simplified. It's intended as a learning and discussion tool for thinking about build/test flows and trade-offs in test coverage, yield, and throughput for complex instruments.
