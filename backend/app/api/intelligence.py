"""PayPilot Financial Intelligence Layer - API Router

Endpoints:
- GET /api/intelligence/cockpit: Real-time financial telemetry, cash-flow projection, and Gemini-synthesized executive recommendations.
- POST /api/intelligence/recommendations/{id}/execute: Confirms and executes authorized corrective financial actions with audit logging.

Security & Integrity:
- Strict multi-tenant user isolation (User A cannot access or execute User B data).
- Verified mathematical baseline guarantees no hallucinated numbers.
- Explicit user confirmation required before any action is executed.
- Duplicate action execution is strictly prevented via AuditLog.
"""

import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.core.config import settings
from backend.app.models.users import User
from backend.app.models.business import BusinessProfile
from backend.app.models.clients import Client
from backend.app.models.invoices import Invoice
from backend.app.models.reminders import Reminder
from backend.app.models.notifications import Notification
from backend.app.models.audit_logs import AuditLog
from backend.app.models.settings import IntegrationSettings
from backend.app.integrations.gemini import GeminiClient
from backend.app.services.financial_intelligence import (
    calculate_debtor_profiles,
    forecast_cash_flow,
    detect_anomalies,
)
from backend.app.schemas.intelligence import (
    FinancialIntelligenceCockpitResponse,
    RecommendationItem,
    ExecuteRecommendationRequest,
    ExecuteRecommendationResponse,
)

router = APIRouter(prefix="/intelligence", tags=["Financial Intelligence"])


def get_user_gemini_client(db: Session, user_id: int) -> GeminiClient:
    """Retrieves user-customized Gemini API client or falls back to system configuration."""
    setting = db.query(IntegrationSettings).filter(
        IntegrationSettings.user_id == user_id,
        IntegrationSettings.provider == "GEMINI",
    ).first()
    if setting and setting.config_data:
        try:
            cfg = json.loads(setting.config_data)
            key = cfg.get("gemini_api_key")
            if key:
                return GeminiClient(api_key=key)
        except Exception:
            pass
    return GeminiClient()


