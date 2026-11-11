from sqlalchemy import Column, Integer, String, Numeric, DateTime
from datetime import datetime, timezone
from backend.app.core.database import Base

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    base_currency = Column(String(10), nullable=False, index=True)
    target_currency = Column(String(10), nullable=False, index=True)
    rate = Column(Numeric(14, 6), nullable=False)
    fetched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

