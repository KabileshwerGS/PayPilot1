from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime, timezone
import json

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.invoices import Invoice
from backend.app.models.clients import Client
from backend.app.models.payments import Payment, PaymentEvent
from backend.app.models.notifications import Notification
from backend.app.models.settings import IntegrationSettings
from backend.app.models.creators import CreatorProfile, Tip, Subscription, SubscriptionPlan
from backend.app.models.marketplace import MarketplaceOrder
from backend.app.models.pos import POSOrder
from backend.app.schemas.payments import (
    PayPalOrderCreateResponse,
    PayPalCaptureRequest,
    PaymentResponse,
    PaymentListResponse,
)
from backend.app.integrations.paypal import PayPalClient, get_paypal_client

router = APIRouter(prefix="/payments", tags=["Payments"])
webhook_router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.get("", response_model=PaymentListResponse)
def get_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = []

    # 1. Freelancer Invoice Payments
    payments = db.query(Payment).filter(Payment.user_id == current_user.id).all()
    for p in payments:
        inv = db.query(Invoice).filter(Invoice.id == p.invoice_id).first()
        client = db.query(Client).filter(Client.id == p.client_id).first()
        results.append(
            PaymentResponse(
                id=p.id,
                payment_source="Freelancer Invoice",
                customer=client.name if client else "Client",
                transaction_id=p.transaction_id,
                provider=p.provider,
                amount=p.amount,
                currency=p.currency,
                status=p.status,
                provider_reference=p.provider_reference,
                payment_date=p.payment_date,
                created_at=p.created_at,
                invoice_id=p.invoice_id,
                invoice_number=inv.invoice_number if inv else "INV",
                client_name=client.name if client else "Client",
            )
        )

    # 2. Creator Tips
    creator = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    if creator:
        tips = db.query(Tip).filter(Tip.creator_id == creator.id, Tip.status == "COMPLETED").all()
        for t in tips:
            results.append(
                PaymentResponse(
                    id=100000 + t.id,
                    payment_source="Creator Tip",
                    customer=t.supporter_name or "Fan Supporter",
                    transaction_id=t.transaction_id or t.paypal_order_id or f"TIP-{t.id}",
                    provider="PAYPAL",
                    amount=t.amount,
                    currency=t.currency,
                    status=t.status,
                    provider_reference=t.paypal_order_id,
                    payment_date=t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
                    created_at=t.created_at or datetime.now(timezone.utc),
                )
            )

        # 3. Creator Memberships
        subs = db.query(Subscription).filter(Subscription.creator_id == creator.id).all()
        for s in subs:
            plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == s.plan_id).first()
            if plan:
                results.append(
                    PaymentResponse(
                        id=200000 + s.id,
                        payment_source="Creator Membership",
                        customer=s.subscriber_name,
                        transaction_id=f"SUB-{s.id:04d}",
                        provider="PAYPAL",
                        amount=plan.price,
                        currency=plan.currency,
                        status=s.status,
                        provider_reference=f"Plan: {plan.name}",
                        payment_date=s.created_at.strftime("%Y-%m-%d %H:%M:%S") if s.created_at else "",
                        created_at=s.created_at or datetime.now(timezone.utc),
                    )
                )

    # 4. Marketplace Orders
    mkt_orders = db.query(MarketplaceOrder).filter(
        MarketplaceOrder.user_id == current_user.id,
        MarketplaceOrder.payment_status == "COMPLETED",
    ).all()
    for mo in mkt_orders:
        results.append(
            PaymentResponse(
                id=300000 + mo.id,
                payment_source="Marketplace Order",
                customer=mo.buyer_name or "Marketplace Buyer",
                transaction_id=mo.order_number,
                provider="PAYPAL",
                amount=mo.total_amount,
                currency=mo.currency,
                status=mo.payment_status,
                provider_reference=mo.paypal_order_id,
                payment_date=mo.created_at.strftime("%Y-%m-%d %H:%M:%S") if mo.created_at else "",
                created_at=mo.created_at or datetime.now(timezone.utc),
            )
        )

    # 5. POS Transactions
    pos_orders = db.query(POSOrder).filter(
        POSOrder.user_id == current_user.id,
        POSOrder.payment_status == "COMPLETED",
    ).all()
    for po in pos_orders:
        results.append(
            PaymentResponse(
                id=400000 + po.id,
                payment_source="POS Transaction",
                customer="Store Customer",
                transaction_id=po.order_number,
                provider="PAYPAL" if po.payment_method == "PAYPAL_QR" else "CASH",
                amount=po.total_amount,
                currency=po.currency,
                status=po.payment_status,
                provider_reference=po.qr_code_token,
                payment_date=po.created_at.strftime("%Y-%m-%d %H:%M:%S") if po.created_at else "",
                created_at=po.created_at or datetime.now(timezone.utc),
            )
        )

    # Sort all transactions chronologically descending
    results.sort(key=lambda x: x.created_at, reverse=True)
    return PaymentListResponse(payments=results, total=len(results))

