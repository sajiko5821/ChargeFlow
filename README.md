<p align="center">
  <img src="public/favicon.svg" width="64" height="64" alt="ChargeFlow Logo">
</p>

<h1 align="center">ChargeFlow</h1>

<p align="center">
  <strong>Mobile-first EV charging cost tracker</strong><br>
  Track, analyze, and calculate your electric vehicle charging expenses.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/SQLite-WAL-003B57?logo=sqlite&logoColor=white" alt="SQLite">
</p>

---

## Features

| Tab | Description |
|-----|-------------|
| **⚡ Charging** | Log charging sessions with kWh, price/kWh, date and notes. Current-month summary cards show total cost and energy at a glance. |
| **📊 Statistics** | Monthly cost bar chart, average cost/energy per month, and yearly overviews with expandable monthly breakdowns. |
| **🔢 Calculator** | Estimate charging time and cost based on your vehicle's specs. Toggle between DC and AC, adjust SoC range and electricity price. |
| **🚗 Car** | Store your vehicle data — battery capacity, max DC/AC charging power. Used by the calculator. |

**Additional highlights:**

- 🌙 **Dark mode** with system-preference detection and manual toggle
- 🌍 **Multi-language** — German & English with browser auto-detection
- 📄 **CSV export** — automatic backup of all data to a CSV file
- 🐳 **Docker-ready** — standard image + AIO image with Cloudflare Tunnel
- 📱 **Mobile-first** — designed for phones, works everywhere

---

## Quick Start

### Prerequisites

- **Node.js 22+** and **npm**

### Development

```bash
# Clone and install
git clone https://github.com/sajiko5821/ChargeFlow.git
cd ChargeFlow
npm install

# Start backend (port 3001) + frontend dev server (port 5173)
npm run server &
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — API requests are proxied to the backend automatically.

### Production Build

```bash
npm run build
PORT=7920 npx tsx server/index.ts
```

The server serves both the API and the built frontend on a single port.

---

## Docker

Two images are published to `ghcr.io`:

| Image | Description |
|-------|-------------|
| `ghcr.io/sajiko5821/chargeflow` | Standard image |
| `ghcr.io/sajiko5821/chargeflow-aio` | All-in-one with integrated [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-tunnel/) |

### Standard

```bash
docker run -d \
  -p 7920:7920 \
  -v chargeflow-data:/data \
  ghcr.io/sajiko5821/chargeflow
```

### All-in-One (with Cloudflare Tunnel)

```bash
docker run -d \
  -v chargeflow-data:/data \
  -e TUNNEL_TOKEN=<your-cloudflare-tunnel-token> \
  ghcr.io/sajiko5821/chargeflow-aio
```

No port mapping needed — traffic goes through the tunnel.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7920` | HTTP server port |
| `DB_PATH` | `/data/chargeflow.db` | Path to SQLite database file |
| `CSV_PATH` | `/data/chargeflow.csv` | Path to CSV export file (set to `""` to disable) |
| `TUNNEL_TOKEN` | `""` | Cloudflare Tunnel token (AIO image only) |

### CSV Backup to External Volume

```bash
docker run -d \
  -p 7920:7920 \
  -v chargeflow-data:/data \
  -v /my/backup:/export \
  -e CSV_PATH=/export/chargeflow.csv \
  ghcr.io/sajiko5821/chargeflow
```

The CSV persists independently of the container and contains vehicle data, all sessions, and monthly summaries.

---

## API

The backend exposes a REST API under `/api`. Full specification: [`docs/openapi.yaml`](docs/openapi.yaml)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/car` | Get vehicle data |
| `PUT` | `/api/car` | Create/update vehicle |
| `GET` | `/api/sessions` | List all charging sessions |
| `POST` | `/api/sessions` | Add or replace a session |
| `DELETE` | `/api/sessions/:id` | Delete a session |

### Example

```bash
# Save vehicle
curl -X PUT http://localhost:7920/api/car \
  -H 'Content-Type: application/json' \
  -d '{"name":"Tesla Model 3","batteryCapacityKWh":60,"maxDCChargingKW":170,"maxACChargingKW":11}'

# Add charging session
curl -X POST http://localhost:7920/api/sessions \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$(uuidgen)"'","date":"2026-03-01","kWhCharged":42.5,"pricePerKWh":0.39,"totalCost":16.58,"note":"IONITY A3"}'

# List sessions
curl http://localhost:7920/api/sessions
```

---

## Project Structure

```
ChargeFlow/
├── server/
│   └── index.ts            # Express API + SQLite + CSV export
├── src/
│   ├── components/
│   │   ├── BottomNav.tsx    # Tab navigation
│   │   ├── CarTab.tsx       # Vehicle configuration
│   │   ├── ChargingTab.tsx  # Session logging + month summary
│   │   ├── CalculatorTab.tsx# Charging time/cost calculator
│   │   └── StatisticsTab.tsx# Charts and yearly overviews
│   ├── hooks/
│   │   ├── useDatabase.ts   # API client (fetch wrapper)
│   │   ├── useChargingStats.ts # Monthly/yearly aggregation
│   │   └── useTheme.ts      # Dark mode management
│   ├── i18n/
│   │   ├── translations.ts  # DE + EN translation strings
│   │   └── I18nContext.tsx   # React context + useI18n hook
│   ├── db/
│   │   └── database.ts      # Fetch helpers
│   ├── App.tsx              # Main layout + routing
│   ├── main.tsx             # Entry point
│   ├── types.ts             # Shared TypeScript interfaces
│   └── index.css            # Tailwind + CSS custom properties
├── docker/
│   └── aio-entrypoint.sh    # AIO image entrypoint
├── docs/
│   └── openapi.yaml         # OpenAPI 3.1 specification
├── Dockerfile               # Standard Docker image
├── Dockerfile.aio           # AIO image with cloudflared
└── .github/workflows/
    └── docker-publish.yaml  # CI/CD for both images
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Tailwind CSS 4, Lucide Icons |
| Backend | Express 5, better-sqlite3 (WAL mode) |
| Build | Vite 7, tsx |
| Deployment | Docker (Node 22 Alpine), GitHub Actions, Cloudflare Tunnel |

---

## License

MIT
