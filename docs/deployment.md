# PayPilot Production Deployment Guide

This guide walks through deploying the **PayPilot Autonomous Business & Payments Platform** into a scalable, production-grade cloud environment:

- **Frontend**: [Vercel](https://vercel.com) (Edge CDN, React + Vite SPA)
- **Backend**: [Render](https://render.com) (FastAPI Web Service)
- **Database**: [Supabase](https://supabase.com) (Managed PostgreSQL with Transaction Pooling)
- **Payments**: [PayPal Developer](https://developer.paypal.com) (Smart Checkout, Webhooks, Mass Payouts)
- **Intelligence**: [Google AI Studio](https://aistudio.google.com) (Gemini Financial Intelligence Layer)

```
┌─────────────────────────┐               ┌─────────────────────────┐
│     VERCEL (Frontend)   │               │     RENDER (Backend)    │
│  React + Vite SPA       │               │   FastAPI Web Service   │
│  Edge CDN Cache         │  HTTPS / API  │   Python 3.11+          │
│  https://paypilot.app   ├──────────────►│   https://api.paypilot  │
└─────────────────────────┘               └─────┬─────────────┬─────┘
                                                │             │
                                  PostgreSQL    │             │  REST / Webhooks
                             (Port 6543 / SSL)  ▼             ▼
                                        ┌──────────────┐ ┌────────────────┐
                                        │   SUPABASE   │ │     PAYPAL     │
                                        │  PostgreSQL  │ │  Smart Orders  │
                                        │   Database   │ │  & Webhooks    │
                                        └──────────────┘ └────────────────┘
                                                ▲
                                                │ Financial Insights
                                                │
                                         ┌──────────────┐
                                         │  GOOGLE AI   │
                                         │ Gemini Flash │
                                         └──────────────┘
```

---

## 1. Phase 1: Database Setup on Supabase

PayPilot uses PostgreSQL for production persistence. Supabase provides managed PostgreSQL with connection pooling, automatic backups, and robust uptime.

### Step 1.1: Create a Supabase Project
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Choose an Organization, enter project name `paypilot-db`, set a strong database password, and select a hosting region close to your target users or backend.
4. Wait for database provisioning to finish.

### Step 1.2: Retrieve Connection String
1. In your project dashboard, navigate to **Project Settings** > **Database**.
2. Scroll to **Connection string** and select **URI**.
3. Toggle to **Transaction Pooler** (recommended for serverless/containerized backends on port `6543`):
   ```
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```
4. Note this URI for your backend `DATABASE_URL` environment variable.

### Step 1.3: Initialize Database Schema
When the backend starts up on Render, `Base.metadata.create_all(bind=engine)` automatically creates all required database tables.

If you are migrating existing records from an offline SQLite database, run the bundled migration script:
```bash
python backend/scripts/migrate_sqlite_to_supabase.py --sqlite paypilot.db --dry-run
python backend/scripts/migrate_sqlite_to_supabase.py --sqlite paypilot.db
```

---

## 2. Phase 2: Backend Deployment on Render

### Step 2.1: Create a Web Service
1. Log in to [Render](https://render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository: `https://github.com/shruthi200824-hub/PayPilot.git`.
4. Configure service parameters:
   - **Name**: `paypilot-backend`
   - **Language**: `Python 3`
   - **Region**: Select a region matching or near your Supabase database region.
   - **Branch**: `master`
   - **Root Directory**: Leave blank (repository root).
   - **Build Command**:
     ```bash
     pip install -r backend/requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: Free or Starter ($7/month recommended for continuous uptime).

### Step 2.2: Configure Backend Environment Variables
Under the **Environment Variables** tab in your Render service, add:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `PayPilot Autonomous Back Office` | Name displayed in OpenAPI docs |
| `SECRET_KEY` | `64_character_random_hex_string` | Random JWT secret key |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` | Token lifetime (7 days) |
| `DATABASE_URL` | `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require` | Supabase pooled connection string |
| `ALLOWED_ORIGINS` | `https://paypilot.vercel.app,http://localhost:5173` | Comma-separated frontend origins for CORS |
| `FRONTEND_URL` | `https://paypilot.vercel.app` | Production frontend domain |
| `FRONTEND_PUBLIC_URL` | `https://paypilot.vercel.app` | Public URL for invoice/QR links |
| `PAYPAL_MODE` | `sandbox` (or `live`) | PayPal environment |
| `PAYPAL_CLIENT_ID` | `AQ...` | PayPal Developer Client ID |
| `PAYPAL_CLIENT_SECRET` | `EL...` | PayPal Developer Secret |
| `PAYPAL_WEBHOOK_ID` | `WH...` | PayPal Webhook listener ID |
| `GEMINI_API_KEY` | `AIza...` | Google AI Studio API Key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `EXCHANGE_RATE_API_URL` | `https://open.er-api.com/v6/latest` | Multi-currency FX rates |

5. Click **Create Web Service**.
6. Once deployed, verify by opening `https://<your-render-subdomain>.onrender.com/api/health`. You should receive:
   ```json
   {
     "status": "healthy",
     "service": "PayPilot Backend Engine",
     "database": "connected"
   }
   ```

---

## 3. Phase 3: Frontend Deployment on Vercel

### Step 3.1: Create a Vercel Project
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import your **PayPilot** repository.
4. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3.2: Configure Frontend Environment Variables
In the **Environment Variables** section, add:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://paypilot-backend.onrender.com` | Live Render backend endpoint |
| `VITE_PUBLIC_URL` | `https://your-paypilot-app.vercel.app` | Production frontend URL |

### Step 3.3: Deploy and Route Verification
1. Click **Deploy**.
2. Vercel automatically runs the Vite production build and publishes your assets across edge networks.
3. The bundled `frontend/vercel.json` provides SPA fallback routing so direct URLs (e.g. `/dashboard`, `/freelancer`, `/creator`, `/pos`) work properly on page refresh.

---

## 4. Phase 4: PayPal Configuration & Webhooks

### Step 4.1: PayPal Developer Credentials
1. Go to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Under **Apps & Credentials**, switch to **Sandbox** (for testing) or **Live** (for production).
3. Create or select your REST API app.
4. Copy the **Client ID** and **Secret Key** into your Render environment variables.

### Step 4.2: Webhook Listener Registration
1. In the app settings on PayPal Developer Dashboard, scroll to **Webhooks** and click **Add Webhook**.
2. Set the **Webhook URL** to:
   ```
   https://your-backend.onrender.com/api/payments/webhook
   ```
3. Under **Event Types**, check:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
4. Save the webhook and copy the generated **Webhook ID** into the `PAYPAL_WEBHOOK_ID` environment variable on Render.

---

## 5. Phase 5: Google Gemini AI Configuration

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Generate an API Key under **Get API key**.
3. Add the key as `GEMINI_API_KEY` on Render.
4. The backend uses `gemini-2.5-flash` by default, providing high-speed token generation for debtor profiling synthesis, cash flow anomaly detection, and natural language recommendations.

---

## 6. Post-Deployment Verification Checklist

Verify each of the following workflows in production:

- [ ] **Health Endpoint**: `GET https://your-backend.onrender.com/api/health` returns `status: healthy` and `database: connected`.
- [ ] **API Documentation**: Open `https://your-backend.onrender.com/api/docs` to inspect the complete interactive OpenAPI spec.
- [ ] **User Registration & Login**: Create a new business account from the frontend and verify JWT authentication works.
- [ ] **CORS Verification**: Inspect browser Network tab to ensure requests from your Vercel domain succeed with HTTP 200 without CORS errors.
- [ ] **Freelancer Hub**: Create an invoice, download the generated PDF, and verify hosted payment link generation.
- [ ] **PayPal Sandbox Checkout**: Complete a test payment using a PayPal sandbox personal account and confirm the status changes to `paid`.
- [ ] **Payments Ledger**: Verify the payment transaction appears in the centralized Payments Ledger across the correct stream.
- [ ] **Creator Hub**: Load a public tip jar and verify tipping options and supporter note recording.
- [ ] **Marketplace**: Test product creation, cart checkout, and commission fee split calculations.
- [ ] **POS Terminal**: Run a test sale in cash tender mode with change calculation, and test PayPal dynamic QR code generation.
- [ ] **AI Financial Intelligence Cockpit**:
  - Verify Financial Health Score displays (out of 100).
  - Inspect Cash Flow Forecast and projected balances over 30 days.
  - Review Client Risk categorizations.
  - Check Gemini Recommendations with quantitative rationale.
  - Test executing a safe action (e.g. payment reminder notice) with the confirmation modal.

---

## 7. Troubleshooting Common Issues

### Issue 1: CORS Error in Browser Console
**Symptom**: `Access to fetch at ... from origin 'https://paypilot.vercel.app' has been blocked by CORS policy`.  
**Resolution**: Ensure `ALLOWED_ORIGINS` in Render includes your exact Vercel domain (e.g. `https://paypilot.vercel.app` without a trailing slash).

### Issue 2: Supabase Database Connection Timeout
**Symptom**: `psycopg2.OperationalError: could not connect to server: Connection timed out`.  
**Resolution**:
- Ensure you are using the **Transaction Pooler** endpoint on port `6543`, not the direct port `5432` which may be blocked or exhaust connection limits.
- Verify `?sslmode=require` is appended to the `DATABASE_URL`.

### Issue 3: 404 Not Found on Page Refresh (Vercel)
**Symptom**: Navigating to `https://paypilot.vercel.app/dashboard` works, but refreshing the page returns 404.  
**Resolution**: Ensure `frontend/vercel.json` contains the rewrite rule pointing all paths to `/index.html`.

