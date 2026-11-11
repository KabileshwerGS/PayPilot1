# PayPilot Architecture Documentation

## System Overview
PayPilot is designed as an autonomous back office for freelancers, independent consultants, and boutique service agencies. The platform bridges client relationship tracking, multi-currency invoicing, PayPal payment processing, automated reminder workflows, and conversational business intelligence.

```
[ User Browser (React 19 + Vite SPA) ]
      │  ▲
      │  │ REST APIs + JWT Bearer Tokens
      ▼  │
[ FastAPI Backend (Python 3.13) ]
      ├── API Routers (Auth, Business, Clients, Invoices, Payments, Reminders, Analytics, AI)
      ├── Security Layer (Bcrypt, JWT creation & validation, Multi-tenant query isolation)
      ├── Business Engines:
      │     ├── Decimal Arithmetic Engine (Guarantees zero floating-point errors)
      │     ├── PDF Invoice Generator (ReportLab binary streaming)
      │     ├── Reminder Sequence Scanner (Due-date evaluation & auto-cessation)
      │     └── Currency Converter (Live exchange rate cache)
      ├── External Integrations:
      │     ├── PayPal REST API (Client Credentials, Server Orders & Verified Captures)
      │     └── Google Gemini 2.5 (Grounded context prompt schemas & action proposals)
      └── Data Access Layer (SQLAlchemy 2.0 ORM)
            │
            ▼
      [ SQLite (Local Development) / PostgreSQL (Production Deployment) ]
```

## Security & Architectural Guarantees
1. **Decimal Precision**: All monetary quantities and exchange rates are handled with Python `Decimal` and SQL `Numeric(12, 2)` to eliminate floating-point rounding issues.
2. **Multi-Tenant Scoping**: All database queries strictly authenticate and filter records by `user_id` derived from the verified JWT bearer token. Frontend-supplied user IDs are never trusted.
3. **Server-Side PayPal Verification**: Invoices are never marked as paid based on client redirects. Payment records are generated only after backend verification of captured PayPal orders against expected invoice total and currency.
4. **Two-Phase Financial AI Safety**: The AI Pilot evaluates actual database context. Any mutating action (such as creating invoices or sending reminders) generates a structured action proposal requiring explicit user confirmation before executing.
5. **Non-Destructive Archival**: Deleting clients sets `is_archived = True`, preserving historical accounting and tax ledgers.

