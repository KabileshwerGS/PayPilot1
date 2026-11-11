from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.clients import Client
from backend.app.models.invoices import Invoice
from backend.app.models.payments import Payment
from backend.app.schemas.clients import ClientCreate, ClientUpdate, ClientResponse, ClientListResponse
from backend.app.schemas.invoices import InvoiceListResponse, InvoiceResponse
from backend.app.schemas.payments import PaymentListResponse, PaymentResponse

router = APIRouter(prefix="/clients", tags=["Clients"])

@router.get("", response_model=ClientListResponse)
def get_clients(
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Client).filter(Client.user_id == current_user.id)
    if not include_archived:
        query = query.filter(Client.is_archived == False)

    clients = query.order_by(Client.created_at.desc()).all()
    return ClientListResponse(clients=clients, total=len(clients))

@router.post("", response_model=ClientResponse)
def create_client(
    client_in: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = Client(
        user_id=current_user.id,
        name=client_in.name,
        email=client_in.email,
        phone=client_in.phone,
        company=client_in.company,
        country=client_in.country,
        billing_address=client_in.billing_address,
        preferred_currency=client_in.preferred_currency,
        notes=client_in.notes,
        is_archived=False,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
    return client

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_in: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")

    for field, value in client_in.model_dump(exclude_unset=True).items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client

@router.delete("/{client_id}")
def archive_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")

    # Archive rather than hard-delete to safeguard historical accounting records
    client.is_archived = True
    db.commit()
    return {"message": f"Client '{client.name}' archived successfully. Historical records preserved."}

@router.get("/{client_id}/invoices", response_model=InvoiceListResponse)
def get_client_invoices(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
    invoices = db.query(Invoice).filter(Invoice.client_id == client_id, Invoice.user_id == current_user.id).order_by(Invoice.created_at.desc()).all()
    results = [
        InvoiceResponse(
            id=inv.id,
            client_id=inv.client_id,
            client_name=client.name,
            invoice_number=inv.invoice_number,
            issue_date=inv.issue_date,
            due_date=inv.due_date,
            currency=inv.currency,
            subtotal=inv.subtotal,
            tax_rate=inv.tax_rate,
            tax_amount=inv.tax_amount,
            discount_amount=inv.discount_amount,
            total_amount=inv.total_amount,
            status=inv.status,
            notes=inv.notes,
            payment_terms=inv.payment_terms,
            paypal_order_id=inv.paypal_order_id,
            public_hash=inv.public_hash,
            created_at=inv.created_at,
            paid_at=inv.paid_at,
            items=[]
        ) for inv in invoices
    ]
    return InvoiceListResponse(invoices=results, total=len(results))

@router.get("/{client_id}/payments", response_model=PaymentListResponse)
def get_client_payments(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
    payments = db.query(Payment).filter(Payment.client_id == client_id, Payment.user_id == current_user.id).order_by(Payment.created_at.desc()).all()
    results = []
    for p in payments:
        inv = db.query(Invoice).filter(Invoice.id == p.invoice_id).first()
        results.append(
            PaymentResponse(
                id=p.id,
                invoice_id=p.invoice_id,
                invoice_number=inv.invoice_number if inv else "INV",
                client_name=client.name,
                transaction_id=p.transaction_id,
                provider=p.provider,
                amount=p.amount,
                currency=p.currency,
                status=p.status,
                provider_reference=p.provider_reference,
                payment_date=p.payment_date,
                created_at=p.created_at,
            )
        )
    return PaymentListResponse(payments=results, total=len(results))

