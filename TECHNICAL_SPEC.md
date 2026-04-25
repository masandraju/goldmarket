# GoldMarket — Technical Specification

Version: 1.0 | Date: 2026-04-25 | Status: Demo / MVP

---

## 1. System Overview

GoldMarket is a two-sided marketplace that connects gold customers with verified jewellery shops. Customers accumulate gold digitally (in grams) through purchases or EMI plans and redeem it for physical jewellery. Jewellers manage their shop profile, post daily rates, and fulfil orders and redemption requests.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Client (Browser)                    │
│     Next.js 15 (App Router) — Vercel CDN             │
└───────────────────┬──────────────────────────────────┘
                    │ HTTPS / REST (JSON)
┌───────────────────▼──────────────────────────────────┐
│              FastAPI Application                     │
│    Python 3.12 · Uvicorn · Railway (Docker)          │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  API Routes  │  │   Services   │  │  Alembic  │  │
│  │  (v1 Router) │  │  (business   │  │ migrations│  │
│  │              │  │   logic)     │  │           │  │
│  └──────────────┘  └──────┬───────┘  └───────────┘  │
│                           │                          │
│  ┌────────────────────────▼───────────────────────┐  │
│  │          SQLAlchemy 2 (async)                  │  │
│  └───────────┬────────────────────────────────────┘  │
└──────────────┼───────────────────────────────────────┘
               │
    ┌──────────▼──────────┐   ┌──────────────────────┐
    │   PostgreSQL 16      │   │      Redis 7         │
    │   (Railway / local)  │   │  (cache / sessions)  │
    └─────────────────────┘   └──────────────────────┘
