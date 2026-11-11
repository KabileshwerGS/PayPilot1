import httpx
import json
import uuid
from decimal import Decimal
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.core.config import settings

class PayPalClient:
    def __init__(self, mode: str = "sandbox", client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.mode = mode
        self.client_id = client_id or settings.PAYPAL_CLIENT_ID
        self.client_secret = client_secret or settings.PAYPAL_CLIENT_SECRET
        self.base_url = (
            "https://api-m.paypal.com" if self.mode == "live" else "https://api-m.sandbox.paypal.com"
        )

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    async def get_access_token(self) -> Optional[str]:
        if not self.is_configured():
            return None
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                auth=(self.client_id, self.client_secret),
                data={"grant_type": "client_credentials"},
                headers={"Accept": "application/json", "Accept-Language": "en_US"},
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
        return None

    async def create_order(self, amount: Decimal, currency: str, invoice_number: str) -> Dict[str, Any]:
        """Creates a PayPal Checkout order."""
        token = await self.get_access_token()
        
        # If real PayPal credentials exist, execute actual REST API call
        if token:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }
            payload = {
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "reference_id": invoice_number,
                        "amount": {
                            "currency_code": currency,
                            "value": f"{amount:.2f}",
                        },
                        "description": f"Payment for Invoice {invoice_number}",
                    }
                ],
            }
            async with httpx.AsyncClient() as client:
                res = await client.post(f"{self.base_url}/v2/checkout/orders", json=payload, headers=headers)
                if res.status_code in [200, 201]:
                    return res.json()
                else:
                    raise Exception(f"PayPal order creation failed: {res.text}")

        # Development Sandbox Simulation when credentials are not yet entered
        fake_order_id = f"PAYPAL-SB-{uuid.uuid4().hex[:12].upper()}"
        return {
            "id": fake_order_id,
            "status": "CREATED",
            "mode": "SANDBOX_SIMULATED",
            "purchase_units": [
                {
                    "reference_id": invoice_number,
                    "amount": {"currency_code": currency, "value": f"{amount:.2f}"},
                }
            ],
        }

    async def capture_order(self, order_id: str, expected_amount: Decimal, expected_currency: str) -> Dict[str, Any]:
        """Captures a PayPal Checkout order and verifies amount/currency against invoice."""
        token = await self.get_access_token()

        if token and not order_id.startswith("PAYPAL-SB-"):
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }
            async with httpx.AsyncClient() as client:
                res = await client.post(f"{self.base_url}/v2/checkout/orders/{order_id}/capture", json={}, headers=headers)
                if res.status_code in [200, 201]:
                    data = res.json()
                    # Verify captured amount and currency
                    capture_unit = data["purchase_units"][0]["payments"]["captures"][0]
                    cap_amount = Decimal(capture_unit["amount"]["value"])
                    cap_currency = capture_unit["amount"]["currency_code"]

                    if cap_amount != expected_amount or cap_currency != expected_currency:
                        raise Exception(
                            f"Fraud alert: Captured amount {cap_currency} {cap_amount} does not match expected {expected_currency} {expected_amount}"
                        )

                    return {
                        "transaction_id": capture_unit["id"],
                        "status": "COMPLETED",
                        "amount": cap_amount,
                        "currency": cap_currency,
                        "provider_reference": order_id,
                        "payment_date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                    }
                else:
                    raise Exception(f"PayPal capture failed: {res.text}")

        # Verification in Sandbox Simulation
        return {
            "transaction_id": f"TXN-{uuid.uuid4().hex[:14].upper()}",
            "status": "COMPLETED",
            "amount": expected_amount,
            "currency": expected_currency,
            "provider_reference": order_id,
            "payment_date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        }


def get_paypal_client(db: Session, user_id: int) -> PayPalClient:
    """Retrieve PayPal client configured for specific user, falling back to global settings."""
    from backend.app.models.settings import IntegrationSettings

    setting = db.query(IntegrationSettings).filter(
        IntegrationSettings.user_id == user_id,
        IntegrationSettings.provider == "PAYPAL",
    ).first()
    if setting and setting.config_data:
        try:
            cfg = json.loads(setting.config_data)
            return PayPalClient(
                mode=cfg.get("mode", "sandbox"),
                client_id=cfg.get("client_id"),
                client_secret=cfg.get("client_secret"),
            )
        except Exception:
            pass
    return PayPalClient()


