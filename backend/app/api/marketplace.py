import io
import csv
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timezone
from decimal import Decimal

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.marketplace import (
    MarketplaceVendor,
    MarketplaceProduct,
    MarketplaceOrder,
    MarketplaceOrderItem,
    VendorPayout,
)
from backend.app.models.notifications import Notification
from backend.app.schemas.marketplace import (
    VendorCreate,
    VendorUpdate,
    VendorResponse,
    VendorProductCreate,
    VendorProductResponse,
    MarketplaceCheckoutRequest,
    MarketplaceOrderResponse,
    MarketplaceOrderItemResponse,
    VendorPayoutResponse,
)

router = APIRouter(prefix="/marketplace", tags=["Marketplace Solutions"])
public_router = APIRouter(prefix="/public/marketplace", tags=["Public Marketplace Store"])

def generate_order_number(db: Session, user_id: int) -> str:
    count = db.query(MarketplaceOrder).count()
    year = datetime.now().year
    num = f"MKT-{year}-{count + 1:04d}"
    while db.query(MarketplaceOrder).filter(MarketplaceOrder.order_number == num).first():
        count += 1
        num = f"MKT-{year}-{count + 1:04d}"
    return num

def generate_payout_ref(db: Session, user_id: int) -> str:
    count = db.query(VendorPayout).count()
    year = datetime.now().year
    ref = f"VPAY-{year}-{count + 1:04d}"
    while db.query(VendorPayout).filter(VendorPayout.payout_ref == ref).first():
        count += 1
        ref = f"VPAY-{year}-{count + 1:04d}"
    return ref

def build_vendor_response(v: MarketplaceVendor, db: Session) -> VendorResponse:
    order_items = db.query(MarketplaceOrderItem).filter(MarketplaceOrderItem.vendor_id == v.id).all()
    gross = sum([oi.gross_amount for oi in order_items]) or Decimal("0.0")
    comm = sum([oi.commission_amount for oi in order_items]) or Decimal("0.0")
    net = sum([oi.vendor_net_amount for oi in order_items]) or Decimal("0.0")

    paid_payouts = db.query(func.coalesce(func.sum(VendorPayout.amount), 0.0)).filter(
        VendorPayout.vendor_id == v.id,
        VendorPayout.status == "PAID",
    ).scalar()
    paid_amt = Decimal(str(paid_payouts or 0.0))
    pending_payout = max(Decimal("0.0"), net - paid_amt)

    prod_count = db.query(MarketplaceProduct).filter(MarketplaceProduct.vendor_id == v.id).count()

    return VendorResponse(
        id=v.id,
        vendor_name=v.vendor_name,
        contact_email=v.contact_email,
        phone=v.phone,
        paypal_email=v.paypal_email,
        store_name=v.store_name,
        commission_rate_pct=v.commission_rate_pct,
        status=v.status,
        total_sales=gross,
        total_commission_paid=comm,
        total_net_earnings=net,
        pending_payout=pending_payout,
        product_count=prod_count,
        created_at=v.created_at,
    )

# --- Vendor Management ---

@router.get("/vendors", response_model=List[VendorResponse])
def list_vendors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vendors = db.query(MarketplaceVendor).filter(MarketplaceVendor.user_id == current_user.id).all()
    return [build_vendor_response(v, db) for v in vendors]

