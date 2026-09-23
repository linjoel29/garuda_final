# RouteWise AI — AI-Powered Delivery Route Optimization Platform

RouteWise AI is a production-grade, end-to-end logistics delivery route optimization platform. It combines a Capacitated Vehicle Routing Problem (CVRP) solver with time windows and priority weighting, live interactive Leaflet maps, dynamic delay re-routing, and natural language AI dispatch summaries powered by Google Gemini (`@google/genai`).

---

## 🌟 Key Features

1. **User Authentication & Isolation**: Dispatcher registration and JWT session authentication.
2. **Delivery Order Management**: CRUD interface for delivery stops + CSV bulk import with automatic geocoding.
3. **Fleet Vehicle Management**: Configure vehicle capacities (max weight kg, max volume m³) and depot locations.
4. **CVRP Optimization Engine**: Solver respecting vehicle payload capacity limits, time windows, and priority sequencing (urgent orders placed early).
5. **Live Interactive Map**: Leaflet map rendering numbered stop sequence markers, vehicle route polylines, depot start points, and popups.
6. **Dynamic Re-Routing & Disruption Simulation**: Simulate traffic delays, road closures, or breakdowns on any stop; the backend recomputes remaining stops and generates a Gemini AI explanation.
7. **Gemini AI Dispatch Summaries**: Natural language summaries for dispatchers using structured JSON schemas (`@google/genai` SDK).
8. **Logistics Performance Dashboard**: Fleet utilization %, average delivery duration, total distance saved, and estimated fuel saved vs. naive routing.
9. **Historical Route Audit Log**: Review past routes, logged events, and performance stats.

---

## 📁 Repository Structure

```
routewise-ai/
├── shared/
│   └── schemas.ts               # Shared Zod validation schemas & TypeScript types
├── client/                      # React (Vite) + Tailwind CSS + Leaflet.js
│   ├── src/
│   │   ├── components/          # RouteMap, RouteSummaryCard, OrderFormModal, CSVImportModal, DelayModal, DashboardStatsGrid
│   │   ├── context/             # AuthContext (JWT management)
│   │   ├── lib/                 # Axios client & formatting utilities
│   │   ├── pages/               # Login, Register, Dashboard, Orders, Vehicles, RouteGenerate, RouteDetail, RouteHistory, Settings
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── server/                      # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── db/                  # Dual-mode database (PostgreSQL / SQLite fallback)
│   │   ├── middleware/          # Auth & Zod validation
│   │   ├── services/            # CVRP Solver, Travel Matrix, Geocoding, Gemini AI SDK
│   │   ├── controllers/         # Auth, Orders, Vehicles, Routes, Dashboard
│   │   ├── routes/              # Express route handlers
│   │   └── index.ts             # Express server entrypoint
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18 or higher
- **npm** v9 or higher

### 2. Install Dependencies

In the root directory, run:
```bash
npm --prefix server install
npm --prefix client install
```

### 3. Environment Variables Setup

Create `server/.env` (or copy from `server/.env.example`):
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=routewise_super_secret_jwt_key_2026
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=
ORS_API_KEY=
```

> **Note on Database**: If `DATABASE_URL` is omitted, RouteWise AI automatically initializes and uses a local SQLite database (`server/routewise.db`) out-of-the-box!

### 4. Run Development Server

Start the backend server:
```bash
npm run dev:server
```

In a separate terminal, start the frontend client:
```bash
npm run dev:client
```

Open your browser to: `http://localhost:5173`

---

## 📡 API Reference

### Auth Endpoints
- `POST /api/auth/register` — Register dispatcher account (auto-seeds demo vehicles & orders)
- `POST /api/auth/login` — Log in dispatcher
- `GET /api/auth/me` — Current user profile

### Delivery Order Endpoints
- `GET /api/orders` — List user's delivery orders (with `search`, `priority`, `status` filters)
- `POST /api/orders` — Create single order (geocodes address automatically)
- `POST /api/orders/bulk-import` — Bulk import delivery stops via CSV or JSON
- `PATCH /api/orders/:id` — Update order
- `DELETE /api/orders/:id` — Delete order

### Fleet Vehicle Endpoints
- `GET /api/vehicles` — List user's fleet vehicles
- `POST /api/vehicles` — Create vehicle
- `PATCH /api/vehicles/:id` — Update vehicle capacity or status
- `DELETE /api/vehicles/:id` — Delete vehicle

### Route Optimization & Delay Endpoints
- `POST /api/routes/generate` — Solves CVRP for selected orders & vehicles, calls Gemini API, saves route
- `GET /api/routes` — List generated routes
- `GET /api/routes/:id` — Retrieve detailed route with stops, vehicle info, and event log
- `POST /api/routes/:id/simulate-delay` — Recomputes remaining stops for vehicle and generates Gemini disruption explanation

### Dashboard Stats
- `GET /api/dashboard/stats` — Fleet utilization %, total distance saved, fuel saved, avg delivery time
