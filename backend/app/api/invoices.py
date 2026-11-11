from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
from datetime import datetime, timezone

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.business import BusinessProfile
from backend.app.models.clients import Client
from backend.app.models.invoices import Invoice, InvoiceItem
from backend.app.models.notifications import Notification
from backend.app.schemas.invoices import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceListResponse,
    PublicInvoiceResponse,
)
from backend.app.services.pdf_service import generate_invoice_pdf

router = APIRouter(prefix="/invoices", tags=["Invoices"])
public_router = APIRouter(prefix="/public/invoices", tags=["Public Invoices"])

def generate_invoice_number(db: Session, user_id: int) -> str:
    count = db.query(Invoice).filter(Invoice.user_id == user_id).count()
    year = datetime.now().year
    return f"INV-{year}-{(count + 1):04d}"

@router.get("", response_model=InvoiceListResponse)
def get_invoices(
    status: Optional[str] = None,
    limit: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Invoice).filter(Invoice.user_id == current_user.id)
    if status and status.upper() != "ALL":
        query = query.filter(Invoice.status == status.upper())

    query = query.order_by(Invoice.created_at.desc())
    if limit:
        query = query.limit(limit)

    invoices = query.all()
    response_list = []
    for inv in invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        inv_dict = {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client_id": inv.client_id,
            "client_name": client.name if client else "Unknown Client",
            "client_email": client.email if client else "",
            "client_company": client.company if client else "",
            "client_address": client.billing_address if client else "",
            "issue_date": inv.issue_date,
            "due_date": inv.due_date,
            "currency": inv.currency,
            "subtotal": inv.subtotal,
            "tax_rate": inv.tax_rate,
            "tax_amount": inv.tax_amount,
            "discount_amount": inv.discount_amount,
            "total_amount": inv.total_amount,
            "status": inv.status,
            "notes": inv.notes,
            "terms": inv.terms,
            "paypal_order_id": inv.paypal_order_id,
            "paid_at": inv.paid_at,
            "created_at": inv.created_at,
            "items": inv.items,
        }
        response_list.append(InvoiceResponse(**inv_dict))

    return InvoiceListResponse(invoices=response_list, total=len(response_list))

@router.post("", response_model=InvoiceResponse)
def create_invoice(
    invoice_in: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == invoice_in.client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=400, detail="Selected client does not exist.")

    # Calculate line items and totals with Decimal safety
    subtotal = Decimal("0.0")
    for it in invoice_in.items:
        subtotal += it.quantity * it.unit_price

    tax_rate = invoice_in.tax_rate
    tax_amount = (subtotal * tax_rate) / Decimal("100.0")
    discount_amount = invoice_in.discount_amount
    total_amount = max(Decimal("0.0"), subtotal + tax_amount - discount_amount)

    invoice_number = generate_invoice_number(db, current_user.id)
    initial_status = "APPROVED" if invoice_in.approve_immediately else "DRAFT"

    invoice = Invoice(
        user_id=current_user.id,
        client_id=client.id,
        invoice_number=invoice_number,
        issue_date=invoice_in.issue_date,
        due_date=invoice_in.due_date,
        currency=invoice_in.currency,
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        discount_amount=discount_amount,
        total_amount=total_amount,
        status=initial_status,
        notes=invoice_in.notes,
        terms=invoice_in.terms,
    )
    db.add(invoice)
    db.flush()

    for it in invoice_in.items:
        item = InvoiceItem(
            invoice_id=invoice.id,
            description=it.description,
            quantity=it.quantity,
            unit_price=it.unit_price,
            total=it.quantity * it.unit_price,
        )
        db.add(item)

    # Record notification
    notif = Notification(
        user_id=current_user.id,
        title="Invoice Created",
        message=f"Invoice {invoice.invoice_number} created for {client.name} ({invoice.currency} {total_amount:.2f}).",
        notification_type="INVOICE_CREATED",
        link_url=f"/invoices/{invoice.id}",
    )
    db.add(notif)

    db.commit()
    db.refresh(invoice)

    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        client_id=client.id,
        client_name=client.name,
        client_email=client.email,
        client_company=client.company,
        client_address=client.billing_address,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        currency=invoice.currency,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total_amount=invoice.total_amount,
        status=invoice.status,
        notes=invoice.notes,
        terms=invoice.terms,
        paypal_order_id=invoice.paypal_order_id,
        paid_at=invoice.paid_at,
        created_at=invoice.created_at,
        items=invoice.items,
    )

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        client_id=invoice.client_id,
        client_name=client.name if client else "Unknown Client",
        client_email=client.email if client else "",
        client_company=client.company if client else "",
        client_address=client.billing_address if client else "",
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        currency=invoice.currency,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total_amount=invoice.total_amount,
        status=invoice.status,
        notes=invoice.notes,
        terms=invoice.terms,
        paypal_order_id=invoice.paypal_order_id,
        paid_at=invoice.paid_at,
        created_at=invoice.created_at,
        items=invoice.items,
    )