```

### Communication Pattern
- All API calls use REST (JSON over HTTPS)
- Authentication via JWT Bearer tokens (access + refresh)
- Frontend stores JWT in `localStorage`; Axios interceptor attaches it automatically
- CORS configured via `ALLOWED_ORIGINS` env var

---

## 3. Technology Stack

| Component | Technology | Version |
|---|---|---|
| Frontend framework | Next.js (App Router) | 15.x |
| Frontend language | TypeScript | 5.x |
| Frontend styling | Tailwind CSS | 4.x |
| HTTP client | Axios | latest |
| Backend framework | FastAPI | 0.115.5 |
| Backend language | Python | 3.12 |
| ASGI server | Uvicorn | 0.32.1 |
| ORM | SQLAlchemy (asyncio) | 2.0.36 |
| Async DB driver | asyncpg | 0.30.0 |
| Migrations | Alembic | 1.14.0 |
| Validation | Pydantic v2 | 2.10.3 |
| Auth (JWT) | python-jose | 3.3.0 |
| Password hashing | passlib / bcrypt | 1.7.4 / 4.0.1 |
| Payments | Razorpay Python SDK | 1.4.1 |
| Database | PostgreSQL | 16 |
| Cache | Redis | 7 |
| Map embed | OpenStreetMap iframe | — |
| Distance | Haversine (client-side) | — |
| Containerisation | Docker | — |
| CI infra | docker-compose (local) | — |

---

## 4. Database Schema

All tables inherit `created_at` and `updated_at` timestamps from the base model.

### 4.1 users
| Column | Type | Notes |
|---|---|---|
| id | PK integer | |
| email | varchar(255) | unique, indexed |
| phone | varchar(15) | unique, indexed |
| full_name | varchar(255) | |
| hashed_password | varchar(255) | bcrypt |
| role | enum | `SUPER_ADMIN`, `CUSTOMER`, `JEWELLER` |
| is_active | boolean | |
| kyc_status | enum | `PENDING`, `SUBMITTED`, `VERIFIED`, `REJECTED` |
| pan_number | varchar(10) | nullable |
| aadhaar_last4 | varchar(4) | nullable |

### 4.2 shops
| Column | Type | Notes |
|---|---|---|
| id | PK integer | |
| owner_id | FK → users | |
| name | varchar(255) | indexed |
| description | text | nullable |
| address | text | |
| city, state, pincode | varchar | |
| latitude, longitude | float | used for distance queries |
| phone, email, gstin | varchar | |
| status | enum | `PENDING`, `APPROVED`, `SUSPENDED`, `REJECTED` |
| avg_rating | float | denormalised, updated on each review |
| review_count | integer | |
| accepts_emi | boolean | |
| logo_url, banner_url | varchar(500) | nullable |

### 4.3 shop_services
One row per service tag per shop (e.g. "Gold", "Silver", "Repair").

### 4.4 gold_rates
| Column | Type | Notes |
|---|---|---|
| id | PK integer | |
| shop_id | FK → shops | |
| rate_per_gram_22k | float | INR per gram |
| rate_per_gram_24k | float | INR per gram |
| effective_date | date | indexed |
| is_manual_override | boolean | |
| notes | varchar(255) | nullable |

### 4.5 gold_accounts
One virtual gold account per user. `balance_grams` is the current holding.

### 4.6 ledger_entries
Immutable double-entry ledger. Every credit/debit to a gold account creates a row.

| Column | Type | Notes |
|---|---|---|
| account_id | FK → gold_accounts | |
| transaction_id | FK → transactions | nullable (redemptions link here) |
| entry_type | enum | `CREDIT`, `DEBIT` |
| gold_grams | float | absolute amount of the entry |
| balance_after | float | account balance snapshot |

### 4.7 transactions
| Column | Type | Notes |
|---|---|---|
| transaction_type | enum | `LUMPSUM_BUY`, `EMI_PAYMENT`, `REDEMPTION`, `REFUND` |
| amount_inr | float | |
| gold_grams | float | |
| rate_per_gram | float | rate locked at time of transaction |
| status | enum | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `REFUNDED` |
| razorpay_order_id | varchar(100) | nullable |
| razorpay_payment_id | varchar(100) | nullable |
| razorpay_signature | varchar(255) | nullable |

### 4.8 emi_plans
| Column | Type | Notes |
|---|---|---|
| total_amount_inr | float | total contract value |
| monthly_installment_inr | float | |
| total_installments | integer | |
| installments_paid | integer | |
| total_gold_grams | float | estimated at plan creation |
| gold_grams_accumulated | float | running total |
| start_date, next_due_date | date | |
| status | enum | `ACTIVE`, `COMPLETED`, `DEFAULTED`, `CANCELLED` |
| razorpay_subscription_id | varchar(100) | nullable |

### 4.9 emi_payments
Individual installment payment records linked to an EMI plan.

### 4.10 redemption_requests
| Column | Type | Notes |
|---|---|---|
| gold_grams | float | grams to redeem |
| status | enum | `PENDING`, `APPROVED`, `READY`, `FULFILLED`, `REJECTED`, `CANCELLED` |
| preferred_item | varchar(255) | customer's jewellery request |
| user_notes | text | nullable |
| shop_notes | text | jeweller response / rejection reason |

On submission: a `Transaction` (type=`REDEMPTION`) is created and the gold is **debited** from the customer's ledger immediately (status=`PENDING`).

### 4.11 reviews
- `rating` integer 1–5 (DB constraint)
- One review per user per shop (enforced in application layer)
- On insert/update: `shops.avg_rating` and `shops.review_count` are recalculated

### 4.12 inventory_items
Shop inventory for jewellery catalogue. Categories: `RING`, `CHAIN`, `NECKLACE`, `BRACELET`, `EARRING`, `BANGLE`, `PENDANT`, `COIN`, `BAR`, `OTHER`. Purity: `K18`, `K22`, `K24`.

### 4.13 audit_logs
System-level action log: `action`, `resource_type`, `resource_id`, `extra_data` (JSON), `ip_address`.

---

## 5. API Endpoints

Base path: `/api/v1`

### Auth — `/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register new user (customer or jeweller) |
| POST | `/auth/login` | — | Login; returns access + refresh JWT |
| GET | `/auth/me` | JWT | Get own profile |
| PATCH | `/auth/me` | JWT | Update name, phone, or password |

