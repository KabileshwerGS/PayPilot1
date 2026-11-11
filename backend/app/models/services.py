from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), default="Residential", nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(12, 2), nullable=False, default=0.0)
    currency = Column(String(10), default="USD", nullable=False)
    estimated_duration_hours = Column(Numeric(5, 2), default=2.0, nullable=False)
    pricing_type = Column(String(50), default="FLAT_RATE", nullable=False)  # FLAT_RATE, HOURLY
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="services")
    jobs = relationship("Job", back_populates="service")

