from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    reminder_type = Column(String(50), nullable=False)  # BEFORE_DUE, ON_DUE, AFTER_DUE
    scheduled_date = Column(String(50), nullable=False)
    sent_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="SCHEDULED", nullable=False)  # SCHEDULED, SENT, FAILED, CANCELLED
    error_message = Column(Text, nullable=True)
    channel = Column(String(50), default="EMAIL", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="reminders")
    invoice = relationship("Invoice", back_populates="reminders")
    client = relationship("Client", back_populates="reminders")

