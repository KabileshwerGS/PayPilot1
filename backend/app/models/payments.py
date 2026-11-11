from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    transaction_id = Column(String(150), unique=True, index=True, nullable=False)
    provider = Column(String(50), default="PAYPAL", nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), nullable=False)
    status = Column(String(50), default="COMPLETED", nullable=False)
    provider_reference = Column(String(255), nullable=True)
    payment_date = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="payments")
    invoice = relationship("Invoice", back_populates="payments")
    client = relationship("Client", back_populates="payments")
    events = relationship("PaymentEvent", back_populates="payment", cascade="all, delete-orphan")

class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="CASCADE"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False)
    payload = Column(Text, nullable=False)
    signature_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    payment = relationship("Payment", back_populates="events")

