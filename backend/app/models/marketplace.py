from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class MarketplaceVendor(Base):
    __tablename__ = "marketplace_vendors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_name = Column(String(255), nullable=False)
    contact_email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    paypal_email = Column(String(255), nullable=False)
    store_name = Column(String(255), nullable=False)
    commission_rate_pct = Column(Numeric(5, 2), default=10.0, nullable=False)  # Platform takes 10%
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, PENDING, SUSPENDED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="marketplace_vendors")
    products = relationship("MarketplaceProduct", back_populates="vendor", cascade="all, delete-orphan")
    order_items = relationship("MarketplaceOrderItem", back_populates="vendor")
    payouts = relationship("VendorPayout", back_populates="vendor", cascade="all, delete-orphan")

class MarketplaceProduct(Base):
    __tablename__ = "marketplace_products"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("marketplace_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    vendor = relationship("MarketplaceVendor", back_populates="products")

class MarketplaceOrder(Base):
    __tablename__ = "marketplace_orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_number = Column(String(100), unique=True, nullable=False, index=True)
    buyer_name = Column(String(255), nullable=False)
    buyer_email = Column(String(255), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    platform_commission = Column(Numeric(12, 2), nullable=False)
    vendor_total = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    payment_status = Column(String(50), default="COMPLETED", nullable=False)  # COMPLETED, PENDING
    paypal_order_id = Column(String(150), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="marketplace_orders")
    items = relationship("MarketplaceOrderItem", back_populates="order", cascade="all, delete-orphan")

class MarketplaceOrderItem(Base):
    __tablename__ = "marketplace_order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("marketplace_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("marketplace_vendors.id"), nullable=False, index=True)
    item_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    gross_amount = Column(Numeric(12, 2), nullable=False)
    commission_amount = Column(Numeric(12, 2), nullable=False)
    vendor_net_amount = Column(Numeric(12, 2), nullable=False)

    order = relationship("MarketplaceOrder", back_populates="items")
    vendor = relationship("MarketplaceVendor", back_populates="order_items")

class VendorPayout(Base):
    __tablename__ = "vendor_payouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("marketplace_vendors.id"), nullable=False, index=True)
    payout_reference = Column(String(100), unique=True, nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, APPROVED, PAID
    payment_method = Column(String(50), default="PAYPAL_PAYOUT", nullable=False)
    notes = Column(Text, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="vendor_payouts")
    vendor = relationship("MarketplaceVendor", back_populates="payouts")

