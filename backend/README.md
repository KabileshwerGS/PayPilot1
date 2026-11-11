# PayPilot Backend Engine

The high-performance FastAPI backend engine powering the **PayPilot Autonomous Business & Payments Platform**. Unifies multi-currency checkout, PayPal smart payment flows, database persistence on Supabase PostgreSQL, and an AI Financial Intelligence Layer powered by Google Gemini.

---

## Architecture & Structure

```
backend/
├── alembic/                # Database migration versions and env
├── app/
│   ├── api/                # API routers for all business domains
│   │   ├── auth.py         # JWT authentication, login & registration
│   │   ├── business.py     # Merchant business profile management
│   │   ├── clients.py      # Client profiles & contact records
│   │   ├── invoices.py     # Multi-currency invoicing & PDF generation
│   │   ├── payments.py     # PayPal order capture, webhooks & ledger
│   │   ├── creators.py     # Tipping jar, fan notes & membership tiers
│   │   ├── marketplace.py  # Multi-vendor catalog, commission split math
│   │   ├── pos.py          # Point-of-Sale SKU catalog & QR checkout
│   │   ├── intelligence.py # AI Financial Intelligence Cockpit & actions
│   │   ├── ai.py           # Gemini-powered natural language assistant
│   │   ├── analytics.py    # Multi-stream financial metric aggregation
│   │   ├── dashboard.py    # Overview stats and quick charts
│   │   ├── reminders.py    # Automated payment reminders
│   │   └── notifications.py# Real-time event notifications
│   ├── core/               # App configuration, database session, security
│   ├── integrations/       # PayPal SDK client, Gemini AI client
│   ├── models/             # SQLAlchemy ORM models
│   ├── schemas/            # Pydantic v2 validation models
│   └── services/           # Financial intelligence, debtor risk, cash flow
├── scripts/                # Database migration scripts (SQLite -> Supabase)
├── tests/                  # Pytest test suites (unit & integration)
├── .env.example            # Backend environment variables template
├── requirements.txt        # Python dependency manifest
└── run.py                  # Standalone local dev runner
```

---

## Database Configuration

PayPilot natively supports both:
1. **Local SQLite (`sqlite:///./paypilot.db`)** for zero-setup local offline development and testing.
2. **Supabase PostgreSQL** for production deployments with automated SSL connection pooling and high concurrency.

Database tables are initialized automatically on startup via `Base.metadata.create_all(bind=engine)`.

### Migrating SQLite Data to Supabase
To migrate an existing SQLite database to your Supabase PostgreSQL instance:
```bash
python backend/scripts/migrate_sqlite_to_supabase.py --sqlite paypilot.db --dry-run
python backend/scripts/migrate_sqlite_to_supabase.py --sqlite paypilot.db
```

---

## Local Development

```bash
# 1. Create and activate a Python virtual environment
python -m venv backend/venv
# Windows:
backend\venv\Scripts\activate
# macOS/Linux:
source backend/venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Create .env from template
cp backend/.env.example backend/.env

# 4. Start backend server
# From repository root:
uvicorn backend.app.main:app --reload --port 8000
# Or using the runner script:
python backend/run.py
```

API documentation will be available at:
- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`
- Health check: `http://localhost:8000/api/health`

---

## Running Automated Tests

```bash
# Run all unit and integration test suites
pytest backend/tests/ -v
```

---

## Production Deployment on Render

1. Log in to [Render](https://render.com) and click **"New +" > "Web Service"**.
2. Connect your **PayPilot** GitHub repository.
3. In the Web Service configuration:
   - **Name**: `paypilot-backend`
   - **Language**: `Python 3`
   - **Region**: Select region closest to your Supabase project (e.g., Oregon, Frankfurt, Singapore)
   - **Branch**: `master`
   - **Root Directory**: (Leave blank or set to `.`)
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
4. Add the following **Environment Variables**:
   - `DATABASE_URL`: `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require`
   - `SECRET_KEY`: `<generate-a-secure-random-key>`
   - `ALLOWED_ORIGINS`: `https://your-frontend.vercel.app,http://localhost:5173`
   - `FRONTEND_URL`: `https://your-frontend.vercel.app`
   - `PAYPAL_MODE`: `sandbox` (or `live`)
   - `PAYPAL_CLIENT_ID`: `<your-paypal-client-id>`
   - `PAYPAL_CLIENT_SECRET`: `<your-paypal-client-secret>`
   - `GEMINI_API_KEY`: `<your-gemini-api-key>`
   - `GEMINI_MODEL`: `gemini-2.5-flash`
5. Click **Create Web Service**. Render will build and deploy the FastAPI backend.

