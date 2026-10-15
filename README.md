# Std6730202165IPFinal2026 — HR Manager & Salary Analytics System

```
Std6730202165IPFinal2026
├── backend    (Express.js + MySQL — server.js, schema.sql, port 3017)
├── frontend   (React Native / Expo Router — src/app, assets)
└── package.json  (one shared package for both)
```

```bash
npm install
```

## 1. Start the backend

Data is stored in the course MySQL database (`ip_std6730202165`):
- login checks the `admin` table
- employees are stored in the `employees` table

On first start the server creates the `employees` table, seeds 7 employees if it is empty, and adds
the `admin` / `password123` login if no `admin` user exists (see `backend/schema.sql`).

Copy `.env.example` to `.env` and fill in `DB_PASSWORD`. The backend must run on the course server
where the DB is reachable.

```bash
npm run server     # http://localhost:3017
```

Login: `admin` / `password123`

| Method | Endpoint | Notes |
| --- | --- | --- |
| POST | `/api/login` | 200 `{ success, token: "mock-jwt-token" }` / 401 |
| GET | `/api/employees` | all employees |
| POST | `/api/employees` | `name`, `position`, `salary` required → otherwise 400 |
| PUT | `/api/employees/:id/status` | toggle Active ↔ On Leave (404 if not found) |
| DELETE | `/api/employees/:id` | 404 if not found |
| GET | `/api/employees/salary-clusters` | 1D K-Means (k=3) → Tier 1–3 with centroid & count |

The same server also hosts the earlier Inventory project (`backend/inventory.js`:
`/api/auth/*`, `/api/products/*`, `/api/orders/*`), which needs `JWT_SECRET` in `.env`.

All `/api/employees*` endpoints require the header `Authorization: Bearer mock-jwt-token` (401 otherwise).

## 2. Start the frontend

```bash
npm run ios        # or: npm start / npm run android / npm run web
```

The app calls the backend on the course server at `http://119.59.102.161:3017/api` by default.
To use a local backend instead, set `EXPO_PUBLIC_API_URL`, e.g.
`EXPO_PUBLIC_API_URL=http://localhost:3017/api npm run ios`.
