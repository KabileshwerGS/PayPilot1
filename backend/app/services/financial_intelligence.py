"""PayPilot Financial Intelligence Layer - Core Deterministic Analysis Service

This service provides quantitative financial telemetry for businesses:
1. Debtor & Late-Payment Behavioral Profiling
2. Cash-Flow Forecasting & Deficit Risk Detection
3. Financial Anomaly & Revenue Concentration Detection

Rules:
- Strict user-level data isolation (all queries filtered by user_id).
- Strictly grounded in verified database records (no fake/invented numbers).
- Handles empty states and missing historical data gracefully without false alerts.
- Distinguishes actual confirmed amounts from estimated/weighted projections.
"""

from datetime import datetime, date, timezone, timedelta
from typing import Dict, Any, List, Optional
from decimal import Decimal
from statistics import mean, median
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.business import BusinessProfile
from backend.app.models.clients import Client
from backend.app.models.invoices import Invoice
from backend.app.models.payments import Payment
from backend.app.models.payouts import Payout
from backend.app.models.creators import CreatorProfile, Tip
from backend.app.models.marketplace import MarketplaceOrder, VendorPayout
from backend.app.models.pos import POSOrder
from backend.app.models.exchange_rates import ExchangeRate
from backend.app.services.exchange_rate_service import FALLBACK_RATES


