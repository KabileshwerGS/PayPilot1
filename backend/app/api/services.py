from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.services import Service
from backend.app.models.audit_logs import AuditLog
from backend.app.schemas.services import ServiceCreate, ServiceUpdate, ServiceResponse, ServiceListResponse

router = APIRouter(prefix="/services", tags=["Services & Pricing"])

@router.get("", response_model=ServiceListResponse)
def list_services(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    active_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Service).filter(Service.user_id == current_user.id)
    if active_only:
        query = query.filter(Service.is_active == True)
    if category:
        query = query.filter(Service.category.ilike(f"%{category.strip()}%"))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (Service.name.ilike(term)) | (Service.description.ilike(term)) | (Service.category.ilike(term))
        )

    services = query.order_by(Service.category.asc(), Service.name.asc()).all()
    return ServiceListResponse(services=services, total=len(services))

@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
    service_in: ServiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = Service(
        user_id=current_user.id,
        name=service_in.name.strip(),
        category=service_in.category.strip() if service_in.category else "Residential",
        description=service_in.description.strip() if service_in.description else None,
        price=service_in.price,
        currency=service_in.currency.upper(),
        estimated_duration_hours=service_in.estimated_duration_hours,
        pricing_type=service_in.pricing_type.upper(),
        is_active=service_in.is_active,
    )
    db.add(service)
    db.commit()
    db.refresh(service)

    audit = AuditLog(
        user_id=current_user.id,
        entity_type="SERVICE",
        entity_id=str(service.id),
        action="CREATE",
        details=f"Service '{service.name}' ({service.currency} {service.price:.2f}) created.",
    )
    db.add(audit)
    db.commit()

    return service

@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = db.query(Service).filter(Service.id == service_id, Service.user_id == current_user.id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")
    return service

@router.put("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: int,
    service_in: ServiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = db.query(Service).filter(Service.id == service_id, Service.user_id == current_user.id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")

    if service_in.name is not None:
        service.name = service_in.name.strip()
    if service_in.category is not None:
        service.category = service_in.category.strip()
    if service_in.description is not None:
        service.description = service_in.description.strip() if service_in.description else None
    if service_in.price is not None:
        service.price = service_in.price
    if service_in.currency is not None:
        service.currency = service_in.currency.upper()
    if service_in.estimated_duration_hours is not None:
        service.estimated_duration_hours = service_in.estimated_duration_hours
    if service_in.pricing_type is not None:
        service.pricing_type = service_in.pricing_type.upper()
    if service_in.is_active is not None:
        service.is_active = service_in.is_active

    db.commit()
    db.refresh(service)

    audit = AuditLog(
        user_id=current_user.id,
        entity_type="SERVICE",
        entity_id=str(service.id),
        action="UPDATE",
        details=f"Service '{service.name}' updated.",
    )
    db.add(audit)
    db.commit()

    return service

@router.delete("/{service_id}")
def delete_service(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = db.query(Service).filter(Service.id == service_id, Service.user_id == current_user.id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")

    service.is_active = False
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        entity_type="SERVICE",
        entity_id=str(service.id),
        action="DEACTIVATE",
        details=f"Service '{service.name}' deactivated.",
    )
    db.add(audit)
    db.commit()

    return {"message": f"Service '{service.name}' deactivated successfully."}

