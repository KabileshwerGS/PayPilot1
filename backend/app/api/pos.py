import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone
from decimal import Decimal

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.pos import Product, POSOrder, POSOrderItem
from backend.app.models.notifications import Notification
from backend.app.integrations.paypal import get_paypal_client
from backend.app.schemas.pos import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    POSCheckoutRequest,
    POSOrderResponse,
    POSOrderItemResponse,
)

router = APIRouter(prefix="/pos", tags=["Point of Sale & Merchant"])
public_router = APIRouter(prefix="/public/pos", tags=["Public POS Checkout"])

def generate_pos_order_number(db: Session, user_id: int) -> str:
    count = db.query(POSOrder).count()
    year = datetime.now().year
    num = f"POS-{year}-{count + 1:04d}"
    while db.query(POSOrder).filter(POSOrder.order_number == num).first():
        count += 1
        num = f"POS-{year}-{count + 1:04d}"
    return num

# --- Products & Inventory ---

@router.get("/products", response_model=List[ProductResponse])
def list_pos_products(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.user_id == current_user.id, Product.is_active == True)
    if category:
        query = query.filter(Product.category.ilike(f"%{category.strip()}%"))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (Product.name.ilike(term)) | (Product.sku.ilike(term)) | (Product.barcode.ilike(term))
        )
    return query.order_by(Product.name.asc()).all()