### Shops — `/shops`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/shops/nearby` | — | Shops within `radius_km` of a lat/lng |
| GET | `/shops/my-shops` | JWT (jeweller) | Own shops |
| POST | `/shops/register` | JWT (jeweller) | Register new shop |
| GET | `/shops/{id}` | — | Public shop detail |
| GET | `/shops/{id}/full` | JWT (jeweller) | Full shop detail for editing |
| PATCH | `/shops/{id}/edit` | JWT (jeweller) | Edit shop |
| PATCH | `/shops/{id}/approve` | JWT (admin) | Approve shop |
| PATCH | `/shops/{id}/toggle-emi` | JWT (jeweller) | Toggle EMI flag |
| PATCH | `/shops/{id}/location` | JWT (jeweller) | Update GPS coordinates |
| GET | `/shops/my-orders` | JWT (jeweller) | All orders for own shops |

### Gold Rates — `/gold-rates`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/gold-rates/` | JWT (jeweller) | Set today's rate |
| GET | `/gold-rates/{shop_id}/today` | — | Today's rate for a shop |
| GET | `/gold-rates/{shop_id}/history` | — | Rate history (`?days=N`) |

### Gold Account & Purchase — `/gold`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/gold/balance` | JWT | Current balance in grams |
| POST | `/gold/buy/initiate` | JWT | Create Razorpay order for lump-sum buy |
| POST | `/gold/buy/verify` | JWT | Verify Razorpay signature, credit gold |
| GET | `/gold/transactions` | JWT | Transaction history |

### EMI — `/emi`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/emi/create` | JWT | Create EMI plan |
| POST | `/emi/pay/initiate` | JWT | Create Razorpay order for next installment |
| POST | `/emi/pay/verify` | JWT | Verify payment, credit gold, advance plan |
| GET | `/emi/my-plans` | JWT | All EMI plans for current user |

### Redemptions — `/redemptions`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/redemptions/request` | JWT (customer) | Submit redemption request |
| GET | `/redemptions/my-requests` | JWT (customer) | Own redemption requests |
| GET | `/redemptions/shop/requests` | JWT (jeweller) | Requests for own shops |
| PATCH | `/redemptions/{id}/action` | JWT (jeweller) | Accept or reject with optional notes |

### Reviews — `/reviews`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/reviews/` | JWT (customer) | Submit or update review |
| GET | `/reviews/{shop_id}` | — | All reviews for a shop |
| GET | `/reviews/my-review/{shop_id}` | JWT | Current user's review for a shop |

### Admin — `/admin`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/dashboard` | JWT (admin) | Stats overview |
| GET | `/admin/shops/pending` | JWT (admin) | Pending approvals |
| GET | `/admin/shops/all` | JWT (admin) | All shops |
| PATCH | `/admin/shops/{id}` | JWT (admin) | Edit any shop |
| GET | `/admin/users` | JWT (admin) | All users |
| PATCH | `/admin/users/{id}/toggle-active` | JWT (admin) | Activate / deactivate user |

---

## 6. Authentication & Authorisation

- **Registration**: email + phone uniqueness enforced at DB level
- **Login**: bcrypt password check → returns `access_token` (60 min) + `refresh_token` (7 days)
- **JWT payload**: `sub` (user id), `role`, `exp`
- **Dependency injection**: `get_current_user` decodes JWT on every protected route; role-specific dependencies (`require_jeweller`, `require_admin`) raise 403 if role doesn't match
- **Password change**: requires `current_password` to be provided and verified before accepting `new_password`

---

## 7. Payment Flow (Razorpay)

### Lump-sum Buy
```
1. POST /gold/buy/initiate  →  backend creates Razorpay order, returns razorpay_order_id
2. Frontend opens Razorpay checkout modal
3. User completes payment
4. POST /gold/buy/verify  →  backend verifies HMAC signature
5. Transaction status → COMPLETED, LedgerService.credit() called
6. Customer's gold balance updated
```

### EMI Installment Pay
Same flow but through `/emi/pay/initiate` and `/emi/pay/verify`. On success, `installments_paid` increments, `gold_grams_accumulated` increases, and `next_due_date` advances by one month.

### Test Mode
Set `RAZORPAY_KEY_ID=rzp_test_...` and `RAZORPAY_KEY_SECRET=...` in `.env`. No real money is charged. Test cards and UPI are available in the Razorpay test dashboard.

---

