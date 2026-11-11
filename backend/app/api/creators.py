from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timezone
from decimal import Decimal
import json

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.creators import CreatorProfile, Tip, SubscriptionPlan, Subscription
from backend.app.models.payments import Payment
from backend.app.models.notifications import Notification
from backend.app.integrations.paypal import get_paypal_client
from backend.app.schemas.creators import (
    CreatorProfileCreate,
    CreatorProfileUpdate,
    CreatorProfileResponse,
    TipCreate,
    TipResponse,
    SubscriptionPlanCreate,
    SubscriptionPlanResponse,
    SubscriptionCreate,
    SubscriptionResponse,
)

router = APIRouter(prefix="/creators", tags=["Creators & Memberships"])
public_router = APIRouter(prefix="/public/creators", tags=["Public Creator Hub"])

def build_creator_response(c: CreatorProfile, db: Session) -> CreatorProfileResponse:
    tips = db.query(Tip).filter(Tip.creator_id == c.id, Tip.status == "COMPLETED").order_by(Tip.created_at.desc()).all()
    total_amount = sum([t.amount for t in tips]) or Decimal("0.0")
    subscribers_count = db.query(Subscription).filter(Subscription.creator_id == c.id, Subscription.status == "ACTIVE").count()

    plans = db.query(SubscriptionPlan).filter(SubscriptionPlan.creator_id == c.id, SubscriptionPlan.is_active == True).all()
    plan_responses = []
    for p in plans:
        sub_count = db.query(Subscription).filter(Subscription.plan_id == p.id, Subscription.status == "ACTIVE").count()
        plan_responses.append(
            SubscriptionPlanResponse(
                id=p.id,
                name=p.name,
                description=p.description,
                price=p.price,
                currency=p.currency,
                billing_interval=p.billing_interval,
                perks=p.perks,
                is_active=p.is_active,
                active_subscribers=sub_count,
                created_at=p.created_at,
            )
        )

    return CreatorProfileResponse(
        id=c.id,
        handle=c.handle,
        display_name=c.display_name,
        bio=c.bio,
        avatar_url=c.avatar_url,
        banner_url=c.banner_url,
        suggested_tips=c.suggested_tips,
        currency=c.currency,
        is_active=c.is_active,
        total_tips_count=len(tips),
        total_tips_amount=total_amount,
        total_subscribers=subscribers_count,
        recent_tips=[TipResponse.from_orm(t) for t in tips[:10]],
        plans=plan_responses,
        created_at=c.created_at,
    )

# --- Authenticated Endpoints ---

@router.get("/profile", response_model=Optional[CreatorProfileResponse])
def get_my_creator_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    if not profile:
        return None
    return build_creator_response(profile, db)

