from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class CreatorProfile(Base):
    __tablename__ = "creator_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    handle = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "alexcreates"
    display_name = Column(String(255), nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    suggested_tips = Column(String(255), default="[5, 10, 25, 50]")  # JSON string
    currency = Column(String(10), default="USD", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="creator_profile")
    tips = relationship("Tip", back_populates="creator", cascade="all, delete-orphan")
    plans = relationship("SubscriptionPlan", back_populates="creator", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="creator", cascade="all, delete-orphan")

class Tip(Base):
    __tablename__ = "tips"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    supporter_name = Column(String(255), default="Kind Supporter", nullable=False)
    supporter_email = Column(String(255), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    message = Column(Text, nullable=True)
    paypal_order_id = Column(String(150), nullable=True, index=True)
    transaction_id = Column(String(150), nullable=True, index=True)
    status = Column(String(50), default="COMPLETED", nullable=False)  # PENDING, COMPLETED, FAILED
    is_anonymous = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    creator = relationship("CreatorProfile", back_populates="tips")

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    paypal_plan_id = Column(String(150), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    billing_interval = Column(String(50), default="MONTHLY", nullable=False)  # MONTHLY, YEARLY
    perks = Column(Text, nullable=True)  # JSON or newline-separated perks
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    creator = relationship("CreatorProfile", back_populates="plans")
    subscriptions = relationship("Subscription", back_populates="plan")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False, index=True)
    subscriber_name = Column(String(255), nullable=False)
    subscriber_email = Column(String(255), nullable=False, index=True)
    paypal_subscription_id = Column(String(150), nullable=True, index=True)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, PAST_DUE, CANCELLED, EXPIRED
    current_period_start = Column(String(50), nullable=True)
    current_period_end = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    creator = relationship("CreatorProfile", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")