@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_pos_product(
    req: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Product).filter(Product.user_id == current_user.id, Product.sku == req.sku.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product SKU '{req.sku}' already exists.")

    product = Product(
        user_id=current_user.id,
        sku=req.sku.strip(),
        name=req.name.strip(),
        category=req.category.strip(),
        description=req.description,
        price=req.price,
        cost_price=req.cost_price,
        currency=req.currency.upper(),
        stock_quantity=req.stock_quantity,
        track_inventory=req.track_inventory,
        barcode=req.barcode.strip() if req.barcode else None,
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.put("/products/{product_id}", response_model=ProductResponse)
def update_pos_product(
    product_id: int,
    req: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    if req.name is not None:
        product.name = req.name.strip()
    if req.category is not None:
        product.category = req.category.strip()
    if req.description is not None:
        product.description = req.description
    if req.price is not None:
        product.price = req.price
    if req.cost_price is not None:
        product.cost_price = req.cost_price
    if req.stock_quantity is not None:
        product.stock_quantity = req.stock_quantity
    if req.track_inventory is not None:
        product.track_inventory = req.track_inventory
    if req.barcode is not None:
        product.barcode = req.barcode.strip() if req.barcode else None
    if req.is_active is not None:
        product.is_active = req.is_active

    db.commit()
    db.refresh(product)
    return product

# --- POS Terminal Register & Checkout ---

@router.post("/checkout", response_model=POSOrderResponse)
def pos_terminal_checkout(
    req: POSCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not req.items:
        raise HTTPException(status_code=400, detail="Cart cannot be empty.")

    subtotal = Decimal("0.0")
    for item in req.items:
        subtotal += item.price * Decimal(str(item.quantity))

    tax_amount = (subtotal * req.tax_rate) / Decimal("100.0") if req.tax_rate > 0 else Decimal("0.0")
    discount = req.discount_amount or Decimal("0.0")
    total_amount = max(Decimal("0.0"), subtotal + tax_amount - discount)

    order_number = generate_pos_order_number(db, current_user.id)
    payment_method = req.payment_method.upper()

    # Cash Calculation
    cash_tendered = req.cash_tendered
    change_due = None
    payment_status = "COMPLETED" if payment_method in ["CASH", "CARD"] else "PENDING"

    if payment_method == "CASH":
        if cash_tendered is None or cash_tendered < total_amount:
            raise HTTPException(status_code=400, detail=f"Cash tendered ({cash_tendered or 0.0}) is less than total amount ({total_amount:.2f}).")
        change_due = cash_tendered - total_amount

    qr_token = str(uuid.uuid4())[:12] if payment_method == "PAYPAL_QR" else None

    order = POSOrder(
        user_id=current_user.id,
        order_number=order_number,
        subtotal=subtotal,
        tax_amount=tax_amount,
        discount_amount=discount,
        total_amount=total_amount,
        currency="USD",
        payment_method=payment_method,
        payment_status=payment_status,
        cash_tendered=cash_tendered,
        change_due=change_due,
        qr_code_token=qr_token,
    )
    db.add(order)
    db.flush()

    for it in req.items:
        order_item = POSOrderItem(
            order_id=order.id,
            product_id=it.product_id,
            product_name=it.name,
            sku=it.sku,
            quantity=it.quantity,
            unit_price=it.price,
            total=it.price * Decimal(str(it.quantity)),
        )
        db.add(order_item)

        # Inventory Decrement
        if it.product_id:
            p = db.query(Product).filter(Product.id == it.product_id).first()
            if p and p.track_inventory:
                p.stock_quantity = max(0, p.stock_quantity - it.quantity)

    db.commit()
    db.refresh(order)

    return POSOrderResponse(
        id=order.id,
        order_number=order.order_number,
        subtotal=order.subtotal,
        tax_amount=order.tax_amount,
        discount_amount=order.discount_amount,
        total_amount=order.total_amount,
        currency=order.currency,
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        cash_tendered=order.cash_tendered,
        change_due=order.change_due,
        qr_code_token=order.qr_code_token,
        items=[POSOrderItemResponse.from_orm(oi) for oi in order.items],
        created_at=order.created_at,
    )

@router.get("/orders", response_model=List[POSOrderResponse])
def list_pos_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = db.query(POSOrder).filter(POSOrder.user_id == current_user.id).order_by(POSOrder.id.desc()).all()
    results = []
    for o in orders:
        results.append(
            POSOrderResponse(
                id=o.id,
                order_number=o.order_number,
                subtotal=o.subtotal,
                tax_amount=o.tax_amount,
                discount_amount=o.discount_amount,
                total_amount=o.total_amount,
                currency=o.currency,
                payment_method=o.payment_method,
                payment_status=o.payment_status,
                cash_tendered=o.cash_tendered,
                change_due=o.change_due,
                qr_code_token=o.qr_code_token,
                items=[POSOrderItemResponse.from_orm(oi) for oi in o.items],
                created_at=o.created_at,
            )
        )
    return results

# --- Public Dynamic QR Checkout (Customer Scanning in Store) ---

@public_router.get("/orders/{order_number}")
def get_public_pos_order(
    order_number: str,
    db: Session = Depends(get_db),
):
    order = db.query(POSOrder).filter(POSOrder.order_number == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    return {
        "order_number": order.order_number,
        "subtotal": float(order.subtotal),
        "tax_amount": float(order.tax_amount),
        "total_amount": float(order.total_amount),
        "currency": order.currency,
        "payment_status": order.payment_status,
        "items": [{"name": i.product_name, "quantity": i.quantity, "total": float(i.total)} for i in order.items],
    }

@public_router.post("/orders/{order_number}/pay-paypal")
async def pay_pos_order_via_paypal(
    order_number: str,
    db: Session = Depends(get_db),
):
    order = db.query(POSOrder).filter(POSOrder.order_number == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    paypal = get_paypal_client(db, order.user_id)
    pp_order = await paypal.create_order(
        amount=order.total_amount,
        currency=order.currency,
        invoice_number=order.order_number,
    )
    order.paypal_order_id = pp_order["id"]
    db.commit()

    return {
        "paypal_order_id": pp_order["id"],
        "amount": float(order.total_amount),
        "currency": order.currency,
    }

@public_router.post("/orders/{order_number}/capture-paypal")
async def capture_pos_order_via_paypal(
    order_number: str,
    payload: dict,
    db: Session = Depends(get_db),
):
    order = db.query(POSOrder).filter(POSOrder.order_number == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    paypal_order_id = payload.get("paypal_order_id") or order.paypal_order_id
    if not paypal_order_id:
        raise HTTPException(status_code=400, detail="Missing paypal_order_id")

    paypal = get_paypal_client(db, order.user_id)
    verified = await paypal.capture_order(
        order_id=paypal_order_id,
        expected_amount=order.total_amount,
        expected_currency=order.currency,
    )

    order.payment_status = "COMPLETED"
    db.commit()

    notif = Notification(
        user_id=order.user_id,
        title="POS QR Payment Received! 📱",
        message=f"Order {order.order_number} for {order.currency} {order.total_amount:.2f} paid via PayPal QR scan.",
        notification_type="POS_QR_PAID",
        link_url="/pos",
    )
    db.add(notif)
    db.commit()

    return {
        "status": "COMPLETED",
        "order_number": order.order_number,
        "amount": float(order.total_amount),
        "currency": order.currency,
        "transaction_id": verified["transaction_id"],
    }
