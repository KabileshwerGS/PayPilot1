from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True, index=True)
    payout_reference = Column(String(100), unique=True, nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    payout_type = Column(String(50), default="HOURLY_WAGE", nullable=False)  # HOURLY_WAGE, JOB_COMPENSATION, COMMISSION, BONUS
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, APPROVED, PAID, CANCELLED
    payment_method = Column(String(50), default="MANUAL", nullable=False)  # BANK_TRANSFER, MANUAL, PAYPAL_RECORD, CASH, CHECK
    period_start = Column(String(50), nullable=True)
    period_end = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="payouts")
    staff = relationship("Staff", back_populates="payouts")
    job = relationship("Job", back_populates="payouts")

