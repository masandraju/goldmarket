from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.session import get_db
from app.models.gold_rate import GoldRate
from app.models.shop import Shop
from app.models.user import User
from app.core.dependencies import get_current_user, require_jeweller
from app.services.gold_rate_service import GoldRateService
from pydantic import BaseModel
from datetime import date, timedelta

router = APIRouter(prefix="/gold-rates", tags=["Gold Rates"])


class GoldRateCreateRequest(BaseModel):
    shop_id: int
    rate_per_gram_22k: float
    rate_per_gram_24k: float
    effective_date: date
    is_manual_override: bool = True
    notes: str | None = None


@router.post("/", status_code=201)
async def set_gold_rate(
    payload: GoldRateCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_jeweller),
):
    result = await db.execute(
        select(Shop).where(Shop.id == payload.shop_id, Shop.owner_id == current_user.id)
    )
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found or does not belong to you.")

    rate = GoldRate(
        shop_id=shop.id,
        rate_per_gram_22k=payload.rate_per_gram_22k,
        rate_per_gram_24k=payload.rate_per_gram_24k,
        effective_date=payload.effective_date,
        is_manual_override=payload.is_manual_override,
        notes=payload.notes,
    )
    db.add(rate)
    return {"message": "Gold rate set successfully"}


@router.get("/{shop_id}/today")
async def get_today_rate(shop_id: int, db: AsyncSession = Depends(get_db)):
    rate = await GoldRateService.get_today_rate(db, shop_id)
    if not rate:
        raise HTTPException(status_code=404, detail="No rate set for today")
    return {
        "shop_id": shop_id,
        "rate_per_gram_22k": rate.rate_per_gram_22k,
        "rate_per_gram_24k": rate.rate_per_gram_24k,
        "effective_date": str(rate.effective_date),
        "is_manual_override": rate.is_manual_override,
    }


@router.get("/{shop_id}/history")
async def get_rate_history(
    shop_id: int,
    days: int = Query(7, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    since = date.today() - timedelta(days=days - 1)
    result = await db.execute(
        select(GoldRate)
        .where(and_(GoldRate.shop_id == shop_id, GoldRate.effective_date >= since))
        .order_by(GoldRate.effective_date.asc())
    )
    rates = result.scalars().all()
    return [
        {
            "date": str(r.effective_date),
            "rate_per_gram_22k": r.rate_per_gram_22k,
            "rate_per_gram_24k": r.rate_per_gram_24k,
        }
        for r in rates
    ]