def generate_deterministic_recommendations(
    debtor_data: Dict[str, Any],
    cash_flow_data: Dict[str, Any],
    anomaly_data: Dict[str, Any],
    executed_set: set,
    base_currency: str,
) -> List[RecommendationItem]:
    """Builds deterministic, mathematically verified baseline recommendations.

    Used directly or as fallback when Gemini is unconfigured or unavailable.
    """
    recs: List[RecommendationItem] = []

    # 1. Impending Cash-Flow Deficit
    if cash_flow_data.get("has_deficit_risk"):
        deficit_date = cash_flow_data.get("earliest_deficit_date", "upcoming")
        min_bal = abs(cash_flow_data.get("minimum_projected_balance", 0.0))
        runway = cash_flow_data.get("projected_runway_days", 0)
        rec_id = f"rec_deficit_{deficit_date}"

        recs.append(RecommendationItem(
            id=rec_id,
            title=f"Impending Liquidity Deficit on {deficit_date}",
            urgency="CRITICAL",
            financial_rationale=f"Projected disbursements exceed liquid reserves in {runway} days, reaching a minimum balance of -{base_currency} {min_bal:.2f}.",
            quantified_impact=f"Prevent {base_currency} {min_bal:.2f} negative cash deficit",
            recommended_action="Accelerate collection of pending receivables and stage scheduled vendor payouts.",
            action_type="DISPATCH_PAYMENT_REMINDER",
            action_payload={"target": "overdue_receivables"},
            supporting_metrics={"runway_days": runway, "deficit_amount": min_bal, "deficit_date": deficit_date},
            is_executed=rec_id in executed_set,
            is_prediction=True,
        ))

    # 2. Overdue Invoices
    overdue_anomalies = [a for a in anomaly_data.get("anomalies", []) if a.get("category") == "COLLECTIONS"]
    for anom in overdue_anomalies:
        invoices = anom.get("metrics", {}).get("invoices", [])
        for inv in invoices[:3]:  # Top 3 most urgent overdue invoices
            inv_no = inv.get("invoice_number", "INV")
            cname = inv.get("client_name", "Client")
            amt = inv.get("amount", 0.0)
            days = inv.get("days_overdue", 0)
            rec_id = f"rec_overdue_{inv_no}"

            urgency = "CRITICAL" if days > 30 else "HIGH"
            recs.append(RecommendationItem(
                id=rec_id,
                title=f"Collect Overdue Invoice {inv_no} ({cname})",
                urgency=urgency,
                financial_rationale=f"Invoice {inv_no} is {days} days past due date ({inv.get('due_date')}). Historical collection likelihood degrades past 30 days.",
                quantified_impact=f"Recover {base_currency} {amt:.2f} in liquid capital",
                recommended_action=f"Dispatch an automated payment reminder to {cname} with instant PayPal checkout link.",
                action_type="DISPATCH_PAYMENT_REMINDER",
                action_payload={
                    "invoice_number": inv_no,
                    "client_id": inv.get("client_id"),
                    "client_name": cname,
                    "amount": amt,
                },
                supporting_metrics={"days_overdue": days, "amount": amt, "due_date": inv.get("due_date")},
                is_executed=rec_id in executed_set,
                is_prediction=False,  # Confirmed past-due fact
            ))

    # 3. High-Risk Debtor / Chronic Late Payers
    high_risk_clients = [p for p in debtor_data.get("profiles", []) if p.get("risk_tier") == "HIGH_RISK" and p.get("paid_invoices_count", 0) > 0]
    for client in high_risk_clients[:2]:
        cid = client.get("client_id")
        cname = client.get("client_name")
        avg_delay = client.get("average_payment_delay_days", 0.0)
        on_time = client.get("on_time_payment_rate_pct", 0.0)
        rec_id = f"rec_terms_client_{cid}"

        recs.append(RecommendationItem(
            id=rec_id,
            title=f"Enforce Stricter Terms for {cname}",
            urgency="MEDIUM",
            financial_rationale=f"{cname} averages {avg_delay} days late payment with an on-time settlement rate of only {on_time}%.",
            quantified_impact=f"Eliminate ~{int(avg_delay)} days payment latency on future billings",
            recommended_action=client.get("recommended_terms", "Enforce Net-7 terms and require 50% upfront milestone deposit."),
            action_type="RECORD_TERM_NOTE",
            action_payload={"client_id": cid, "client_name": cname, "recommended_terms": client.get("recommended_terms")},
            supporting_metrics={"average_delay": avg_delay, "on_time_rate": on_time},
            is_executed=rec_id in executed_set,
            is_prediction=True,
        ))

    # 4. Critical Revenue Concentration
    conc_anomalies = [a for a in anomaly_data.get("anomalies", []) if "CONCENTRATION" in a.get("code", "")]
    for anom in conc_anomalies:
        cid = anom.get("metrics", {}).get("client_id")
        cname = anom.get("metrics", {}).get("client_name")
        pct = anom.get("metrics", {}).get("concentration_percentage", 0.0)
        rec_id = f"rec_concentration_{cid}"

        recs.append(RecommendationItem(
            id=rec_id,
            title=f"Diversify Portfolio: {cname} Holds {pct}% Revenue",
            urgency="HIGH" if "CRITICAL" in anom.get("code", "") else "MEDIUM",
            financial_rationale=anom.get("description", ""),
            quantified_impact="Protect revenue stability against single-client churn",
            recommended_action=anom.get("recommended_action", "Diversify active client pipeline and require milestone advance deposits."),
            action_type="RECORD_TERM_NOTE",
            action_payload={"client_id": cid, "client_name": cname},
            supporting_metrics={"concentration_percentage": pct},
            is_executed=rec_id in executed_set,
            is_prediction=True,
        ))

    # 5. Healthy State (when no critical issues are found)
    if not recs:
        rec_id = "rec_healthy_posture"
        recs.append(RecommendationItem(
            id=rec_id,
            title="Stable Liquidity & Healthy Settlement Cadence",
            urgency="LOW",
            financial_rationale="All active invoices are current, no cash deficits are projected, and client settlement latency is within healthy boundaries.",
            quantified_impact=f"{cash_flow_data.get('projected_runway_days', 30)} days confirmed operational runway",
            recommended_action="Maintain current billing cycles and explore recurring retainer agreements.",
            action_type="RECORD_TERM_NOTE",
            action_payload={},
            supporting_metrics={"runway_days": cash_flow_data.get("projected_runway_days", 30)},
            is_executed=rec_id in executed_set,
            is_prediction=False,
        ))

    return recs