@router.post("/vendors", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def create_vendor(
    req: VendorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vendor = MarketplaceVendor(
        user_id=current_user.id,
        vendor_name=req.vendor_name.strip(),
        contact_email=req.contact_email.strip(),
        phone=req.phone,
        paypal_email=req.paypal_email.strip(),
        store_name=req.store_name.strip(),
        commission_rate_pct=req.commission_rate_pct,
        status="ACTIVE",
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return build_vendor_response(vendor, db)

@router.put("/vendors/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    req: VendorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vendor = db.query(MarketplaceVendor).filter(MarketplaceVendor.id == vendor_id, MarketplaceVendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")

    if req.vendor_name is not None:
        vendor.vendor_name = req.vendor_name.strip()
    if req.contact_email is not None:
        vendor.contact_email = req.contact_email.strip()
    if req.phone is not None:
        vendor.phone = req.phone
    if req.paypal_email is not None:
        vendor.paypal_email = req.paypal_email.strip()
    if req.store_name is not None:
        vendor.store_name = req.store_name.strip()
    if req.commission_rate_pct is not None:
        vendor.commission_rate_pct = req.commission_rate_pct
    if req.status is not None:
        vendor.status = req.status.upper()

    db.commit()
    db.refresh(vendor)
    return build_vendor_response(vendor, db)

# --- Vendor Products ---

@router.get("/products", response_model=List[VendorProductResponse])
def list_vendor_products(
    vendor_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(MarketplaceProduct).join(MarketplaceVendor).filter(MarketplaceVendor.user_id == current_user.id)
    if vendor_id:
        query = query.filter(MarketplaceProduct.vendor_id == vendor_id)
    products = query.order_by(MarketplaceProduct.id.desc()).all()

    results = []
    for p in products:
        v = db.query(MarketplaceVendor).filter(MarketplaceVendor.id == p.vendor_id).first()
        results.append(
            VendorProductResponse(
                id=p.id,
                vendor_id=p.vendor_id,
                vendor_name=v.vendor_name if v else "Vendor",
                store_name=v.store_name if v else "Store",
                name=p.name,
                description=p.description,
                price=p.price,
                currency=p.currency,
                image_url=p.image_url,
                is_active=p.is_active,
                created_at=p.created_at,
            )
        )
    return results

@router.post("/products", response_model=VendorProductResponse, status_code=status.HTTP_201_CREATED)
def create_vendor_product(
    req: VendorProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vendor = db.query(MarketplaceVendor).filter(MarketplaceVendor.id == req.vendor_id, MarketplaceVendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")

    product = MarketplaceProduct(
        vendor_id=vendor.id,
        name=req.name.strip(),
        description=req.description,
        price=req.price,
        currency=req.currency.upper(),
        image_url=req.image_url,
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    return VendorProductResponse(
        id=product.id,
        vendor_id=vendor.id,
        vendor_name=vendor.vendor_name,
        store_name=vendor.store_name,
        name=product.name,
        description=product.description,
        price=product.price,
        currency=product.currency,
        image_url=product.image_url,
        is_active=product.is_active,
        created_at=product.created_at,
    )

# --- Marketplace Orders & Automatic Splits ---

@router.get("/orders", response_model=List[MarketplaceOrderResponse])
def list_marketplace_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = db.query(MarketplaceOrder).filter(MarketplaceOrder.user_id == current_user.id).order_by(MarketplaceOrder.id.desc()).all()
    results = []
    for o in orders:
        items_res = []
        for it in o.items:
            v = db.query(MarketplaceVendor).filter(MarketplaceVendor.id == it.vendor_id).first()
            items_res.append(
                MarketplaceOrderItemResponse(
                    id=it.id,
                    vendor_id=it.vendor_id,
                    vendor_name=v.vendor_name if v else "Vendor",
                    store_name=v.store_name if v else "Store",
                    item_name=it.item_name,
                    quantity=it.quantity,
                    unit_price=it.unit_price,
                    gross_amount=it.gross_amount,
                    commission_amount=it.commission_amount,
                    vendor_net_amount=it.vendor_net_amount,
                )
            )
        results.append(
            MarketplaceOrderResponse(
                id=o.id,
                order_number=o.order_number,
                buyer_name=o.buyer_name,
                buyer_email=o.buyer_email,
                total_amount=o.total_amount,
                platform_commission=o.platform_commission,
                vendor_total=o.vendor_total,
                currency=o.currency,
                payment_status=o.payment_status,
                items=items_res,
                created_at=o.created_at,
            )
        )
    return results

# --- Marketplace Vendor Payouts ---

@router.post("/vendors/{vendor_id}/payouts", response_model=VendorPayoutResponse)
def create_vendor_payout(
    vendor_id: int,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vendor = db.query(MarketplaceVendor).filter(MarketplaceVendor.id == vendor_id, MarketplaceVendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")

    amount = Decimal(str(payload.get("amount", "0.0")))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Payout amount must be greater than zero.")

    payout = VendorPayout(
        user_id=current_user.id,
        vendor_id=vendor.id,
        payout_reference=generate_payout_ref(db, current_user.id),
        amount=amount,
        currency="USD",
        status="PAID",
        payment_method=payload.get("payment_method", "PAYPAL_PAYOUT"),
        notes=payload.get("notes", "Platform settlement payout"),
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payout)

    notif = Notification(
        user_id=current_user.id,
        title="Vendor Payout Recorded",
        message=f"Disbursed {payout.currency} {payout.amount:.2f} to {vendor.store_name} ({vendor.paypal_email}).",
        notification_type="VENDOR_PAYOUT",
        link_url="/marketplace",
    )
    db.add(notif)
    db.commit()
    db.refresh(payout)

    return VendorPayoutResponse(
        id=payout.id,
        vendor_id=vendor.id,
        vendor_name=vendor.vendor_name,
        payout_reference=payout.payout_reference,
        amount=payout.amount,
        currency=payout.currency,
        status=payout.status,
        payment_method=payout.payment_method,
        notes=payout.notes,
        paid_at=payout.paid_at,
        created_at=payout.created_at,
    )

@router.get("/payouts/export-paypal-csv")
def export_paypal_mass_payout_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vendors = db.query(MarketplaceVendor).filter(MarketplaceVendor.user_id == current_user.id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Recipient Email", "Payment Amount", "Currency Code", "Reference ID", "Note to Recipient"])

    for v in vendors:
        v_res = build_vendor_response(v, db)
        if v_res.pending_payout > 0:
            writer.writerow([
                v.paypal_email,
                f"{v_res.pending_payout:.2f}",
                "USD",
                f"PAYOUT-V{v.id}-{int(datetime.now().timestamp())}",
                f"Platform payout for {v.store_name}",
            ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=PayPal_Mass_Payout_Batch.csv"},
    )

# --- Public Marketplace Store & Checkout ---

@public_router.get("/store")
def get_public_store_catalog(
    db: Session = Depends(get_db),
):
    products = db.query(MarketplaceProduct).filter(MarketplaceProduct.is_active == True).all()
    items = []
    for p in products:
        v = db.query(MarketplaceVendor).filter(MarketplaceVendor.id == p.vendor_id).first()
        if v and v.status == "ACTIVE":
            items.append({
                "id": p.id,
                "vendor_id": v.id,
                "vendor_name": v.vendor_name,
                "store_name": v.store_name,
                "commission_rate_pct": float(v.commission_rate_pct),
                "name": p.name,
                "description": p.description,
                "price": float(p.price),
                "currency": p.currency,
                "image_url": p.image_url,
            })
    return {"catalog": items}

@public_router.post("/checkout")
def execute_marketplace_checkout(
    req: MarketplaceCheckoutRequest,
    db: Session = Depends(get_db),
):
    if not req.items:
        raise HTTPException(status_code=400, detail="Cart is empty.")

    total_gross = Decimal("0.0")
    total_commission = Decimal("0.0")
    total_vendor_net = Decimal("0.0")
    order_items_to_add = []
    primary_user_id = None

    for item in req.items:
        prod = db.query(MarketplaceProduct).filter(MarketplaceProduct.id == item.product_id).first()
        if not prod:
            continue
        vendor = db.query(MarketplaceVendor).filter(MarketplaceVendor.id == prod.vendor_id).first()
        if not vendor:
            continue

        primary_user_id = vendor.user_id
        gross = prod.price * Decimal(str(item.quantity))
        comm = (gross * vendor.commission_rate_pct) / Decimal("100.0")
        vendor_net = gross - comm

        total_gross += gross
        total_commission += comm
        total_vendor_net += vendor_net

        order_items_to_add.append({
            "vendor_id": vendor.id,
            "item_name": prod.name,
            "quantity": item.quantity,
            "unit_price": prod.price,
            "gross_amount": gross,
            "commission_amount": comm,
            "vendor_net_amount": vendor_net,
        })

    if not primary_user_id or not order_items_to_add:
        raise HTTPException(status_code=400, detail="No valid products in cart.")

    order_number = generate_order_number(db, primary_user_id)
    order = MarketplaceOrder(
        user_id=primary_user_id,
        order_number=order_number,
        buyer_name=req.buyer_name.strip(),
        buyer_email=req.buyer_email.strip(),
        total_amount=total_gross,
        platform_commission=total_commission,
        vendor_total=total_vendor_net,
        currency="USD",
        payment_status="COMPLETED",
    )
    db.add(order)
    db.flush()

    for it in order_items_to_add:
        oi = MarketplaceOrderItem(
            order_id=order.id,
            vendor_id=it["vendor_id"],
            item_name=it["item_name"],
            quantity=it["quantity"],
            unit_price=it["unit_price"],
            gross_amount=it["gross_amount"],
            commission_amount=it["commission_amount"],
            vendor_net_amount=it["vendor_net_amount"],
        )
        db.add(oi)

    notif = Notification(
        user_id=primary_user_id,
        title="Marketplace Sale! Split Recorded 🛒",
        message=f"Order {order.order_number} for USD {total_gross:.2f} completed! Platform Commission: USD {total_commission:.2f} | Vendors: USD {total_vendor_net:.2f}.",
        notification_type="MARKETPLACE_ORDER",
        link_url="/marketplace",
    )
    db.add(notif)
    db.commit()
    db.refresh(order)

    return {
        "order_number": order.order_number,
        "total_amount": float(order.total_amount),
        "platform_commission": float(order.platform_commission),
        "vendor_share": float(order.vendor_total),
        "buyer_name": order.buyer_name,
        "payment_status": "COMPLETED",
        "message": "Payment captured and split successfully!",
    }