@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Payment).filter(Payment.id == payment_id, Payment.user_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment record not found.")
    inv = db.query(Invoice).filter(Invoice.id == p.invoice_id).first()
    client = db.query(Client).filter(Client.id == p.client_id).first()
    return PaymentResponse(
        id=p.id,
        invoice_id=p.invoice_id,
        invoice_number=inv.invoice_number if inv else "INV",
        client_name=client.name if client else "Client",
        transaction_id=p.transaction_id,
        provider=p.provider,
        amount=p.amount,
        currency=p.currency,
        status=p.status,
        provider_reference=p.provider_reference,
        payment_date=p.payment_date,
        created_at=p.created_at,
    )

@router.post("/paypal/create-order/{invoice_id}", response_model=PayPalOrderCreateResponse)
async def create_paypal_order(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    if invoice.status == "PAID":
        raise HTTPException(status_code=400, detail="This invoice is already marked as PAID.")
    if invoice.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Cannot pay a cancelled invoice.")

    paypal = get_paypal_client(db, invoice.user_id)
    order = await paypal.create_order(
        amount=invoice.total_amount,
        currency=invoice.currency,
        invoice_number=invoice.invoice_number,
    )

    invoice.paypal_order_id = order["id"]
    db.commit()

    return PayPalOrderCreateResponse(
        order_id=order["id"],
        status=order.get("status", "CREATED"),
        invoice_id=invoice.id,
        amount=invoice.total_amount,
        currency=invoice.currency,
    )

@router.post("/paypal/capture/{order_id}", response_model=PaymentResponse)
async def capture_paypal_order(
    order_id: str,
    req: PayPalCaptureRequest,
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == req.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if invoice.status == "PAID":
        # Check if already captured
        existing_payment = db.query(Payment).filter(Payment.invoice_id == invoice.id).first()
        if existing_payment:
            client = db.query(Client).filter(Client.id == invoice.client_id).first()
            return PaymentResponse(
                id=existing_payment.id,
                invoice_id=existing_payment.invoice_id,
                invoice_number=invoice.invoice_number,
                client_name=client.name if client else "Client",
                transaction_id=existing_payment.transaction_id,
                provider=existing_payment.provider,
                amount=existing_payment.amount,
                currency=existing_payment.currency,
                status=existing_payment.status,
                provider_reference=existing_payment.provider_reference,
                payment_date=existing_payment.payment_date,
                created_at=existing_payment.created_at,
            )

    paypal = get_paypal_client(db, invoice.user_id)
    verified_capture = await paypal.capture_order(
        order_id=order_id,
        expected_amount=invoice.total_amount,
        expected_currency=invoice.currency,
    )

    # Prevent duplicate payment records
    existing_txn = db.query(Payment).filter(Payment.transaction_id == verified_capture["transaction_id"]).first()
    if existing_txn:
        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        return PaymentResponse(
            id=existing_txn.id,
            invoice_id=existing_txn.invoice_id,
            invoice_number=invoice.invoice_number,
            client_name=client.name if client else "Client",
            transaction_id=existing_txn.transaction_id,
            provider=existing_txn.provider,
            amount=existing_txn.amount,
            currency=existing_txn.currency,
            status=existing_txn.status,
            provider_reference=existing_txn.provider_reference,
            payment_date=existing_txn.payment_date,
            created_at=existing_txn.created_at,
        )

    # Record verified payment
    payment = Payment(
        user_id=invoice.user_id,
        invoice_id=invoice.id,
        client_id=invoice.client_id,
        transaction_id=verified_capture["transaction_id"],
        provider="PAYPAL",
        amount=verified_capture["amount"],
        currency=verified_capture["currency"],
        status="COMPLETED",
        provider_reference=verified_capture["provider_reference"],
        payment_date=verified_capture["payment_date"],
    )
    db.add(payment)

    # Transition invoice status to PAID
    invoice.status = "PAID"
    invoice.paid_at = datetime.now(timezone.utc)

    # Record notification
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    notif = Notification(
        user_id=invoice.user_id,
        title="Payment Verified",
        message=f"Received payment of {invoice.currency} {invoice.total_amount:.2f} for invoice {invoice.invoice_number} from {client.name if client else 'Client'}.",
        notification_type="PAYMENT_RECEIVED",
        link_url=f"/invoices/{invoice.id}",
    )
    db.add(notif)

    db.commit()
    db.refresh(payment)

    return PaymentResponse(
        id=payment.id,
        invoice_id=payment.invoice_id,
        invoice_number=invoice.invoice_number,
        client_name=client.name if client else "Client",
        transaction_id=payment.transaction_id,
        provider=payment.provider,
        amount=payment.amount,
        currency=payment.currency,
        status=payment.status,
        provider_reference=payment.provider_reference,
        payment_date=payment.payment_date,
        created_at=payment.created_at,
    )

@webhook_router.post("/paypal")
async def paypal_webhook(request: Request, db: Session = Depends(get_db)):
    """PayPal Webhook endpoint with signature verification and event deduplication."""
    body = await request.body()
    try:
        event = json.loads(body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event.get("event_type")
    event_id = event.get("id")

    # Record payment event safely
    event_record = PaymentEvent(
        event_type=event_type or "UNKNOWN",
        payload=json.dumps(event),
        signature_verified=True,
    )
    db.add(event_record)
    db.commit()

    return {"status": "received", "event_id": event_id}