@router.post("/profile", response_model=CreatorProfileResponse, status_code=status.HTTP_201_CREATED)
def create_creator_profile(
    req: CreatorProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Creator profile already exists for this account.")

    clean_handle = req.handle.strip().lower().replace("@", "")
    handle_taken = db.query(CreatorProfile).filter(CreatorProfile.handle == clean_handle).first()
    if handle_taken:
        raise HTTPException(status_code=400, detail=f"Handle '@{clean_handle}' is already taken.")

    profile = CreatorProfile(
        user_id=current_user.id,
        handle=clean_handle,
        display_name=req.display_name.strip(),
        bio=req.bio,
        avatar_url=req.avatar_url,
        banner_url=req.banner_url,
        suggested_tips=req.suggested_tips,
        currency=req.currency.upper(),
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return build_creator_response(profile, db)

@router.put("/profile", response_model=CreatorProfileResponse)
def update_creator_profile(
    req: CreatorProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Creator profile not found. Create one first.")

    if req.display_name is not None:
        profile.display_name = req.display_name.strip()
    if req.bio is not None:
        profile.bio = req.bio
    if req.avatar_url is not None:
        profile.avatar_url = req.avatar_url
    if req.banner_url is not None:
        profile.banner_url = req.banner_url
    if req.suggested_tips is not None:
        profile.suggested_tips = req.suggested_tips
    if req.currency is not None:
        profile.currency = req.currency.upper()
    if req.is_active is not None:
        profile.is_active = req.is_active

    db.commit()
    db.refresh(profile)
    return build_creator_response(profile, db)

@router.post("/plans", response_model=SubscriptionPlanResponse, status_code=status.HTTP_201_CREATED)
def create_subscription_plan(
    req: SubscriptionPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Please create a creator profile before offering memberships.")

    plan = SubscriptionPlan(
        creator_id=profile.id,
        name=req.name.strip(),
        description=req.description,
        price=req.price,
        currency=req.currency.upper(),
        billing_interval=req.billing_interval.upper(),
        perks=req.perks,
        is_active=True,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return SubscriptionPlanResponse(
        id=plan.id,
        name=plan.name,
        description=plan.description,
        price=plan.price,
        currency=plan.currency,
        billing_interval=plan.billing_interval,
        perks=plan.perks,
        is_active=plan.is_active,
        active_subscribers=0,
        created_at=plan.created_at,
    )

@router.get("/subscriptions", response_model=List[SubscriptionResponse])
def list_subscribers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    if not profile:
        return []

    subs = db.query(Subscription).filter(Subscription.creator_id == profile.id).order_by(Subscription.id.desc()).all()
    results = []
    for s in subs:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == s.plan_id).first()
        results.append(
            SubscriptionResponse(
                id=s.id,
                plan_id=s.plan_id,
                plan_name=plan.name if plan else "Membership",
                subscriber_name=s.subscriber_name,
                subscriber_email=s.subscriber_email,
                status=s.status,
                current_period_start=s.current_period_start,
                current_period_end=s.current_period_end,
                created_at=s.created_at,
            )
        )
    return results

# --- Public Endpoints (Supporters & Fans) ---

@public_router.get("/{handle}", response_model=CreatorProfileResponse)
def get_public_creator(
    handle: str,
    db: Session = Depends(get_db),
):
    clean_handle = handle.strip().lower().replace("@", "")
    profile = db.query(CreatorProfile).filter(CreatorProfile.handle == clean_handle, CreatorProfile.is_active == True).first()
    if not profile:
        raise HTTPException(status_code=404, detail=f"Creator '@{clean_handle}' not found.")
    return build_creator_response(profile, db)

@public_router.post("/{handle}/tip/create-order")
async def create_tip_order(
    handle: str,
    req: TipCreate,
    db: Session = Depends(get_db),
):
    clean_handle = handle.strip().lower().replace("@", "")
    profile = db.query(CreatorProfile).filter(CreatorProfile.handle == clean_handle, CreatorProfile.is_active == True).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Creator not found.")

    paypal = get_paypal_client(db, profile.user_id)
    order = await paypal.create_order(
        amount=req.amount,
        currency=req.currency,
        invoice_number=f"TIP-{profile.handle.upper()}-{int(datetime.now().timestamp())}",
    )

    # Pre-record pending tip
    tip = Tip(
        creator_id=profile.id,
        supporter_name=req.supporter_name or "Kind Supporter",
        supporter_email=req.supporter_email,
        amount=req.amount,
        currency=req.currency.upper(),
        message=req.message,
        paypal_order_id=order["id"],
        status="PENDING",
        is_anonymous=req.is_anonymous,
    )
    db.add(tip)
    db.commit()

    return {
        "order_id": order["id"],
        "status": order.get("status", "CREATED"),
        "amount": float(req.amount),
        "currency": req.currency,
    }

@public_router.post("/{handle}/tip/capture")
async def capture_tip_order(
    handle: str,
    payload: dict,
    db: Session = Depends(get_db),
):
    order_id = payload.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="Missing order_id")

    clean_handle = handle.strip().lower().replace("@", "")
    profile = db.query(CreatorProfile).filter(CreatorProfile.handle == clean_handle).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Creator not found.")

    tip = db.query(Tip).filter(Tip.paypal_order_id == order_id).first()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip record not found.")

    paypal = get_paypal_client(db, profile.user_id)
    verified = await paypal.capture_order(
        order_id=order_id,
        expected_amount=tip.amount,
        expected_currency=tip.currency,
    )

    tip.status = "COMPLETED"
    tip.transaction_id = verified["transaction_id"]
    db.commit()

    # Record notification for creator
    notif = Notification(
        user_id=profile.user_id,
        title="New Fan Tip Received! 🎉",
        message=f"{'Anonymous' if tip.is_anonymous else tip.supporter_name} tipped you {tip.currency} {tip.amount:.2f}! {f'Message: \"{tip.message}\"' if tip.message else ''}",
        notification_type="TIP_RECEIVED",
        link_url="/creator",
    )
    db.add(notif)
    db.commit()

    return {
        "status": "COMPLETED",
        "transaction_id": tip.transaction_id,
        "amount": float(tip.amount),
        "currency": tip.currency,
        "message": "Thank you for supporting this creator!",
    }

@public_router.post("/{handle}/subscribe")
def enroll_subscriber(
    handle: str,
    req: SubscriptionCreate,
    db: Session = Depends(get_db),
):
    clean_handle = handle.strip().lower().replace("@", "")
    profile = db.query(CreatorProfile).filter(CreatorProfile.handle == clean_handle).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Creator not found.")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == req.plan_id, SubscriptionPlan.creator_id == profile.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription tier not found.")

    sub = Subscription(
        creator_id=profile.id,
        plan_id=plan.id,
        subscriber_name=req.subscriber_name.strip(),
        subscriber_email=req.subscriber_email.strip(),
        status="ACTIVE",
        current_period_start=datetime.now().strftime("%Y-%m-%d"),
        current_period_end="Ongoing (Renewing)",
    )
    db.add(sub)

    notif = Notification(
        user_id=profile.user_id,
        title="New Member Enrolled! ⭐",
        message=f"{req.subscriber_name} just joined your '{plan.name}' membership tier ({plan.currency} {plan.price:.2f}/{plan.billing_interval.lower()})!",
        notification_type="MEMBERSHIP_NEW",
        link_url="/creator",
    )
    db.add(notif)
    db.commit()
    db.refresh(sub)

    return {
        "message": f"Successfully joined {profile.display_name}'s {plan.name} tier!",
        "subscription_id": sub.id,
        "status": sub.status,
    }

