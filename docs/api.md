# PayPilot API Specification

All protected endpoints require an `Authorization: Bearer <token>` header obtained from `/api/auth/login` or `/api/auth/register`.

Base URL: `http://localhost:8000/api`

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
Creates a new user account and returns a JWT access token.
- **Request Body**:
  ```json
  {
    "full_name": "Sarah Connor",
    "email": "sarah@cyberdyne.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user_id": 1,
    "email": "sarah@cyberdyne.com",
    "full_name": "Sarah Connor"
  }
  ```

### `POST /api/auth/login`
Authenticates user credentials and returns a JWT token.

### `GET /api/auth/me`
Retrieves current authenticated user profile.

### `POST /api/auth/logout`
Terminates current session.

---

## 2. Business Profile (`/api/business`)

### `GET /api/business`
Retrieves the user's business profile. Returns `404` if onboarding is incomplete.

### `POST /api/business`
Initializes business profile during onboarding.
- **Request Body**:
  ```json
  {
    "business_name": "Cyberdyne Strategy Consulting",
    "business_type": "Agency",
    "owner_name": "Sarah Connor",
    "email": "sarah@cyberdyne.com",
    "phone": "+1 555-0199",
    "country": "United States",
    "address": "450 Technology Way",
    "default_currency": "USD",
    "time_zone": "America/Chicago"
  }
  ```

### `PUT /api/business`
Updates business profile information.

---

## 3. Client Management (`/api/clients`)

### `GET /api/clients?include_archived=false`
Returns list of clients belonging to the authenticated user.

### `POST /api/clients`
Registers a new customer.
- **Request Body**:
  ```json
  {
    "name": "Omni Consumer Products",
    "email": "ap@ocp.com",
    "company": "OCP Inc",
    "country": "United States",
    "billing_address": "1 Detroit Plaza",
    "preferred_currency": "USD",
    "notes": "Net 14 payment terms"
  }
  ```

### `GET /api/clients/{id}`
Returns client details.

### `PUT /api/clients/{id}`
Updates client information.

### `DELETE /api/clients/{id}`
Archives client record (`is_archived = true`) without destroying historical invoices.

---

## 4. Invoices (`/api/invoices`)

### `GET /api/invoices?status=ALL&limit=10`
Returns invoices with optional status filter (`DRAFT`, `APPROVED`, `SENT`, `PAID`, `OVERDUE`, `CANCELLED`).

### `POST /api/invoices`
Creates a new invoice with decimal-safe line item arithmetic.
- **Request Body**:
  ```json
  {
    "client_id": 1,
    "currency": "USD",
    "issue_date": "2026-11-01",
    "due_date": "2026-11-15",
    "tax_rate": 8.5,
    "discount_amount": 100.0,
    "notes": "Full stack architecture consulting",
    "terms": "Net 14 days",
    "items": [
      {
        "description": "API Architecture",
        "quantity": 10.0,
        "unit_price": 150.0
      }
    ],
    "approve_immediately": false
  }
  ```

### `POST /api/invoices/{id}/approve`
Transitions invoice from `DRAFT` to `APPROVED`.

### `POST /api/invoices/{id}/send`
Transitions invoice to `SENT` and records an in-app dispatch notification.

### `POST /api/invoices/{id}/cancel`
Cancels invoice (allowed only if unpaid).

### `GET /api/invoices/{id}/pdf`
Generates and streams binary invoice PDF with ReportLab.

---

## 5. Public Checkout (`/api/public/invoices`)

### `GET /api/public/invoices/{invoice_number}`
Publicly accessible invoice endpoint powering client checkout page (`/pay/:invoiceNumber`).

---

## 6. Payments & PayPal (`/api/payments`)

### `GET /api/payments`
Lists verified payment ledger records.

### `POST /api/payments/paypal/create-order/{invoice_id}`
Creates a PayPal order on PayPal REST API.

### `POST /api/payments/paypal/capture/{order_id}`
Captures and cryptographically verifies PayPal payment amount/currency against the invoice, records transaction, and transitions invoice status to `PAID`.

### `POST /api/webhooks/paypal`
Receives and records PayPal webhook events.

---

## 7. Dashboard (`/api/dashboard`)

### `GET /api/dashboard/summary`
Returns live financial cards:
- `total_revenue`: Verified collected payments
- `pending_amount`: Sum of approved and sent invoices
- `overdue_amount`: Sum of overdue invoices
- `total_clients`: Active client count
- `total_invoices`: Active invoice count
- `successful_payments`: Verified payment count

### `GET /api/dashboard/revenue`
Returns monthly revenue trend aggregates.

### `GET /api/dashboard/activity`
Returns recent activity log.

---

## 8. AI Pilot Assistant (`/api/ai`)

### `POST /api/ai/chat`
Processes conversational prompt using Google Gemini grounded in authorized database context.
- **Request**:
  ```json
  {
    "message": "Which clients have not paid?"
  }
  ```
- **Response**:
  ```json
  {
    "reply": "You currently have 1 overdue invoice for Omni Consumer Products ($3,155.00). Would you like to dispatch a reminder?",
    "proposed_action": {
      "action_type": "TRIGGER_REMINDERS",
      "title": "Dispatch Overdue Reminders",
      "description": "Send scheduled reminder sequences.",
      "payload": {}
    }
  }
  ```

### `POST /api/ai/actions/execute`
Executes user-confirmed action proposal.

---

## 9. Reminders (`/api/reminders`)

### `GET /api/reminders`
Returns historical reminder dispatch records.

### `POST /api/reminders/process`
Runs automated due-date scanner for courtesy (3 days prior), on-due, and overdue invoices.

---

## 10. Analytics (`/api/analytics`)

### `GET /api/analytics/reports`
Returns consolidated reporting currency breakdown, live exchange rates, and revenue by client.

### `GET /api/analytics/export/csv`
Streams CSV accounting ledger.