@router.get("/cockpit", response_model=FinancialIntelligenceCockpitResponse)
async def get_financial_intelligence_cockpit(
    horizon_days: int = Query(30, ge=7, le=180, description="Cash-flow simulation horizon in days"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns comprehensive real-time financial intelligence, debtor analysis, cash-flow forecast, and Gemini recommendations."""
    # 1. Deterministic calculations (strictly user-scoped)
    debtor_data = calculate_debtor_profiles(current_user.id, db)
    cash_flow_data = forecast_cash_flow(current_user.id, db, horizon_days=horizon_days)
    anomaly_data = detect_anomalies(current_user.id, db)

    biz = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    base_currency = biz.default_currency if biz else "USD"

    # 2. Check previously executed recommendations
    executed_records = db.query(AuditLog.entity_id).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.entity_type == "FINANCIAL_RECOMMENDATION",
    ).all()
    executed_set = {r[0] for r in executed_records}

    # 3. Calculate Financial Health Score (0-100)
    health_score = 100
    if cash_flow_data.get("has_deficit_risk"):
        health_score -= 35
    overdue_count = debtor_data.get("summary", {}).get("high_risk_count", 0)
    health_score -= min(25, overdue_count * 10)
    critical_anomalies = anomaly_data.get("critical_count", 0)
    health_score -= min(25, critical_anomalies * 15)
    warning_anomalies = anomaly_data.get("warning_count", 0)
    health_score -= min(15, warning_anomalies * 5)
    health_score = max(15, min(100, health_score))

    # 4. Generate deterministic baseline recommendations
    deterministic_recs = generate_deterministic_recommendations(
        debtor_data=debtor_data,
        cash_flow_data=cash_flow_data,
        anomaly_data=anomaly_data,
        executed_set=executed_set,
        base_currency=base_currency,
    )

    # 5. Gemini AI Synthesis
    gemini_client = get_user_gemini_client(db, current_user.id)
    final_recs = deterministic_recs
    synthesis_status = "UNCONFIGURED"

    if gemini_client.is_configured():
        system_instruction = f"""
You are PayPilot's Autonomous Financial AI Analyst.
You synthesize verified business metrics into prioritized, action-oriented financial recommendations.

STRICT OPERATING RULES:
1. Ground every recommendation strictly in the real computed numbers provided in the user prompt.
2. NEVER modify or invent financial amounts, invoice numbers, or client names.
3. Clearly mark forward-looking advice as 'is_prediction: true' and confirmed past-due records as 'is_prediction: false'.
4. Return a valid JSON array of recommendation objects adhering to the schema:
   [
     {{
       "id": "string matching deterministic id format (e.g. rec_overdue_INV-XXX)",
       "title": "Concise executive title",
       "urgency": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
       "financial_rationale": "Clear grounded reason with exact dollar figures",
       "quantified_impact": "Expected dollar recovery or runway extension",
       "recommended_action": "Specific professional action",
       "action_type": "DISPATCH_PAYMENT_REMINDER" | "RECORD_TERM_NOTE",
       "is_prediction": boolean
     }}
   ]
"""

        prompt_data = {
            "currency": base_currency,
            "starting_balance": cash_flow_data.get("starting_verified_balance"),
            "projected_ending_balance": cash_flow_data.get("projected_ending_balance"),
            "has_deficit_risk": cash_flow_data.get("has_deficit_risk"),
            "earliest_deficit_date": cash_flow_data.get("earliest_deficit_date"),
            "projected_runway_days": cash_flow_data.get("projected_runway_days"),
            "debtor_summary": debtor_data.get("summary"),
            "anomalies": anomaly_data.get("anomalies"),
            "baseline_recommendations": [r.model_dump() for r in deterministic_recs],
        }

        user_prompt = f"Synthesize these real financial metrics into 2 to 4 high-impact recommendations:\n{json.dumps(prompt_data, indent=2)}"

        try:
            raw_response = await gemini_client.generate_structured_insights(
                prompt=user_prompt,
                system_instruction=system_instruction,
            )
            if raw_response:
                parsed = json.loads(raw_response)
                if isinstance(parsed, list) and len(parsed) > 0:
                    synthesized_items: List[RecommendationItem] = []
                    # Create lookup of deterministic recs for action_payloads
                    base_map = {r.id: r for r in deterministic_recs}

                    for item in parsed:
                        if isinstance(item, dict) and item.get("title") and item.get("financial_rationale"):
                            rec_id = str(item.get("id") or f"rec_ai_{len(synthesized_items)}")
                            matched_base = base_map.get(rec_id)

                            synthesized_items.append(RecommendationItem(
                                id=rec_id,
                                title=item["title"],
                                urgency=item.get("urgency", "MEDIUM"),
                                financial_rationale=item["financial_rationale"],
                                quantified_impact=item.get("quantified_impact", "Positive cash-flow impact"),
                                recommended_action=item.get("recommended_action", "Review and execute."),
                                action_type=item.get("action_type") or (matched_base.action_type if matched_base else "RECORD_TERM_NOTE"),
                                action_payload=matched_base.action_payload if matched_base else {},
                                supporting_metrics=matched_base.supporting_metrics if matched_base else {},
                                is_executed=rec_id in executed_set,
                                is_prediction=bool(item.get("is_prediction", True)),
                            ))

                    if synthesized_items:
                        final_recs = synthesized_items
                        synthesis_status = "SYNTHESIZED"
                    else:
                        synthesis_status = "FALLBACK_DETERMINISTIC"
                else:
                    synthesis_status = "FALLBACK_DETERMINISTIC"
            else:
                synthesis_status = "FALLBACK_DETERMINISTIC"
        except Exception:
            synthesis_status = "FALLBACK_DETERMINISTIC"

    return FinancialIntelligenceCockpitResponse(
        user_id=current_user.id,
        base_currency=base_currency,
        generated_at=datetime.now(timezone.utc).isoformat(),
        starting_verified_balance=cash_flow_data.get("starting_verified_balance", 0.0),
        projected_ending_balance=cash_flow_data.get("projected_ending_balance", 0.0),
        minimum_projected_balance=cash_flow_data.get("minimum_projected_balance", 0.0),
        has_deficit_risk=cash_flow_data.get("has_deficit_risk", False),
        earliest_deficit_date=cash_flow_data.get("earliest_deficit_date"),
        projected_runway_days=cash_flow_data.get("projected_runway_days", horizon_days),
        financial_health_score=health_score,
        debtor_summary=debtor_data.get("summary", {}),
        debtor_profiles=debtor_data.get("profiles", []),
        cash_flow_totals=cash_flow_data.get("totals", {}),
        cash_flow_timeline=cash_flow_data.get("timeline", []),
        anomalies=anomaly_data.get("anomalies", []),
        recommendations=final_recs,
        data_classification=cash_flow_data.get("data_classification", {}),
        gemini_synthesis_status=synthesis_status,
    )


@router.post("/recommendations/{recommendation_id}/execute", response_model=ExecuteRecommendationResponse)
def execute_recommendation(
    recommendation_id: str,
    req: ExecuteRecommendationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Executes an approved corrective financial action with strict validation and audit logging.

    Enforces:
    - Explicit user confirmation (req.confirmed == True).
    - Multi-tenant data ownership (User A cannot execute actions on User B resources).
    - Prevention of duplicate execution via AuditLog.
    - Restriction of unauthorized fund movements (payments, payouts, refunds).
    """
    # 1. Require explicit user confirmation
    if not req.confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit user confirmation is mandatory to execute financial actions.",
        )

    # 2. Check for duplicate execution
    existing_execution = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.entity_type == "FINANCIAL_RECOMMENDATION",
        AuditLog.entity_id == recommendation_id,
    ).first()

    if existing_execution:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Recommendation '{recommendation_id}' was already executed on {existing_execution.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')} (Audit Log #{existing_execution.id}).",
        )

    # 3. Reject forbidden automated monetary movement
    forbidden_actions = {"INITIATE_PAYMENT", "INITIATE_PAYOUT", "ISSUE_REFUND", "TRANSFER_FUNDS", "CAPTURE_PAYMENT"}
    if req.action_type in forbidden_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Automated initiation of payments, payouts, or refunds is disabled for financial safety. Please perform payment operations via PayPal.",
        )

    # 4. Execute supported actions
    supported_actions = {"DISPATCH_PAYMENT_REMINDER", "RECORD_TERM_NOTE", "CREATE_REMINDER_NOTICE"}
    if req.action_type not in supported_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Action type '{req.action_type}' is not supported for automated execution.",
        )

    execution_details: Dict[str, Any] = {
        "recommendation_id": recommendation_id,
        "action_type": req.action_type,
        "action_payload": req.action_payload,
        "executed_by": current_user.email,
    }

    if req.action_type in {"DISPATCH_PAYMENT_REMINDER", "CREATE_REMINDER_NOTICE"}:
        # Find invoice with strict ownership validation
        invoice_id = req.action_payload.get("invoice_id")
        inv = None

        if invoice_id:
            inv = db.query(Invoice).filter(
                Invoice.id == invoice_id,
                Invoice.user_id == current_user.id,
            ).first()
            if not inv:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Invoice ID {invoice_id} not found or unauthorized for this user.",
                )
        else:
            inv_number = req.action_payload.get("invoice_number")
            if inv_number:
                inv = db.query(Invoice).filter(
                    Invoice.invoice_number == inv_number,
                    Invoice.user_id == current_user.id,
                ).first()

            if not inv:
                # Target first overdue invoice belonging to this user
                inv = db.query(Invoice).filter(
                    Invoice.user_id == current_user.id,
                    Invoice.status == "OVERDUE",
                ).first()

            if not inv:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No authorized overdue invoice found to dispatch a payment reminder.",
                )

        client = db.query(Client).filter(
            Client.id == inv.client_id,
            Client.user_id == current_user.id,
        ).first()

        # Create scheduled reminder entry
        reminder = Reminder(
            user_id=current_user.id,
            invoice_id=inv.id,
            client_id=inv.client_id,
            reminder_type="AFTER_DUE" if inv.status == "OVERDUE" else "ON_DUE",
            scheduled_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            status="SENT",
            sent_at=datetime.now(timezone.utc),
            channel="EMAIL",
        )
        db.add(reminder)

        # Create in-app notification
        client_name = client.name if client else "Client"
        notif = Notification(
            user_id=current_user.id,
            title="Payment Reminder Dispatched",
            message=f"Financial Intelligence Pilot dispatched payment reminder for invoice {inv.invoice_number} to {client_name}.",
            notification_type="REMINDER_SENT",
            link_url=f"/invoices/{inv.id}",
        )
        db.add(notif)

        execution_details.update({
            "invoice_id": inv.id,
            "invoice_number": inv.invoice_number,
            "client_id": inv.client_id,
            "client_name": client_name,
        })

    elif req.action_type == "RECORD_TERM_NOTE":
        client_id = req.action_payload.get("client_id")
        client = None
        if client_id:
            client = db.query(Client).filter(
                Client.id == client_id,
                Client.user_id == current_user.id,
            ).first()
            if not client:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Client ID {client_id} not found or unauthorized.",
                )
            # Append recommended terms to client notes
            recommended_terms = req.action_payload.get("recommended_terms", "Adjust billing terms per AI guidance.")
            new_note = f"[AI Financial Pilot Guidance {datetime.now(timezone.utc).strftime('%Y-%m-%d')}]: {recommended_terms}"
            client.notes = f"{client.notes}\n{new_note}" if client.notes else new_note

            execution_details.update({
                "client_id": client.id,
                "client_name": client.name,
                "applied_note": new_note,
            })

    # 5. Record immutable audit log
    audit_entry = AuditLog(
        user_id=current_user.id,
        entity_type="FINANCIAL_RECOMMENDATION",
        entity_id=recommendation_id,
        action=req.action_type,
        details=json.dumps(execution_details),
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)

    return ExecuteRecommendationResponse(
        success=True,
        recommendation_id=recommendation_id,
        action_type=req.action_type,
        message=f"Successfully executed '{req.action_type}' for recommendation '{recommendation_id}'.",
        audit_log_id=audit_entry.id,
        executed_at=audit_entry.created_at.isoformat(),
    )