## 8. Gold Ledger

Every change to a customer's gold balance goes through `LedgerService`:

- `LedgerService.credit(db, user_id, grams, txn_id)` — buy / EMI payment
- `LedgerService.debit(db, user_id, grams, txn_id)` — redemption request

Each call:
1. Locks the `gold_accounts` row (`SELECT FOR UPDATE`)
2. Validates sufficient balance for debits
3. Creates a `LedgerEntry` row with the new `balance_after`
4. Updates `gold_accounts.balance_grams`

---

## 9. Shop Discovery

**Nearby query** (`GET /shops/nearby`):
- Accepts `latitude`, `longitude`, `radius_km`, `limit`
- Uses the Haversine formula in PostgreSQL to filter within the radius
- Returns services (eager-loaded via `selectinload`) and today's rates (bulk-fetched and merged)

**Client-side filtering & sorting** (frontend `shops/page.tsx`):
- Service filter chips (multi-select)
- EMI only toggle
- "Rates set today" toggle
- Sort by: distance, rating, 22K rate (low→high), 24K rate (low→high)
- All filtering done with `useMemo` over the already-loaded shop array (no extra API calls)

**Distance display** (frontend `shops/[id]/page.tsx`):
- Browser `navigator.geolocation` API retrieves user coordinates
- Haversine calculation in TypeScript
- Shows "X.X km" or "XXX m" in the shop header

**Map embed**:
- OpenStreetMap iframe centred on shop coordinates
- No API key required; dark CSS filter applied to match the dark UI theme

---

## 10. User Roles

| Role | Can do |
|---|---|
| `CUSTOMER` | Browse shops, buy gold, EMI, redeem, review, edit own profile |
| `JEWELLER` | All of the above + register/manage shop, set rates, view orders, manage redemptions |
| `SUPER_ADMIN` | All of the above + approve/suspend shops, activate/deactivate users |

---

## 11. Frontend Page Structure

```
/                          Landing page (hero + features)
/register                  User registration (customer or jeweller)
/login                     Login
/shops                     Shop listing with filters and sort
/shops/[id]                Shop detail (rates, map, reviews)
/dashboard                 Home dashboard (customer and jeweller)
/dashboard/profile         Edit profile / change password
/dashboard/orders          Jeweller: incoming orders
/dashboard/redemptions     Jeweller: manage redemption requests
/dashboard/redeem          Customer: submit redemption request
/dashboard/rates           Jeweller: set daily gold rates
/dashboard/shop/register   Jeweller: register new shop
/dashboard/shop/edit       Jeweller: edit shop details
/admin                     Admin panel (stats, shops, users)
```

---

## 12. Infrastructure

### Local Development
```
docker compose up -d        # starts Postgres 16 + Redis 7
```

### Production (Demo)
| Service | Platform | Notes |
|---|---|---|
| Backend | Railway | Auto-deploys from `backend/` directory via Dockerfile |
| Frontend | Vercel | Auto-deploys from `frontend/` directory |
| Database | Railway PostgreSQL | `DATABASE_URL` injected automatically |
| Cache | Railway Redis | `REDIS_URL` injected automatically |

### Dockerfile (backend)
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

`alembic upgrade head` runs automatically on every container start, applying any pending migrations.

---

## 13. Security Notes (Demo)

- Passwords are bcrypt-hashed (cost factor 12)
- JWT secret must be a strong random string (32+ chars) — never committed to git
- `.env` files are in `.gitignore`
- Razorpay webhook signature is verified server-side using HMAC-SHA256
- CORS is restricted to `ALLOWED_ORIGINS`
- SQL injection is prevented by SQLAlchemy's parameterised queries
- KYC fields (PAN, Aadhaar last-4) are stored but verification workflow is not yet implemented

---

## 14. Known Limitations (MVP)

- KYC verification is manual / not wired to a KYC provider
- No push notifications for redemption status changes
- No image upload (logo/banner URLs must be provided as external links)
- Gold rate is not fetched from a live market feed — jewellers set it manually
- Redis is provisioned but session caching is not yet used (JWT is stateless)
- No refresh-token rotation endpoint in the frontend (user re-logs in on expiry)