def parse_date_safe(val: Any) -> Optional[date]:
    """Safely extracts a date object from str, datetime, date, or None."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        cleaned = val.strip()
        if not cleaned:
            return None
        # Try YYYY-MM-DD
        if len(cleaned) >= 10:
            date_part = cleaned[:10]
            try:
                return datetime.strptime(date_part, "%Y-%m-%d").date()
            except ValueError:
                pass
        # Try ISO format
        try:
            return datetime.fromisoformat(cleaned.replace("Z", "+00:00")).date()
        except ValueError:
            pass
    return None


def get_conversion_rate(base_curr: str, target_curr: str, db: Session) -> float:
    """Synchronous currency conversion rate lookup using DB cache and static fallback rates."""
    base = (base_curr or "USD").upper().strip()
    target = (target_curr or "USD").upper().strip()
    if base == target:
        return 1.0

    # 1. Query database exchange_rates table
    try:
        cached = db.query(ExchangeRate).filter(
            ExchangeRate.base_currency == base,
            ExchangeRate.target_currency == target,
        ).order_by(ExchangeRate.fetched_at.desc()).first()
        if cached and cached.rate:
            return float(cached.rate)

        # Reverse lookup
        cached_rev = db.query(ExchangeRate).filter(
            ExchangeRate.base_currency == target,
            ExchangeRate.target_currency == base,
        ).order_by(ExchangeRate.fetched_at.desc()).first()
        if cached_rev and cached_rev.rate and float(cached_rev.rate) > 0:
            return 1.0 / float(cached_rev.rate)
    except Exception:
        pass

    # 2. Check fallback rates
    if (base, target) in FALLBACK_RATES:
        return float(FALLBACK_RATES[(base, target)])
    if (target, base) in FALLBACK_RATES and FALLBACK_RATES[(target, base)] > 0:
        return 1.0 / float(FALLBACK_RATES[(target, base)])

    return 1.0


def calculate_debtor_profiles(user_id: int, db: Session) -> Dict[str, Any]:
    """Analyzes client settlement behaviors, payment delays, trends, and risk tiers.

    Strict user-level isolation: Only clients and invoices belonging to user_id are accessed.
    No missing payment history is invented.
    """
    today = datetime.now(timezone.utc).date()

    # User's default currency
    biz = db.query(BusinessProfile).filter(BusinessProfile.user_id == user_id).first()
    default_currency = biz.default_currency if biz else "USD"

    clients = db.query(Client).filter(
        Client.user_id == user_id,
        Client.is_archived == False,
    ).order_by(Client.name.asc()).all()

    profiles: List[Dict[str, Any]] = []
    total_paid_invoices_all = 0
    delays_portfolio: List[int] = []

    for client in clients:
        # Fetch client's invoices for this user
        invoices = db.query(Invoice).filter(
            Invoice.user_id == user_id,
            Invoice.client_id == client.id,
            Invoice.status != "CANCELLED",
        ).order_by(Invoice.created_at.asc()).all()

        paid_delays: List[int] = []
        paid_records: List[Dict[str, Any]] = []
        total_billed = Decimal("0.0")
        total_paid = Decimal("0.0")
        outstanding_amount = Decimal("0.0")
        overdue_invoices_count = 0
        unpaid_invoices_count = 0
        last_payment_date: Optional[str] = None

        for inv in invoices:
            rate = get_conversion_rate(inv.currency, default_currency, db)
            converted_amount = Decimal(str(inv.total_amount)) * Decimal(str(rate))
            total_billed += converted_amount

            due_d = parse_date_safe(inv.due_date)

            if inv.status == "PAID":
                # Find matching verified payment
                pay_rec = db.query(Payment).filter(
                    Payment.user_id == user_id,
                    Payment.invoice_id == inv.id,
                    Payment.status == "COMPLETED",
                ).first()

                pay_d = None
                if pay_rec:
                    pay_d = parse_date_safe(pay_rec.payment_date) or parse_date_safe(pay_rec.created_at)
                    p_rate = get_conversion_rate(pay_rec.currency, default_currency, db)
                    total_paid += Decimal(str(pay_rec.amount)) * Decimal(str(p_rate))
                elif inv.paid_at:
                    pay_d = parse_date_safe(inv.paid_at)
                    total_paid += converted_amount
                else:
                    total_paid += converted_amount

                if pay_d:
                    if last_payment_date is None or pay_d.isoformat() > last_payment_date:
                        last_payment_date = pay_d.isoformat()

                if due_d and pay_d:
                    delay = (pay_d - due_d).days
                    paid_delays.append(delay)
                    delays_portfolio.append(delay)
                    paid_records.append({
                        "invoice_number": inv.invoice_number,
                        "due_date": due_d.isoformat(),
                        "paid_date": pay_d.isoformat(),
                        "delay_days": delay,
                        "paid_early": delay < 0,
                        "paid_on_time": delay == 0,
                        "paid_late": delay > 0,
                    })
            elif inv.status in ["APPROVED", "SENT", "OVERDUE"]:
                unpaid_invoices_count += 1
                outstanding_amount += converted_amount
                if due_d and due_d < today:
                    overdue_invoices_count += 1

        paid_count = len(paid_delays)
        total_paid_invoices_all += paid_count

        # Compute delay statistics without inventing data
        avg_delay: Optional[float] = None
        med_delay: Optional[float] = None
        on_time_rate_pct: Optional[float] = None

        if paid_count > 0:
            avg_delay = round(float(mean(paid_delays)), 1)
            med_delay = round(float(median(paid_delays)), 1)
            on_time_count = sum(1 for d in paid_delays if d <= 0)
            on_time_rate_pct = round((on_time_count / paid_count) * 100.0, 1)

        # Determine payment trend
        if paid_count >= 3:
            mid = paid_count // 2
            earlier_avg = mean(paid_delays[:mid])
            later_avg = mean(paid_delays[mid:])
            diff = later_avg - earlier_avg
            if diff > 3.0:
                trend = "DETERIORATING"
            elif diff < -3.0:
                trend = "IMPROVING"
            else:
                trend = "STABLE"
        elif paid_count in [1, 2]:
            trend = "INSUFFICIENT_HISTORY"
        else:
            trend = "NO_PAYMENT_HISTORY"

        # Determine risk tier based on empirical records
        if paid_count == 0:
            if overdue_invoices_count > 0:
                risk_tier = "HIGH_RISK"
                reliability_score = 0.35
                recommended_terms = "Require upfront payment before releasing deliverables."
            else:
                risk_tier = "INSUFFICIENT_DATA"
                reliability_score = 0.75
                recommended_terms = "Milestone billing with 50% deposit for new engagements."
        else:
            # Empirical classification based on delay and overdue state
            if avg_delay is not None and (avg_delay > 14.0 or overdue_invoices_count >= 2 or (on_time_rate_pct is not None and on_time_rate_pct < 50.0)):
                risk_tier = "HIGH_RISK"
                reliability_score = max(0.20, min(0.50, round((on_time_rate_pct or 0.0) / 100.0, 2)))
                recommended_terms = "Enforce Net-7 terms and require 50% upfront PayPal milestone deposit."
            elif avg_delay is not None and (avg_delay > 3.0 or overdue_invoices_count == 1 or (on_time_rate_pct is not None and on_time_rate_pct < 80.0)):
                risk_tier = "MODERATE_DELAY"
                reliability_score = max(0.55, min(0.80, round((on_time_rate_pct or 70.0) / 100.0, 2)))
                recommended_terms = "Automate payment reminders 3 days before due date; offer early settlement discount."
            else:
                risk_tier = "LOW_RISK"
                reliability_score = max(0.85, min(1.00, round((on_time_rate_pct or 100.0) / 100.0, 2)))
                recommended_terms = "Eligible for standard Net-30 invoicing with priority turnaround."

        profiles.append({
            "client_id": client.id,
            "client_name": client.name,
            "company": client.company or "",
            "preferred_currency": client.preferred_currency or "USD",
            "total_invoices": len(invoices),
            "paid_invoices_count": paid_count,
            "unpaid_invoices_count": unpaid_invoices_count,
            "overdue_invoices_count": overdue_invoices_count,
            "total_billed": float(round(total_billed, 2)),
            "total_paid": float(round(total_paid, 2)),
            "outstanding_amount": float(round(outstanding_amount, 2)),
            "average_payment_delay_days": avg_delay,
            "median_payment_delay_days": med_delay,
            "on_time_payment_rate_pct": on_time_rate_pct,
            "payment_trend": trend,
            "risk_tier": risk_tier,
            "reliability_score": reliability_score,
            "has_unsettled_overdue": overdue_invoices_count > 0,
            "last_payment_date": last_payment_date,
            "recommended_terms": recommended_terms,
        })

    # Summary aggregations
    portfolio_avg_delay = round(float(mean(delays_portfolio)), 1) if delays_portfolio else None

    summary = {
        "total_clients": len(clients),
        "low_risk_count": sum(1 for p in profiles if p["risk_tier"] == "LOW_RISK"),
        "moderate_delay_count": sum(1 for p in profiles if p["risk_tier"] == "MODERATE_DELAY"),
        "high_risk_count": sum(1 for p in profiles if p["risk_tier"] == "HIGH_RISK"),
        "insufficient_data_count": sum(1 for p in profiles if p["risk_tier"] == "INSUFFICIENT_DATA"),
        "total_paid_invoices_analyzed": total_paid_invoices_all,
        "portfolio_average_delay_days": portfolio_avg_delay,
        "base_currency": default_currency,
    }

    return {
        "user_id": user_id,
        "profiles": profiles,
        "summary": summary,
    }


def forecast_cash_flow(user_id: int, db: Session, horizon_days: int = 30) -> Dict[str, Any]:
    """Generates a daily projected cash-flow forecast over horizon_days.

    - Inflows: Unpaid invoices weighted by individual client payment reliability scores.
    - Outflows: Known pending staff payouts and vendor split payouts.
    - Identifies deficit dates, runway, and lowest liquidity point.
    - Explicitly distinguishes actual confirmed figures from estimated projections.
    """
    today = datetime.now(timezone.utc).date()
    horizon = max(7, min(180, int(horizon_days)))

    biz = db.query(BusinessProfile).filter(BusinessProfile.user_id == user_id).first()
    default_currency = biz.default_currency if biz else "USD"

    # 1. Starting verified liquid cash position from all 4 solutions
    verified_payments = db.query(Payment).filter(
        Payment.user_id == user_id,
        Payment.status == "COMPLETED",
    ).all()
    freelance_rev = sum(
        (Decimal(str(p.amount)) * Decimal(str(get_conversion_rate(p.currency, default_currency, db))))
        for p in verified_payments
    )

    creator_prof = db.query(CreatorProfile).filter(CreatorProfile.user_id == user_id).first()
    creator_rev = Decimal("0.0")
    if creator_prof:
        tips = db.query(Tip).filter(Tip.creator_id == creator_prof.id, Tip.status == "COMPLETED").all()
        creator_rev = sum(
            (Decimal(str(t.amount)) * Decimal(str(get_conversion_rate(t.currency, default_currency, db))))
            for t in tips
        )

    mkt_orders = db.query(MarketplaceOrder).filter(
        MarketplaceOrder.user_id == user_id,
        MarketplaceOrder.payment_status == "COMPLETED",
    ).all()
    marketplace_rev = sum(
        (Decimal(str(mo.platform_commission)) * Decimal(str(get_conversion_rate(mo.currency, default_currency, db))))
        for mo in mkt_orders
    )

    pos_orders = db.query(POSOrder).filter(
        POSOrder.user_id == user_id,
        POSOrder.payment_status == "COMPLETED",
    ).all()
    pos_rev = sum(
        (Decimal(str(po.total_amount)) * Decimal(str(get_conversion_rate(po.currency, default_currency, db))))
        for po in pos_orders
    )

    total_gross_collections = freelance_rev + creator_rev + marketplace_rev + pos_rev

    # Verified disbursements (Staff & Vendor payouts already PAID)
    paid_payouts = db.query(Payout).filter(
        Payout.user_id == user_id,
        Payout.status == "PAID",
    ).all()
    total_staff_paid = sum(
        (Decimal(str(p.amount)) * Decimal(str(get_conversion_rate(p.currency, default_currency, db))))
        for p in paid_payouts
    )

    paid_vendor_payouts = db.query(VendorPayout).filter(
        VendorPayout.user_id == user_id,
        VendorPayout.status == "PAID",
    ).all()
    total_vendor_paid = sum(
        (Decimal(str(vp.amount)) * Decimal(str(get_conversion_rate(vp.currency, default_currency, db))))
        for vp in paid_vendor_payouts
    )

    starting_verified_balance = total_gross_collections - (total_staff_paid + total_vendor_paid)

    # 2. Get debtor profile mappings for reliability weighting
    debtor_data = calculate_debtor_profiles(user_id, db)
    debtor_map = {p["client_id"]: p for p in debtor_data.get("profiles", [])}

    # 3. Model scheduled receivables (inflows)
    unpaid_invoices = db.query(Invoice).filter(
        Invoice.user_id == user_id,
        Invoice.status.in_(["APPROVED", "SENT", "OVERDUE"]),
    ).all()

    daily_inflows_nominal: Dict[str, float] = {}
    daily_inflows_weighted: Dict[str, float] = {}
    scheduled_inflow_items: List[Dict[str, Any]] = []

    for inv in unpaid_invoices:
        rate = get_conversion_rate(inv.currency, default_currency, db)
        nominal_amt = float(Decimal(str(inv.total_amount)) * Decimal(str(rate)))

        profile = debtor_map.get(inv.client_id)
        reliability = profile["reliability_score"] if profile else 0.70
        avg_delay = profile["average_payment_delay_days"] if (profile and profile["average_payment_delay_days"] is not None) else 0.0

        due_d = parse_date_safe(inv.due_date) or (today + timedelta(days=7))

        # Expected settlement date estimation:
        if due_d >= today:
            # Future due date + client's historical delay
            expected_date = due_d + timedelta(days=max(0, int(round(avg_delay))))
        else:
            # Past due: expected within recovery window based on risk
            if profile and profile["risk_tier"] == "LOW_RISK":
                expected_date = today + timedelta(days=2)
            elif profile and profile["risk_tier"] == "MODERATE_DELAY":
                expected_date = today + timedelta(days=5)
            else:
                expected_date = today + timedelta(days=10)

        # Only forecast within the requested horizon
        horizon_end_date = today + timedelta(days=horizon)
        if today <= expected_date <= horizon_end_date:
            date_key = expected_date.isoformat()
            weighted_amt = round(nominal_amt * reliability, 2)

            daily_inflows_nominal[date_key] = daily_inflows_nominal.get(date_key, 0.0) + nominal_amt
            daily_inflows_weighted[date_key] = daily_inflows_weighted.get(date_key, 0.0) + weighted_amt

            scheduled_inflow_items.append({
                "invoice_id": inv.id,
                "invoice_number": inv.invoice_number,
                "client_id": inv.client_id,
                "client_name": profile["client_name"] if profile else "Client",
                "original_due_date": due_d.isoformat(),
                "expected_payment_date": date_key,
                "nominal_amount": round(nominal_amt, 2),
                "weighted_amount": weighted_amt,
                "confidence_score": reliability,
                "is_overdue": due_d < today,
            })

    # 4. Model scheduled outgoing obligations (outflows)
    pending_staff_payouts = db.query(Payout).filter(
        Payout.user_id == user_id,
        Payout.status.in_(["PENDING", "APPROVED"]),
    ).all()

    daily_outflows: Dict[str, float] = {}
    scheduled_outflow_items: List[Dict[str, Any]] = []

    for po in pending_staff_payouts:
        rate = get_conversion_rate(po.currency, default_currency, db)
        p_amount = float(Decimal(str(po.amount)) * Decimal(str(rate)))
        # Target date from period_end or default scheduled date
        sched_d = parse_date_safe(po.period_end) or (today + timedelta(days=5))
        if sched_d < today:
            sched_d = today + timedelta(days=1)  # Past due payout payable immediately

        if today <= sched_d <= today + timedelta(days=horizon):
            d_key = sched_d.isoformat()
            daily_outflows[d_key] = daily_outflows.get(d_key, 0.0) + p_amount
            scheduled_outflow_items.append({
                "id": po.id,
                "type": "STAFF_PAYOUT",
                "reference": po.payout_reference,
                "scheduled_date": d_key,
                "amount": round(p_amount, 2),
                "status": po.status,
            })

    pending_vendor_payouts = db.query(VendorPayout).filter(
        VendorPayout.user_id == user_id,
        VendorPayout.status.in_(["PENDING", "APPROVED"]),
    ).all()

    for vpo in pending_vendor_payouts:
        rate = get_conversion_rate(vpo.currency, default_currency, db)
        vp_amount = float(Decimal(str(vpo.amount)) * Decimal(str(rate)))
        sched_d = today + timedelta(days=7)  # Marketplace vendor cycle
        if today <= sched_d <= today + timedelta(days=horizon):
            d_key = sched_d.isoformat()
            daily_outflows[d_key] = daily_outflows.get(d_key, 0.0) + vp_amount
            scheduled_outflow_items.append({
                "id": vpo.id,
                "type": "VENDOR_PAYOUT",
                "reference": vpo.payout_reference,
                "scheduled_date": d_key,
                "amount": round(vp_amount, 2),
                "status": vpo.status,
            })

    # 5. Build daily timeline simulation
    timeline: List[Dict[str, Any]] = []
    current_simulated_balance = float(starting_verified_balance)
    deficit_dates: List[str] = []
    min_projected_balance = current_simulated_balance

    for day_idx in range(horizon + 1):
        cur_d = today + timedelta(days=day_idx)
        cur_key = cur_d.isoformat()

        day_nominal_in = daily_inflows_nominal.get(cur_key, 0.0)
        day_weighted_in = daily_inflows_weighted.get(cur_key, 0.0)
        day_out = daily_outflows.get(cur_key, 0.0)

        daily_net = day_weighted_in - day_out
        current_simulated_balance += daily_net
        min_projected_balance = min(min_projected_balance, current_simulated_balance)

        is_deficit = current_simulated_balance < 0.0
        if is_deficit:
            deficit_dates.append(cur_key)

        timeline.append({
            "day_offset": day_idx,
            "date": cur_key,
            "scheduled_nominal_inflow": round(day_nominal_in, 2),
            "projected_weighted_inflow": round(day_weighted_in, 2),
            "known_outflow": round(day_out, 2),
            "net_daily_flow": round(daily_net, 2),
            "projected_cumulative_balance": round(current_simulated_balance, 2),
            "is_deficit": is_deficit,
        })

    # 6. Runway & Deficit Risk Evaluation
    earliest_deficit = deficit_dates[0] if deficit_dates else None
    runway_days: Optional[int] = None
    if earliest_deficit:
        d_obj = parse_date_safe(earliest_deficit)
        if d_obj:
            runway_days = (d_obj - today).days
    else:
        runway_days = horizon  # Solvent through horizon

    total_nominal_in = sum(daily_inflows_nominal.values())
    total_weighted_in = sum(daily_inflows_weighted.values())
    total_known_out = sum(daily_outflows.values())

    return {
        "user_id": user_id,
        "horizon_days": horizon,
        "base_currency": default_currency,
        "starting_verified_balance": round(float(starting_verified_balance), 2),
        "projected_ending_balance": round(current_simulated_balance, 2),
        "minimum_projected_balance": round(min_projected_balance, 2),
        "has_deficit_risk": len(deficit_dates) > 0,
        "earliest_deficit_date": earliest_deficit,
        "projected_runway_days": runway_days,
        "deficit_days_count": len(deficit_dates),
        "totals": {
            "total_nominal_inflows": round(total_nominal_in, 2),
            "total_weighted_inflows": round(total_weighted_in, 2),
            "total_known_outflows": round(total_known_out, 2),
            "net_projected_change": round(total_weighted_in - total_known_out, 2),
        },
        "timeline": timeline,
        "scheduled_inflows": scheduled_inflow_items,
        "scheduled_outflows": scheduled_outflow_items,
        "data_classification": {
            "actual_confirmed_balance": True,
            "actual_known_obligations": True,
            "estimated_inflows_reliability_weighted": True,
            "unmodelled_factors": [
                "Fixed external overhead (rent, utilities, software subscriptions) not tracked in PayPilot is excluded.",
                "Discretionary owner withdrawals and tax reserve remittances are not automatically deducted.",
                "Future PayPal transaction processing fees are not deducted until settlement.",
            ],
        },
    }


def detect_anomalies(user_id: int, db: Session) -> Dict[str, Any]:
    """Scans business data for concentration risks, velocity decelerations, and aging debt.

    - Strict user-level isolation.
    - Suppresses false alerts when baseline transaction history is insufficient.
    """
    today = datetime.now(timezone.utc).date()

    biz = db.query(BusinessProfile).filter(BusinessProfile.user_id == user_id).first()
    default_currency = biz.default_currency if biz else "USD"

    anomalies: List[Dict[str, Any]] = []
    insufficient_baseline_notes: List[str] = []

    # 1. Revenue Concentration Risk
    payments = db.query(Payment).filter(
        Payment.user_id == user_id,
        Payment.status == "COMPLETED",
    ).all()

    clients = db.query(Client).filter(
        Client.user_id == user_id,
        Client.is_archived == False,
    ).all()
    client_name_map = {c.id: c.name for c in clients}

    total_revenue = Decimal("0.0")
    client_revenue_map: Dict[int, Decimal] = {}

    for p in payments:
        rate = get_conversion_rate(p.currency, default_currency, db)
        amt = Decimal(str(p.amount)) * Decimal(str(rate))
        total_revenue += amt
        client_revenue_map[p.client_id] = client_revenue_map.get(p.client_id, Decimal("0.0")) + amt

    if len(payments) >= 3 and len(clients) >= 2 and total_revenue > Decimal("0.0"):
        for cid, camt in client_revenue_map.items():
            share = float(camt / total_revenue)
            cname = client_name_map.get(cid, f"Client #{cid}")
            if share >= 0.70:
                anomalies.append({
                    "code": "CRITICAL_REVENUE_CONCENTRATION",
                    "category": "REVENUE",
                    "severity": "CRITICAL",
                    "title": f"Critical Client Concentration: {cname} ({share*100:.1f}%)",
                    "description": f"{cname} accounts for {share*100:.1f}% of total lifetime collections ({default_currency} {camt:.2f} of {default_currency} {total_revenue:.2f}). A cancellation or payment freeze poses severe liquidity risk.",
                    "metrics": {
                        "client_id": cid,
                        "client_name": cname,
                        "client_revenue": float(round(camt, 2)),
                        "total_revenue": float(round(total_revenue, 2)),
                        "concentration_percentage": round(share * 100, 1),
                    },
                    "recommended_action": "Diversify active client pipeline and require milestone advance deposits from this client.",
                })
            elif share >= 0.45:
                anomalies.append({
                    "code": "ELEVATED_REVENUE_CONCENTRATION",
                    "category": "REVENUE",
                    "severity": "WARNING",
                    "title": f"Elevated Client Concentration: {cname} ({share*100:.1f}%)",
                    "description": f"{cname} represents {share*100:.1f}% of your verified collections. Consider balancing revenue across multiple accounts.",
                    "metrics": {
                        "client_id": cid,
                        "client_name": cname,
                        "client_revenue": float(round(camt, 2)),
                        "total_revenue": float(round(total_revenue, 2)),
                        "concentration_percentage": round(share * 100, 1),
                    },
                    "recommended_action": "Target acquisition of complementary clients to reduce single-source dependency.",
                })
    else:
        insufficient_baseline_notes.append(
            "Client concentration evaluation requires at least 3 completed payments across 2 or more clients."
        )

    # 2. Revenue Velocity Shift (30-day window comparison)
    date_30_days_ago = today - timedelta(days=30)
    date_60_days_ago = today - timedelta(days=60)

    recent_30d_rev = Decimal("0.0")
    prior_30d_rev = Decimal("0.0")
    has_historical_payments = False

    for p in payments:
        p_date = parse_date_safe(p.payment_date) or parse_date_safe(p.created_at)
        if not p_date:
            continue
        rate = get_conversion_rate(p.currency, default_currency, db)
        amt = Decimal(str(p.amount)) * Decimal(str(rate))

        if p_date < date_30_days_ago:
            has_historical_payments = True

        if date_30_days_ago <= p_date <= today:
            recent_30d_rev += amt
        elif date_60_days_ago <= p_date < date_30_days_ago:
            prior_30d_rev += amt

    if has_historical_payments and prior_30d_rev >= Decimal("300.00"):
        change_pct = float(((recent_30d_rev - prior_30d_rev) / prior_30d_rev) * 100)
        if change_pct <= -40.0:
            severity = "CRITICAL" if change_pct <= -65.0 else "WARNING"
            anomalies.append({
                "code": "REVENUE_VELOCITY_DROP",
                "category": "REVENUE",
                "severity": severity,
                "title": f"Revenue Velocity Deceleration ({change_pct:.1f}%)",
                "description": f"Verified collections over the last 30 days ({default_currency} {recent_30d_rev:.2f}) dropped by {abs(change_pct):.1f}% compared to the prior 30-day period ({default_currency} {prior_30d_rev:.2f}).",
                "metrics": {
                    "recent_30d_revenue": float(round(recent_30d_rev, 2)),
                    "prior_30d_revenue": float(round(prior_30d_rev, 2)),
                    "change_percentage": round(change_pct, 1),
                },
                "recommended_action": "Review outstanding drafts and follow up on pending client proposals.",
            })
    else:
        insufficient_baseline_notes.append(
            "Revenue velocity comparison requires at least 45-60 days of recorded payment history with > $300 in baseline volume."
        )

    # 3. Overdue Receivables & Severe Aging Invoices
    unpaid_invoices = db.query(Invoice).filter(
        Invoice.user_id == user_id,
        Invoice.status.in_(["APPROVED", "SENT", "OVERDUE"]),
    ).all()

    overdue_invoices: List[Dict[str, Any]] = []
    severe_overdue_invoices: List[Dict[str, Any]] = []
    overdue_total = Decimal("0.0")

    for inv in unpaid_invoices:
        due_d = parse_date_safe(inv.due_date)
        if due_d and due_d < today:
            days_late = (today - due_d).days
            rate = get_conversion_rate(inv.currency, default_currency, db)
            amt = Decimal(str(inv.total_amount)) * Decimal(str(rate))
            overdue_total += amt

            item = {
                "invoice_number": inv.invoice_number,
                "client_id": inv.client_id,
                "client_name": client_name_map.get(inv.client_id, "Client"),
                "due_date": due_d.isoformat(),
                "days_overdue": days_late,
                "amount": float(round(amt, 2)),
                "currency": inv.currency,
            }
            overdue_invoices.append(item)
            if days_late > 30:
                severe_overdue_invoices.append(item)

    if severe_overdue_invoices:
        anomalies.append({
            "code": "SEVERE_AGING_RECEIVABLES",
            "category": "COLLECTIONS",
            "severity": "CRITICAL",
            "title": f"Critical: {len(severe_overdue_invoices)} Invoices Overdue > 30 Days",
            "description": f"You have {len(severe_overdue_invoices)} invoices exceeding 30 days past due. Receivables older than 30 days exhibit sharply declining collection probability.",
            "metrics": {
                "severe_overdue_count": len(severe_overdue_invoices),
                "invoices": severe_overdue_invoices,
                "total_overdue_amount": float(round(overdue_total, 2)),
            },
            "recommended_action": "Issue formal overdue notices or contact clients directly with instant PayPal payment links.",
        })
    elif overdue_invoices:
        anomalies.append({
            "code": "OVERDUE_INVOICES_DETECTED",
            "category": "COLLECTIONS",
            "severity": "WARNING",
            "title": f"{len(overdue_invoices)} Overdue Invoices Awaiting Settlement",
            "description": f"{len(overdue_invoices)} invoice(s) are past their due date totaling {default_currency} {overdue_total:.2f}.",
            "metrics": {
                "overdue_count": len(overdue_invoices),
                "invoices": overdue_invoices,
                "total_overdue_amount": float(round(overdue_total, 2)),
            },
            "recommended_action": "Trigger scheduled reminder workflows with one-click PayPal checkout links.",
        })

    # 4. Delayed Payment Captures / Unsettled PayPal Checkouts
    stale_paypal_orders = db.query(Invoice).filter(
        Invoice.user_id == user_id,
        Invoice.paypal_order_id.isnot(None),
        Invoice.status.in_(["SENT", "APPROVED", "OVERDUE"]),
        Invoice.created_at < (datetime.now(timezone.utc) - timedelta(hours=48)),
    ).all()

    if stale_paypal_orders:
        anomalies.append({
            "code": "UNSETTLED_PAYPAL_CHECKOUTS",
            "category": "PAYMENT_PROCESSING",
            "severity": "WARNING",
            "title": f"{len(stale_paypal_orders)} Uncompleted PayPal Checkout Sessions",
            "description": f"{len(stale_paypal_orders)} invoice(s) have PayPal Order IDs created more than 48 hours ago without final capture confirmation. Buyers may have abandoned checkout or webhooks encountered network timeouts.",
            "metrics": {
                "stale_order_count": len(stale_paypal_orders),
                "invoice_numbers": [inv.invoice_number for inv in stale_paypal_orders],
            },
            "recommended_action": "Verify PayPal dashboard orders or refresh invoice status from the Payments Ledger.",
        })

    # 5. Summary metrics
    critical_count = sum(1 for a in anomalies if a["severity"] == "CRITICAL")
    warning_count = sum(1 for a in anomalies if a["severity"] == "WARNING")
    info_count = sum(1 for a in anomalies if a["severity"] == "INFO")

    return {
        "user_id": user_id,
        "total_anomalies_detected": len(anomalies),
        "critical_count": critical_count,
        "warning_count": warning_count,
        "info_count": info_count,
        "anomalies": anomalies,
        "insufficient_baseline_notes": insufficient_baseline_notes,
    }

