# GoldMarket — Claude Code Instructions

## Project Overview
Gold trading and jewellery marketplace for India (starting Pune). Customers buy gold digitally and redeem it for jewellery at registered shops. Jewellers manage shops, set daily rates, and fulfil orders.

## Monorepo Structure
```
/backend    FastAPI (Python 3.12) — deployed on Railway via Docker
/frontend   Next.js 15 App Router (TypeScript, Tailwind CSS 4) — deployed on Vercel
```

## Running Locally
```bash
# Infrastructure (Postgres + Redis)
docker compose up -d

# Backend
cd backend && venv\Scripts\activate && uvicorn main:app --reload
# Runs at http://localhost:8000 — Swagger at http://localhost:8000/docs

# Frontend
cd frontend && npm run dev
# Runs at http://localhost:3000
```

## Key Conventions

### Backend
- All routes live in `backend/app/api/v1/` — one file per domain (auth, shops, gold_purchase, emi, redemption, reviews, admin)
- All DB access is **async** — use `AsyncSession`, never sync SQLAlchemy
- Use `selectinload()` for any relationship accessed inside an async context — never rely on lazy loading (causes `MissingGreenlet` error)
- Password hashing: use `hash_password()` from `app.core.security` (NOT `get_password_hash`)
- Railway provides `DATABASE_URL` as `postgresql://` — `session.py` and `alembic/env.py` both convert it to `postgresql+asyncpg://` via `_async_url()`
- Gold balance changes always go through `LedgerService.credit()` or `LedgerService.debit()` — never update `gold_accounts.balance_grams` directly

### Frontend
- API client is in `frontend/src/lib/api.ts` — all API calls go through the typed axios instance
- Auth state lives in `AuthContext` — use `useAuth()` hook to get `role`, `isAuthenticated`, `logout`
- Role values from the backend: `customer`, `jeweller`, `super_admin`
- `NEXT_PUBLIC_API_URL` env var controls the backend URL — defaults to `http://localhost:8000/api/v1`

## Deployment
| Service | Platform | URL |
|---|---|---|
| Backend | Railway | https://goldmarket-production.up.railway.app |
| Frontend | Vercel | https://goldmarket-ruby.vercel.app |

- Railway auto-deploys on push to `master` — root directory is `backend`, uses `Dockerfile`
- Vercel auto-deploys on push to `master` — root directory is `frontend`
- CORS: `ALLOWED_ORIGINS` env var on Railway must match the Vercel URL exactly (no quotes)

## Database
- Migrations managed by Alembic — run `alembic upgrade head` to apply
- On Railway, migrations run automatically at container startup (see `Dockerfile` CMD)
- Never edit migration files that have already been applied to production — create a new revision instead

## Payments
- Razorpay is in **test mode** — keys start with `rzp_test_`
- Test card: `4111 1111 1111 1111`, any future expiry, any CVV, OTP `1234`
- Do not switch to live keys (`rzp_live_`) without the user's explicit instruction

## User Roles
- `customer` — buy gold, EMI, redeem, review shops
- `jeweller` — all of the above + manage shops, set rates, handle orders and redemptions
- `super_admin` — all of the above + approve/suspend shops, activate/deactivate users

## Known Limitations (MVP)
- KYC verification not implemented
- Gold rate not fetched from live market feed — set manually by jewellers
- No image upload — logo/banner accept external URLs only
- Redis is provisioned but not yet used
- No push/email notifications
