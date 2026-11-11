from pydantic import BaseModel
from typing import Optional, Dict, Any

class AIChatRequest(BaseModel):
    message: str

class ProposedAction(BaseModel):
    action_type: str  # 'CREATE_INVOICE', 'SEND_REMINDER', 'UPDATE_SETTINGS'
    title: str
    description: str
    payload: Dict[str, Any]

class AIChatResponse(BaseModel):
    reply: str
    proposed_action: Optional[ProposedAction] = None

class AIActionExecuteRequest(BaseModel):
    action_type: str
    payload: Dict[str, Any]

class AIActionExecuteResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

