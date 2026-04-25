from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.gold_rate import GoldRate
import redis.asyncio as aioredis
import json
from app.core.config import settings

CACHE_TTL = 3600  # 1 hour


async def get_redis():
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


class GoldRateService:

    @staticmethod
    async def get_today_rate(db: AsyncSession, shop_id: int) -> GoldRate | None:
        today = date.today()

        # Try cache first
        try:
            redis = await get_redis()
            cached = await redis.get(f"gold_rate:{shop_id}:{today}")
            if cached:
                data = json.loads(cached)
                return GoldRate(**data)
        except Exception:
            pass

        result = await db.execute(
            select(GoldRate).where(
                and_(GoldRate.shop_id == shop_id, GoldRate.effective_date == today)
            )
        )
        rate = result.scalar_one_or_none()

        if rate:
            try:
                await redis.set(
                    f"gold_rate:{shop_id}:{today}",
                    json.dumps({
                        "id": rate.id,
                        "shop_id": rate.shop_id,
                        "rate_per_gram_22k": rate.rate_per_gram_22k,
                        "rate_per_gram_24k": rate.rate_per_gram_24k,
                        "effective_date": str(rate.effective_date),
                        "is_manual_override": rate.is_manual_override,
                    }),
                    ex=CACHE_TTL,
                )
            except Exception:
                pass

        return rate

    @staticmethod
    def calculate_gold_grams(amount_inr: float, rate_per_gram: float) -> float:
        if rate_per_gram <= 0:
            raise ValueError("Invalid gold rate")
        return round(amount_inr / rate_per_gram, 6)

    @staticmethod
    def calculate_amount_inr(gold_grams: float, rate_per_gram: float) -> float:
        return round(gold_grams * rate_per_gram, 2)
