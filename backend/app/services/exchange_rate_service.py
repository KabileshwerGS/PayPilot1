import httpx
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from backend.app.models.exchange_rates import ExchangeRate
from backend.app.core.config import settings

FALLBACK_RATES = {
    ("USD", "USD"): 1.0,
    ("USD", "EUR"): 0.92,
    ("USD", "GBP"): 0.79,
    ("USD", "INR"): 83.50,
    ("USD", "CAD"): 1.36,
    ("USD", "AUD"): 1.52,
    ("USD", "SGD"): 1.34,
}

async def get_exchange_rate(base_currency: str, target_currency: str, db: Session) -> float:
    base = base_currency.upper()
    target = target_currency.upper()

    if base == target:
        return 1.0

    # 1. Check database cache within the last 24 hours
    one_day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    cached = db.query(ExchangeRate).filter(
        ExchangeRate.base_currency == base,
        ExchangeRate.target_currency == target,
        ExchangeRate.fetched_at >= one_day_ago,
    ).first()

    if cached:
        return float(cached.rate)

    # 2. Attempt fetching from open exchange API
    try:
        url = f"{settings.EXCHANGE_RATE_API_URL}/{base}"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                rates = data.get("rates", {})
                rate_val = rates.get(target)
                if rate_val:
                    rate_float = float(rate_val)
                    # Cache in database
                    rate_record = ExchangeRate(
                        base_currency=base,
                        target_currency=target,
                        rate=Decimal(str(rate_float)),
                        fetched_at=datetime.now(timezone.utc),
                    )
                    db.add(rate_record)
                    db.commit()
                    return rate_float
    except Exception as e:
        print(f"Failed to fetch live exchange rate for {base}->{target}: {e}")

    # 3. Fallback to standard rates table
    if (base, target) in FALLBACK_RATES:
        return FALLBACK_RATES[(base, target)]
    if (target, base) in FALLBACK_RATES and FALLBACK_RATES[(target, base)] != 0:
        return 1.0 / FALLBACK_RATES[(target, base)]

    return 1.0