@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    invoice_in: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    if invoice.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only DRAFT invoices can be edited.")

    if invoice_in.currency:
        invoice.currency = invoice_in.currency
    if invoice_in.due_date:
        invoice.due_date = invoice_in.due_date
    if invoice_in.tax_rate is not None:
        invoice.tax_rate = invoice_in.tax_rate
    if invoice_in.discount_amount is not None:
        invoice.discount_amount = invoice_in.discount_amount
    if invoice_in.notes is not None:
        invoice.notes = invoice_in.notes
    if invoice_in.terms is not None:
        invoice.terms = invoice_in.terms

    if invoice_in.items is not None:
        # Remove old items
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).delete()
        subtotal = Decimal("0.0")
        for it in invoice_in.items:
            item_total = it.quantity * it.unit_price
            subtotal += item_total
            item = InvoiceItem(
                invoice_id=invoice.id,
                description=it.description,
                quantity=it.quantity,
                unit_price=it.unit_price,
                total=item_total,
            )
            db.add(item)

        invoice.subtotal = subtotal
        invoice.tax_amount = (subtotal * invoice.tax_rate) / Decimal("100.0")
        invoice.total_amount = max(Decimal("0.0"), subtotal + invoice.tax_amount - invoice.discount_amount)

    db.commit()
    db.refresh(invoice)

    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        client_id=invoice.client_id,
        client_name=client.name if client else "",
        client_email=client.email if client else "",
        client_company=client.company if client else "",
        client_address=client.billing_address if client else "",
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        currency=invoice.currency,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total_amount=invoice.total_amount,
        status=invoice.status,
        notes=invoice.notes,
        terms=invoice.terms,
        paypal_order_id=invoice.paypal_order_id,
        paid_at=invoice.paid_at,
        created_at=invoice.created_at,
        items=invoice.items,
    )

@router.post("/{invoice_id}/approve", response_model=InvoiceResponse)
def approve_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    if invoice.status != "DRAFT":
        raise HTTPException(status_code=400, detail=f"Cannot approve invoice in '{invoice.status}' status.")

    invoice.status = "APPROVED"
    db.commit()
    db.refresh(invoice)
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        client_id=invoice.client_id,
        client_name=client.name if client else "",
        client_email=client.email if client else "",
        client_company=client.company if client else "",
        client_address=client.billing_address if client else "",
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        currency=invoice.currency,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total_amount=invoice.total_amount,
        status=invoice.status,
        notes=invoice.notes,
        terms=invoice.terms,
        paypal_order_id=invoice.paypal_order_id,
        paid_at=invoice.paid_at,
        created_at=invoice.created_at,
        items=invoice.items,
    )

@router.post("/{invoice_id}/send", response_model=InvoiceResponse)
def send_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    if invoice.status in ["PAID", "CANCELLED"]:
        raise HTTPException(status_code=400, detail=f"Cannot send invoice in '{invoice.status}' status.")

    invoice.status = "SENT"
    client = db.query(Client).filter(Client.id == invoice.client_id).first()

    # Record notification
    notif = Notification(
        user_id=current_user.id,
        title="Invoice Dispatched",
        message=f"Invoice {invoice.invoice_number} sent to {client.name if client else 'Client'}.",
        notification_type="INVOICE_SENT",
        link_url=f"/invoices/{invoice.id}",
    )
    db.add(notif)

    db.commit()
    db.refresh(invoice)

    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        client_id=invoice.client_id,
        client_name=client.name if client else "",
        client_email=client.email if client else "",
        client_company=client.company if client else "",
        client_address=client.billing_address if client else "",
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        currency=invoice.currency,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total_amount=invoice.total_amount,
        status=invoice.status,
        notes=invoice.notes,
        terms=invoice.terms,
        paypal_order_id=invoice.paypal_order_id,
        paid_at=invoice.paid_at,
        created_at=invoice.created_at,
        items=invoice.items,
    )

@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse)
def cancel_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    if invoice.status == "PAID":
        raise HTTPException(status_code=400, detail="Cannot cancel an invoice that is already marked as PAID.")

    invoice.status = "CANCELLED"
    db.commit()
    db.refresh(invoice)
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        client_id=invoice.client_id,
        client_name=client.name if client else "",
        client_email=client.email if client else "",
        client_company=client.company if client else "",
        client_address=client.billing_address if client else "",
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        currency=invoice.currency,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total_amount=invoice.total_amount,
        status=invoice.status,
        notes=invoice.notes,
        terms=invoice.terms,
        paypal_order_id=invoice.paypal_order_id,
        paid_at=invoice.paid_at,
        created_at=invoice.created_at,
        items=invoice.items,
    )

@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    client = db.query(Client).filter(Client.id == invoice.client_id).first()

    pdf_buffer = generate_invoice_pdf(invoice, business, client)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Invoice-{invoice.invoice_number}.pdf"},
    )

# Public endpoint for client checkout view
@public_router.get("/{invoice_number}", response_model=PublicInvoiceResponse)
def get_public_invoice(
    invoice_number: str,
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == invoice.user_id).first()
    client = db.query(Client).filter(Client.id == invoice.client_id).first()

    return PublicInvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        business_name=business.business_name if business else "PayPilot Business",
        client_name=client.name if client else "Client",
        client_email=client.email if client else "",
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        currency=invoice.currency,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total_amount=invoice.total_amount,
        status=invoice.status,
        notes=invoice.notes,
        terms=invoice.terms,
        paypal_client_id=None,
        items=invoice.items,
    )

@public_router.get("/{invoice_number}/pdf")
def get_public_invoice_pdf(
    invoice_number: str,
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == invoice.user_id).first()
    client = db.query(Client).filter(Client.id == invoice.client_id).first()

    pdf_buffer = generate_invoice_pdf(invoice, business, client)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Invoice-{invoice.invoice_number}.pdf"},
    )


