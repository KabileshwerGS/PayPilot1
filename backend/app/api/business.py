from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.business import BusinessProfile
from backend.app.schemas.business import BusinessProfileCreate, BusinessProfileUpdate, BusinessProfileResponse

router = APIRouter(prefix="/business", tags=["Business Profile"])

@router.get("", response_model=BusinessProfileResponse)
def get_business_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found. Please complete onboarding.",
        )
    return profile

@router.post("", response_model=BusinessProfileResponse)
def create_business_profile(
    profile_in: BusinessProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile already exists. Use PUT to update.",
        )

    profile = BusinessProfile(
        user_id=current_user.id,
        business_name=profile_in.business_name,
        business_type=profile_in.business_type,
        owner_name=profile_in.owner_name,
        email=profile_in.email,
        phone=profile_in.phone,
        country=profile_in.country,
        address=profile_in.address,
        default_currency=profile_in.default_currency,
        time_zone=profile_in.time_zone,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.put("", response_model=BusinessProfileResponse)
def update_business_profile(
    profile_in: BusinessProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found.",
        )

    for field, value in profile_in.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile

