from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True, index=True)
    job_number = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    location_address = Column(Text, nullable=True)
    scheduled_date = Column(String(50), nullable=False, index=True)
    scheduled_start_time = Column(String(50), nullable=True)
    scheduled_end_time = Column(String(50), nullable=True)
    price = Column(Numeric(12, 2), nullable=False, default=0.0)
    currency = Column(String(10), default="USD", nullable=False)
    estimated_hours = Column(Numeric(5, 2), default=2.0, nullable=False)
    actual_hours = Column(Numeric(5, 2), nullable=True)
    status = Column(String(50), default="ASSIGNED", nullable=False, index=True)  # ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
    priority = Column(String(50), default="NORMAL", nullable=False)  # LOW, NORMAL, HIGH, URGENT
    notes = Column(Text, nullable=True)
    completion_notes = Column(Text, nullable=True)
    checklist = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="jobs")
    client = relationship("Client", backref="jobs")
    service = relationship("Service", back_populates="jobs")
    invoice = relationship("Invoice", backref="job_source")
    assignments = relationship("JobAssignment", back_populates="job", cascade="all, delete-orphan")
    payouts = relationship("Payout", back_populates="job")

class JobAssignment(Base):
    __tablename__ = "job_assignments"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    role_in_job = Column(String(50), default="CLEANER", nullable=False)  # LEAD, CLEANER, ASSISTANT

    job = relationship("Job", back_populates="assignments")
    staff = relationship("Staff", back_populates="assignments")

