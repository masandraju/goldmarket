# GoldMarket

A gold trading and jewellery marketplace for India (starting Pune). Customers buy physical gold digitally, accumulate it in a virtual gold account, and later redeem it for jewellery at a registered shop. Jewellers list their shops, set daily rates, and manage orders and redemption requests.

---

## Features

**For Customers**
- Register, browse nearby jewellery shops on a map (OpenStreetMap, no API key required)
- See live 22K / 24K gold rates per shop
- Buy gold (lump sum) or set up an EMI plan with Razorpay payments
- Virtual gold account — balance tracked in grams with a full ledger
- Redeem accumulated gold for jewellery at any registered shop
- Rate and review shops (1–5 stars)
- Edit profile and change password

**For Jewellers**
- Register a shop (pending admin approval)
- Set daily gold rates (22K / 24K)
- View and manage incoming orders and redemption requests
- Accept or reject redemptions with optional comments
- Toggle EMI acceptance

**For Admins**
- Dashboard: total users, shops, pending approvals, transaction volume
- Approve / suspend / reject shops
- Manage users (activate / deactivate)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2 (async) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Payments | Razorpay (test mode for demo) |
| ORM migrations | Alembic |
| Auth | JWT (access + refresh tokens) |
| Maps | OpenStreetMap iframe embed (free, no key) |
| Distance | Haversine formula (client-side, no API) |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Project Structure

```
goldmarket/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/v1/           # Route handlers (auth, shops, gold, emi, redemptions, reviews, admin)
│   │   ├── core/             # Config, security, dependencies
│   │   ├── db/               # Database session, base model
│   │   ├── models/           # SQLAlchemy ORM models
│   │   └── services/         # Business logic (ledger, gold rate, location, payment)
│   ├── alembic/              # Database migrations
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── frontend/                 # Next.js application
│   └── src/
│       ├── app/              # App Router pages
│       │   ├── dashboard/    # Customer & jeweller dashboard, orders, redemptions, profile
│       │   ├── shops/        # Shop listing with filters + individual shop page
│       │   ├── admin/        # Admin panel
│       │   ├── login/
│       │   └── register/
│       ├── components/       # Navbar
│       ├── context/          # AuthContext (JWT storage)
│       └── lib/api.ts        # Typed Axios API client
├── docker-compose.yml        # Local Postgres + Redis
└── start.bat                 # Windows quick-start script
```

---

## Local Development

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker Desktop (for Postgres + Redis)

### 1. Start infrastructure
```bash
docker compose up -d
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env — set SECRET_KEY and Razorpay test keys
alembic upgrade head
python create_admin.py       # create the first super-admin account
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`  
Swagger docs: `http://localhost:8000/docs`

### 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env.local
# .env.local already points to localhost:8000 in dev
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `REDIS_URL` | Redis connection string |
| `SECRET_KEY` | JWT signing secret (32+ random chars) |
| `ALGORITHM` | JWT algorithm — default `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL (default 60) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL (default 7) |
| `RAZORPAY_KEY_ID` | Razorpay key ID — use `rzp_test_...` for demo |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. `http://localhost:8000/api/v1`) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key — use `rzp_test_...` for demo |

---

## Razorpay Test Mode

This project is configured for **Razorpay test mode**. Use the test credentials from your [Razorpay Dashboard](https://dashboard.razorpay.com) under Settings → API Keys → Test Keys. No real money is charged. Test card: `4111 1111 1111 1111`, any future expiry, any CVV.

---

## Deployment

### Backend — Railway
1. New Project → Deploy from GitHub → select this repo → set root directory `backend`
2. Add all env vars from `backend/.env.example`
3. Railway auto-detects the Dockerfile; the startup command runs `alembic upgrade head` then starts uvicorn

### Frontend — Vercel
1. New Project → Import from GitHub → set root directory `frontend`
2. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
3. Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` to your Razorpay key
4. Deploy

---

## API Reference

Interactive docs available at `http://localhost:8000/docs` (Swagger UI) and `/redoc`.

Key route groups:

| Prefix | Description |
|---|---|
| `/api/v1/auth` | Register, login, profile |
| `/api/v1/shops` | Browse, register, manage shops |
| `/api/v1/gold-rates` | Set and fetch daily rates |
| `/api/v1/gold` | Balance, buy, transaction history |
| `/api/v1/emi` | EMI plans — create, pay installments |
| `/api/v1/redemptions` | Submit and manage redemption requests |
| `/api/v1/reviews` | Submit and read shop reviews |
| `/api/v1/admin` | Admin dashboard and management |
