# PayPilot: Autonomous Business & Payments Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-blue)](frontend/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python-emerald)](backend/)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E)](docs/deployment.md)
[![Payments](https://img.shields.io/badge/Payments-PayPal%20Developer%20API-003087)](https://developer.paypal.com)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini%202.5-4285F4)](https://aistudio.google.com)

**PayPilot** is an intelligent, multi-tenant business operations and financial intelligence platform that unifies four distinct commerce models into a single high-performance cockpit:

1. **Freelancer Hub**: Multi-currency international invoicing, PDF generation, and hosted PayPal Smart Buttons checkout.
2. **Creator Hub**: Fan tipping with preset tiers, supporter notes, recurring memberships, and public hosted tip jars.
3. **Marketplace Engine**: Sub-merchant onboarding, multi-vendor cart checkout, automated platform commission split math, and PayPal Mass Payouts batch CSV exports.
4. **Point-of-Sale (POS) Terminal**: Touchscreen cashier register, real-time inventory SKU auto-decrement, cash change calculator, and dynamic PayPal QR code payments with live cashier polling.

All payment streams feed directly into a centralized **Payments Ledger** and an **AI Financial Intelligence Layer (Google Gemini)** that reasons strictly over verified database records, calculates debtor risk profiles, forecasts 30-day cash flow balances with deficit alerts, and enforces human-in-the-loop confirmation gates before executing financial actions.

---

## 1. Unified Architecture & The 4 Business Solutions

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                PAYPILOT UNIFIED PLATFORM                               │
├─────────────────────────────┬────────────────────────────┬─────────────────────────────┤
│ 1. FREELANCER HUB           │ 2. CREATOR HUB             │ 3. MARKETPLACE              │
│ • Multi-Currency (USD/EUR..)│ • Fan Tips ($5, $10, $25)  │ • Vendor Onboarding         │
│ • Decimal-Safe Tax/Discount │ • Supporter Feed & Notes   │ • Automated Fee Split Math  │
│ • PDF Invoices & WhatsApp   │ • Recurring Memberships    │ • Multi-Vendor Catalog      │
│ • Hosted PayPal Checkout    │ • Hosted Public Tip Jar    │ • PayPal Mass Payouts CSV   │
├─────────────────────────────┴────────────────────────────┴─────────────────────────────┤
│ 4. POINT-OF-SALE (POS) TERMINAL FOR SMALL MERCHANTS                                    │
│ • Touchscreen Register with Real-time SKU Search & Inventory Auto-Decrement            │
│ • Cash Tender Mode with Automatic Change Calculation                                   │
│ • Dynamic PayPal QR Code Generation with Mobile Checkout & Live Cashier Polling        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 5. AI FINANCIAL INTELLIGENCE LAYER & COCKPIT                                           │
│ • Financial Health Score (0-100) based on liquidity, aging overdue debt, and runway   │
│ • 30-Day Daily Cash Flow Forecasting with Deficit Date Prediction                      │
│ • Client Payment Risk Profiling (Low Risk, Moderate Delay, High Risk)                  │
│ • Anomaly Detection (Revenue Concentration, Overdue Aging, Capture Delays)             │
│ • Gemini Synthesis with Human-in-the-Loop Safe Action Confirmation Gates               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. AI Financial Intelligence Layer

PayPilot does not treat AI as a generic conversational chatbot. Instead, AI serves as an active **autonomous financial intelligence layer**:

- **Debtor Profiles (`calculate_debtor_profiles`)**: Analyzes historical payment delays and punctuality per client, classifying debtor risk (Low Risk, Moderate Delay, High Risk) without fabricating missing data.
- **Cash Flow Forecast (`forecast_cash_flow`)**: Computes projected incoming receivables (weighted by client punctuality) and known outgoing obligations over a 30-day horizon, predicting exact deficit dates.
- **Anomaly Detection (`detect_anomalies`)**: Flags revenue concentration risk (>40% with a single debtor), overdue invoice spikes, velocity decelerations, and unsettled PayPal checkouts.
- **Gemini Synthesis**: Feeds verified, user-scoped metrics to Google Gemini (`gemini-2.5-flash`), generating actionable recommendations with quantified business impact and financial rationale.
- **Human-in-the-Loop Action Confirmation**: Financial actions (e.g., dispatching payment reminders, recording payment terms) require explicit user confirmation via modal dialogs, and every execution is recorded in an immutable `audit_logs` table with duplicate prevention.

---

## 3. PayPal Integration Details

| Workflow | PayPal Developer API / Method | Implementation Details |
| :--- | :--- | :--- |
| **Freelancer Checkout** | `/v2/checkout/orders` | Backend creates order; client approves via PayPal Smart Buttons; backend executes server-side capture verification against DB currency and amount. |
| **Creator Tipping** | `/v2/checkout/orders` | Direct fan payments captured via PayPal REST API; records supporter notes and updates creator balance metrics. |
| **Creator Memberships** | Recurring Billing | Configurable membership tiers with billing intervals (Monthly/Annual) and member subscription ledger. |
| **Marketplace Splits** | Transparent Commission Math & PayPal Mass Payouts Batch | Calculates platform commission cut (e.g., 10%) vs vendor net share (90%) on checkout. Exports ready-to-upload PayPal Payouts CSV (`recipient_email, amount, currency, note, vendor_id`) for batch disbursals. |
| **POS Terminal QR** | Dynamic QR & Mobile REST Checkout | Register generates an on-screen payment QR code (`/pos/pay/:orderNumber`). The mobile customer scans and approves via PayPal; register polls and detects completion in real-time. |
| **Webhooks & Security** | Webhook Receiver & Deduplication | Listens for payment events, logs audit entries, prevents duplicate processing, and auto-cancels reminder sequences upon payment. |

---

## 4. Repository Structure

PayPilot is organized into clean, deployment-ready frontend, backend, and documentation directories:

```
PayPilot/
├── frontend/                     # React 19 + Vite client application
│   ├── public/                   # Static assets and favicon
│   ├── src/
│   │   ├── components/           # Reusable UI, dialogs, charts & cockpit
│   │   ├── context/              # Authentication & state management
│   │   ├── pages/                # Routed views (Dashboard, Invoices, POS, etc.)
│   │   ├── services/             # Centralized API service & HTTP client
│   │   ├── App.jsx               # Route tree and layout providers
│   │   └── main.jsx              # Application entrypoint
│   ├── .env.example              # Frontend environment variables template
│   ├── package.json              # Frontend dependencies and scripts
│   ├── vercel.json               # SPA routing rewrite rule for Vercel
│   ├── vite.config.js            # Vite build and local proxy configuration
│   └── README.md                 # Frontend-specific documentation
│
├── backend/                      # FastAPI Python backend engine
│   ├── alembic/                  # Database migration scripts
│   ├── app/
│   │   ├── api/                  # API routers (auth, invoices, paypal, intelligence, etc.)
│   │   ├── core/                 # Config, database engine, security & CORS
│   │   ├── integrations/         # PayPal SDK client, Gemini AI client
│   │   ├── models/               # SQLAlchemy ORM database models
│   │   ├── schemas/              # Pydantic v2 validation models
│   │   ├── services/             # Financial intelligence & business algorithms
│   │   └── main.py               # FastAPI entrypoint & router registrations
│   ├── scripts/                  # SQLite-to-Supabase migration scripts
│   ├── tests/                    # Automated pytest suites (unit & integration)
│   ├── .env.example              # Backend environment variables template
│   ├── requirements.txt          # Python dependencies manifest
│   ├── run.py                    # Local server startup runner
│   └── README.md                 # Backend-specific documentation
│
├── docs/                         # Architecture and deployment guides
│   ├── deployment.md             # Complete Vercel, Render & Supabase deployment guide
│   ├── api.md                    # Backend API endpoint reference
│   ├── architecture.md           # System architecture overview
│   └── database.md               # Database schema and ER relationships
│
├── .gitignore                    # Git ignore file (excludes secrets, DBs, logs)
├── LICENSE                       # MIT License
└── README.md                     # Project overview and master documentation
```

---

## 5. Technology Stack

- **Frontend**: React 19, Vite, React Router DOM, Lucide Icons, Recharts, Tailwind CSS.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 ORM, Psycopg2, HTTPX.
- **Database**: Supabase PostgreSQL (Production) / SQLite (Local dev & test isolation).
- **Payments**: PayPal REST API (Sandbox & Live) with server-side capture verification.
- **AI Intelligence**: Google GenAI SDK (`google-genai` / Gemini 2.5 Flash).
- **Document Generation**: ReportLab binary PDF invoice streaming.
- **Currency Engine**: Open Exchange Rates API with caching fallback.

---

## 6. Local Development Quickstart

### Prerequisites
- Python 3.11+
- Node.js v18+ & npm

### Step 1: Clone Repository
```bash
git clone https://github.com/shruthi200824-hub/PayPilot.git
cd PayPilot
```

### Step 2: Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your PAYPAL and GEMINI credentials

# Run backend API server
python run.py
```
*API runs at `http://localhost:8000` (Docs: `http://localhost:8000/api/docs`)*

### Step 3: Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`*

---

## 7. Automated Testing & Verification

PayPilot includes comprehensive automated unit and integration tests covering the Financial Intelligence Layer, Gemini API synthesis, authorization, and data isolation:

```bash
# Run backend test suite
pytest backend/tests/ -v

# Run frontend production build
cd frontend
npm run build
```

---

## 8. Cloud Deployment (Vercel & Render)

PayPilot is architected for zero-friction cloud deployment:

- **Frontend**: Deploy on [Vercel](https://vercel.com) using Framework Preset `Vite` with Root Directory `frontend` and output directory `dist`.
- **Backend**: Deploy on [Render](https://render.com) as a Python Web Service with Start Command `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`.
- **Database**: Connect to [Supabase PostgreSQL](https://supabase.com) via Transaction Pooler port `6543`.

For complete step-by-step instructions, see the **[Production Deployment Guide](docs/deployment.md)**.

---

## 9. License

This project is licensed under the [MIT License](LICENSE).
