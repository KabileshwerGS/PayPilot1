from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    invoice_number = Column(String(100), nullable=False, index=True)
    issue_date = Column(String(50), nullable=False)
    due_date = Column(String(50), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False, default=0.0)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0.0)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    status = Column(String(50), default="DRAFT", nullable=False, index=True)  # DRAFT, APPROVED, SENT, PAID, OVERDUE, CANCELLED
    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)
    paypal_order_id = Column(String(150), nullable=True, index=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice")
    reminders = relationship("Reminder", back_populates="invoice")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False, default=1.0)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0.0)
    total = Column(Numeric(12, 2), nullable=False, default=0.0)

    invoice = relationship("Invoice", back_populates="items")

