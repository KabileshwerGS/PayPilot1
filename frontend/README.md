# PayPilot Frontend

The modern, responsive client-side interface for the **PayPilot Autonomous Business & Payments Platform**. Built with React, Vite, Tailwind CSS, and Lucide Icons.

---

## Architecture & Structure

```
frontend/
├── public/                 # Static brand assets and icons
├── src/
│   ├── assets/             # Brand logos and styles
│   ├── components/         # Reusable UI components & modals
│   │   ├── common/         # Buttons, badges, inputs, dialogs
│   │   ├── dashboard/      # Financial Intelligence Cockpit, stat cards
│   │   ├── layout/         # Navigation, TopBar, Sidebar
│   │   ├── freelancer/     # Invoices, client lists, PDF previews
│   │   ├── creator/        # Tip jars, membership tiers, supporter feeds
│   │   ├── marketplace/    # Products, vendor onboarding, payout tables
│   │   └── pos/            # Touch register, QR display, cart
│   ├── context/            # Authentication & application context providers
│   ├── pages/              # Routed view pages
│   ├── services/           # Centralized API service & HTTP client
│   ├── App.jsx             # Route definitions & protected layouts
│   └── main.jsx            # Application entrypoint
├── .env.example            # Environment variables template
├── package.json            # Scripts and dependencies
├── vercel.json             # SPA route rewrite configuration for Vercel
└── vite.config.js          # Vite build and proxy settings
```

---

## Environment Variables

Copy `.env.example` to `.env` or set these in your hosting provider (e.g. Vercel):

| Variable | Description | Local Default | Production (Vercel) Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL of the PayPilot FastAPI backend | `http://localhost:8000` | `https://paypilot-backend.onrender.com` |
| `VITE_PUBLIC_URL` | Public frontend URL used for invoice links & QR codes | `http://localhost:5173` | `https://paypilot.vercel.app` |

---

## Local Development

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server with HMR
npm run dev
# The application will be running at http://localhost:5173
```

### Production Build & Preview

```bash
# Verify production build
npm run build

# Preview production build locally
npm run preview
```

---

## Deploying to Vercel

1. Push your repository to GitHub.
2. Log in to [Vercel](https://vercel.com) and click **"Add New..." > "Project"**.
3. Import your **PayPilot** repository.
4. In the **Project Configuration** screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. In **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://your-render-backend.onrender.com`
   - `VITE_PUBLIC_URL`: `https://your-app.vercel.app`
6. Click **Deploy**. Vercel will build the frontend and serve it globally with fast edge caching and automatic HTTPS.
