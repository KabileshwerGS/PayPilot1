from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.settings import IntegrationSettings
from backend.app.schemas.settings import SettingsResponse, PayPalSettingsUpdate, AISettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=SettingsResponse)
def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    paypal_setting = db.query(IntegrationSettings).filter(
        IntegrationSettings.user_id == current_user.id,
        IntegrationSettings.provider == "PAYPAL",
    ).first()

    ai_setting = db.query(IntegrationSettings).filter(
        IntegrationSettings.user_id == current_user.id,
        IntegrationSettings.provider == "GEMINI",
    ).first()

    paypal_data = None
    if paypal_setting and paypal_setting.config_data:
        try:
            cfg = json.loads(paypal_setting.config_data)
            paypal_data = {
                "mode": cfg.get("mode", "sandbox"),
                "client_id": cfg.get("client_id", ""),
                "is_connected": paypal_setting.is_connected,
            }
        except Exception:
            pass

    ai_data = None
    if ai_setting and ai_setting.config_data:
        try:
            cfg = json.loads(ai_setting.config_data)
            ai_data = {
                "is_connected": ai_setting.is_connected,
                "has_key": bool(cfg.get("gemini_api_key")),
            }
        except Exception:
            pass

    # If not overridden in user DB settings, check server environment variable
    from backend.app.core.config import settings
    if not ai_data and settings.GEMINI_API_KEY:
        ai_data = {
            "is_connected": True,
            "has_key": True,
        }

    return SettingsResponse(paypal=paypal_data, ai=ai_data)

@router.put("/paypal")
def update_paypal_settings(
    req: PayPalSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    setting = db.query(IntegrationSettings).filter(
        IntegrationSettings.user_id == current_user.id,
        IntegrationSettings.provider == "PAYPAL",
    ).first()

    if not setting:
        setting = IntegrationSettings(
            user_id=current_user.id,
            provider="PAYPAL",
            mode=req.mode,
            is_connected=True,
        )
        db.add(setting)

    existing_config = {}
    if setting.config_data:
        try:
            existing_config = json.loads(setting.config_data)
        except Exception:
            pass

    new_config = {
        "mode": req.mode,
        "client_id": req.client_id,
        "client_secret": req.client_secret if req.client_secret else existing_config.get("client_secret", ""),
    }

    setting.mode = req.mode
    setting.config_data = json.dumps(new_config)
    setting.is_connected = bool(req.client_id)
    db.commit()

    return {"message": "PayPal settings updated successfully."}

@router.put("/ai")
def update_ai_settings(
    req: AISettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    setting = db.query(IntegrationSettings).filter(
        IntegrationSettings.user_id == current_user.id,
        IntegrationSettings.provider == "GEMINI",
    ).first()

    if not setting:
        setting = IntegrationSettings(
            user_id=current_user.id,
            provider="GEMINI",
            is_connected=True,
        )
        db.add(setting)

    config = {"gemini_api_key": req.gemini_api_key}
    setting.config_data = json.dumps(config)
    setting.is_connected = bool(req.gemini_api_key)
    db.commit()

    return {"message": "Gemini AI settings updated successfully."}

