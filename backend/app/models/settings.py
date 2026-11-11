from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class IntegrationSettings(Base):
    __tablename__ = "integration_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)  # PAYPAL, GEMINI, EMAIL
    mode = Column(String(50), default="sandbox")  # sandbox, live
    is_connected = Column(Boolean, default=False)
    config_data = Column(Text, nullable=True)  # JSON formatted configuration
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="settings")

