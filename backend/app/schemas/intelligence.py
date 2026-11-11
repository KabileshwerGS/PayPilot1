from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class RecommendationItem(BaseModel):
    id: str
    title: str
    urgency: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    financial_rationale: str
    quantified_impact: str
    recommended_action: str
    action_type: str
    action_payload: Dict[str, Any] = {}
    supporting_metrics: Dict[str, Any] = {}
    is_executed: bool = False
    is_prediction: bool = True

class FinancialIntelligenceCockpitResponse(BaseModel):
    user_id: int
    base_currency: str
    generated_at: str
    starting_verified_balance: float
    projected_ending_balance: float
    minimum_projected_balance: float
    has_deficit_risk: bool
    earliest_deficit_date: Optional[str] = None
    projected_runway_days: int
    financial_health_score: int
    debtor_summary: Dict[str, Any]
    debtor_profiles: List[Dict[str, Any]] = []
    cash_flow_totals: Dict[str, Any]
    cash_flow_timeline: List[Dict[str, Any]]
    anomalies: List[Dict[str, Any]]
    recommendations: List[RecommendationItem]
    data_classification: Dict[str, Any]
    gemini_synthesis_status: str  # "SYNTHESIZED", "FALLBACK_DETERMINISTIC", "UNCONFIGURED"

class ExecuteRecommendationRequest(BaseModel):
    action_type: str
    action_payload: Dict[str, Any] = {}
    confirmed: bool = Field(..., description="Explicit user confirmation required to execute financial actions")

class ExecuteRecommendationResponse(BaseModel):
    success: bool
    recommendation_id: str
    action_type: str
    message: str
    audit_log_id: int
    executed_at: str

