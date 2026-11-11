from pydantic import BaseModel
from typing import Optional, Dict, Any

class PayPalSettingsUpdate(BaseModel):
    mode: str = "sandbox"
    client_id: str
    client_secret: Optional[str] = None

class AISettingsUpdate(BaseModel):
    gemini_api_key: Optional[str] = None

class SettingsResponse(BaseModel):
    paypal: Optional[Dict[str, Any]] = None
    ai: Optional[Dict[str, Any]] = None

