from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), default="General", nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    cost_price = Column(Numeric(12, 2), default=0.0, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    stock_quantity = Column(Integer, default=100, nullable=False)
    track_inventory = Column(Boolean, default=True, nullable=False)
    barcode = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="products")
    order_items = relationship("POSOrderItem", back_populates="product")

class POSOrder(Base):
    __tablename__ = "pos_orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_number = Column(String(100), unique=True, nullable=False, index=True)
    subtotal = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.0, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.0, nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    payment_method = Column(String(50), default="PAYPAL_QR", nullable=False)  # PAYPAL_QR, CARD, CASH
    payment_status = Column(String(50), default="COMPLETED", nullable=False)  # PENDING, COMPLETED, CANCELLED
    cash_tendered = Column(Numeric(12, 2), nullable=True)
    change_due = Column(Numeric(12, 2), nullable=True)
    paypal_order_id = Column(String(150), nullable=True, index=True)
    qr_code_token = Column(String(100), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="pos_orders")
    items = relationship("POSOrderItem", back_populates="order", cascade="all, delete-orphan")

class POSOrderItem(Base):
    __tablename__ = "pos_order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("pos_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product_name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(12, 2), nullable=False)

    order = relationship("POSOrder", back_populates="items")
    product = relationship("Product", back_populates="order_items")

