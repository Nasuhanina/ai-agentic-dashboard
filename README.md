# Customer Insights Dashboard

An interactive analytics dashboard for a mobility/loyalty platform.

- **Backend:** Python + FastAPI (mock data layer with a clean seam to plug in real data)
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Recharts

## What it shows

| Area | Details |
| --- | --- |
| **Demographics** | Age bands, gender, income band, regions, occupation |
| **In-app activity** | Tenure, last login & recency, sessions/week, session length, platform, activity status (Active / Occasional / Dormant / At Risk) |
| **Platform & CSO interactions** | Last follow-up date, channel, interaction type, open tickets, CSAT, follow-ups due |
| **Driving insights** | Sentiance SDK telemetry: driving score, trips, distance, night driving, harsh braking/acceleration, speeding, phone usage, transport mode |
| **Inferred sentiment** | Positive / Neutral / Negative mix, trend, top positive & negative drivers |
| **Loyalty points** | Tier distribution, month-over-month points trend, earned vs redeemed, tier × sentiment |
| **Customer explorer** | Sortable, filterable table with a full drill-down drawer per customer |

Global filters (city, sentiment, tier, activity, gender, free-text search) drive **every** chart and the table.

---

## Project layout

```
ai agentic-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + routes
│   │   └── data/
│   │       ├── generator.py     # deterministic mock data (240 customers)
│   │       └── analytics.py     # aggregation / KPIs / time series
│   ├── requirements.txt
│   └── .venv/                   # created during setup
└── frontend/
    ├── src/
    │   ├── App.tsx              # layout, state, data fetching
    │   ├── api.ts               # typed API client
    │   ├── types.ts             # shared types
    │   ├── components/          # UI, charts, table, drawer, filters
    │   └── components/sections/ # the six insight sections + KPI row
    ├── vite.config.ts           # dev proxy /api -> :8000
    └── package.json
```

---

## Running it

You need **two terminals**.

### 1. Backend (port 8000)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

API docs (Swagger): http://localhost:8000/docs

### 2. Frontend (port 5173)

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` to the
backend, so no CORS or environment config is needed.

---

## API reference

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Liveness + record count |
| GET | `/api/filters` | Distinct filter values |
| GET | `/api/summary` | Headline KPIs |
| GET | `/api/demographics` | Demographic distributions |
| GET | `/api/activity` | Tenure, login recency, engagement |
| GET | `/api/interactions` | CSO / platform contact metrics |
| GET | `/api/driving-insights` | Sentiance SDK aggregates |
| GET | `/api/sentiment` | Sentiment mix, trend, drivers |
| GET | `/api/loyalty` | Tiers, points trend, earn/redeem |
| GET | `/api/users` | Paginated + sortable customer list |
| GET | `/api/users/{id}` | Full single-customer detail |

Every aggregate endpoint accepts the optional query params:
`city, sentiment, tier, activity_status, gender, search`.
`/api/users` additionally accepts `page, page_size, sort, order`.

---

## Swapping in real data

All data is produced in `backend/app/data/generator.py` (`USERS`). The rest of
the app only depends on the `User` shape and the aggregation functions in
`analytics.py`. To use real data, either:

1. Build a list of `User` objects from your DB/API and assign it to `USERS`, or
2. Replace `USERS` with a repository that returns the same fields.

No frontend changes are required as long as the JSON shape is preserved.

## Notes

- Data is deterministic (seeded) so the dashboard is stable across restarts.
- No authentication is included — this is an internal single-page dashboard.
