from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from decimal import Decimal

class CurrencyBreakdownItem(BaseModel):
    currency: str
    original_amount: Decimal
    rate: float
    converted_amount: Decimal

class ClientRevenueItem(BaseModel):
    client_name: str
    invoices_paid: int
    total_amount: Decimal

class AnalyticsReportResponse(BaseModel):
    total_gross: Decimal
    total_outstanding: Decimal
    total_revenue: Decimal = Decimal("0.0")
    freelance_revenue: Decimal = Decimal("0.0")
    creator_tips_revenue: Decimal = Decimal("0.0")
    marketplace_commissions: Decimal = Decimal("0.0")
    pos_retail_revenue: Decimal = Decimal("0.0")
    total_payouts_paid: Decimal = Decimal("0.0")
    total_payouts_pending: Decimal = Decimal("0.0")
    net_profit: Decimal = Decimal("0.0")
    profit_margin_pct: float = 0.0
    currency_breakdown: List[CurrencyBreakdownItem]
    client_revenue: List[ClientRevenueItem]

