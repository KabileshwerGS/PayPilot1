from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    role = Column(String(100), default="Cleaner", nullable=False)
    employment_type = Column(String(50), default="CONTRACTOR", nullable=False)  # FULL_TIME, PART_TIME, CONTRACTOR
    payment_terms = Column(String(50), default="HOURLY", nullable=False)  # HOURLY, FIXED_PER_JOB, COMMISSION
    hourly_rate = Column(Numeric(12, 2), default=0.0, nullable=False)
    fixed_job_rate = Column(Numeric(12, 2), default=0.0, nullable=False)
    commission_rate = Column(Numeric(5, 2), default=0.0, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)  # ACTIVE, INACTIVE, ON_LEAVE
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="staff_members")
    assignments = relationship("JobAssignment", back_populates="staff", cascade="all, delete-orphan")
    payouts = relationship("Payout", back_populates="staff", cascade="all, delete-orphan")

