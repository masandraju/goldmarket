from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.shop import Shop, ShopService, ShopStatus
from app.models.user import User
from app.models.transaction import Transaction
from app.models.gold_rate import GoldRate
from app.core.dependencies import get_current_user, require_jeweller, require_admin
from app.services.location_service import get_nearby_shops
from pydantic import BaseModel
from datetime import date

router = APIRouter(prefix="/shops", tags=["Shops"])


class ShopCreateRequest(BaseModel):
    name: str
    description: str | None = None
    address: str
    city: str = "Pune"
    state: str = "Maharashtra"
    pincode: str
    latitude: float
    longitude: float
    phone: str
    email: str | None = None
    gstin: str | None = None
    accepts_emi: bool = False
    services: list[str] = []


class ShopUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    phone: str | None = None
    email: str | None = None
    gstin: str | None = None
    accepts_emi: bool | None = None
    services: list[str] | None = None


class ShopResponse(BaseModel):
    id: int
    name: str
    address: str
    city: str
    latitude: float
    longitude: float
    avg_rating: float
    review_count: int
    status: str
    accepts_emi: bool
    phone: str

    class Config:
        from_attributes = True


def _full_shop_dict(s: Shop) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description or "",
        "address": s.address,
        "city": s.city,
        "state": s.state,
        "pincode": s.pincode,
        "latitude": s.latitude,
        "longitude": s.longitude,
        "phone": s.phone,
        "email": s.email or "",
        "gstin": s.gstin or "",
        "status": s.status.value,
        "avg_rating": s.avg_rating,
        "review_count": s.review_count,
        "accepts_emi": s.accepts_emi,
        "services": [sv.service_name for sv in s.services],
    }


@router.get("/my-shops")
async def get_my_shops(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_jeweller),
):
    result = await db.execute(select(Shop).where(Shop.owner_id == current_user.id))
    shops = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "address": s.address,
            "city": s.city,
            "status": s.status.value,
            "avg_rating": s.avg_rating,
            "review_count": s.review_count,
            "accepts_emi": s.accepts_emi,
            "phone": s.phone,
        }
        for s in shops
    ]


@router.get("/my-orders")
async def get_my_orders(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_jeweller),
):
    shop_result = await db.execute(select(Shop.id).where(Shop.owner_id == current_user.id))
    shop_ids = [row[0] for row in shop_result.all()]
    if not shop_ids:
        return []

    result = await db.execute(
        select(Transaction, Shop.name.label("shop_name"), User.full_name.label("customer_name"), User.email.label("customer_email"))
        .join(Shop, Transaction.shop_id == Shop.id)
        .join(User, Transaction.user_id == User.id)
        .where(Transaction.shop_id.in_(shop_ids))
        .order_by(desc(Transaction.created_at))
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()
    return [
        {
            "id": txn.id,
            "shop_name": shop_name,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "transaction_type": txn.transaction_type.value,
            "amount_inr": txn.amount_inr,
            "gold_grams": txn.gold_grams,
            "rate_per_gram": txn.rate_per_gram,
            "status": txn.status.value,
            "created_at": txn.created_at.isoformat(),
        }
        for txn, shop_name, customer_name, customer_email in rows
    ]


@router.post("/register", status_code=201)
async def register_shop(
    payload: ShopCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_jeweller),
):
    shop = Shop(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        latitude=payload.latitude,
        longitude=payload.longitude,
        phone=payload.phone,
        email=payload.email,
        gstin=payload.gstin,
        accepts_emi=payload.accepts_emi,
        status=ShopStatus.PENDING,
    )
    db.add(shop)
    await db.flush()

    for svc in payload.services:
        db.add(ShopService(shop_id=shop.id, service_name=svc))

    return {"message": "Shop registered. Awaiting admin approval.", "shop_id": shop.id}


@router.get("/nearby")
async def search_nearby_shops(
    latitude: float = Query(..., description="User latitude"),
    longitude: float = Query(..., description="User longitude"),
    radius_km: float = Query(10.0, le=50.0),
    min_rating: float | None = Query(None, ge=1.0, le=5.0),
    city: str | None = Query(None),
    limit: int = Query(20, le=50),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    results = await get_nearby_shops(db, latitude, longitude, radius_km, min_rating, city, limit, offset)

    shop_ids = [r["shop"].id for r in results]
    rates_result = await db.execute(
        select(GoldRate).where(
            GoldRate.shop_id.in_(shop_ids),
            GoldRate.effective_date == date.today(),
        )
    )
    rates_map = {r.shop_id: r for r in rates_result.scalars().all()}

    return [
        {
            **ShopResponse.model_validate(r["shop"]).model_dump(),
            "distance_km": r["distance_km"],
            "services": [sv.service_name for sv in r["shop"].services],
            "rate_22k": rates_map[r["shop"].id].rate_per_gram_22k if r["shop"].id in rates_map else None,
            "rate_24k": rates_map[r["shop"].id].rate_per_gram_24k if r["shop"].id in rates_map else None,
        }
        for r in results
    ]


@router.get("/{shop_id}/full")
async def get_shop_full(shop_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Shop).where(Shop.id == shop_id).options(selectinload(Shop.services))
    )
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return _full_shop_dict(shop)


@router.get("/{shop_id}")
async def get_shop(shop_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return ShopResponse.model_validate(shop)


@router.patch("/{shop_id}/edit")
async def edit_shop(
    shop_id: int,
    payload: ShopUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_jeweller),
):
    result = await db.execute(
        select(Shop)
        .where(Shop.id == shop_id, Shop.owner_id == current_user.id)
        .options(selectinload(Shop.services))
    )
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found or does not belong to you.")

    if payload.name is not None: shop.name = payload.name
    if payload.description is not None: shop.description = payload.description
    if payload.address is not None: shop.address = payload.address
    if payload.city is not None: shop.city = payload.city
    if payload.state is not None: shop.state = payload.state
    if payload.pincode is not None: shop.pincode = payload.pincode
    if payload.phone is not None: shop.phone = payload.phone
    if payload.email is not None: shop.email = payload.email
    if payload.gstin is not None: shop.gstin = payload.gstin
    if payload.accepts_emi is not None: shop.accepts_emi = payload.accepts_emi

    if payload.services is not None:
        await db.execute(delete(ShopService).where(ShopService.shop_id == shop.id))
        for svc in payload.services:
            db.add(ShopService(shop_id=shop.id, service_name=svc))

    return _full_shop_dict(shop)


class ShopLocationUpdate(BaseModel):
    latitude: float
    longitude: float


@router.patch("/{shop_id}/location")
async def update_shop_location(
    shop_id: int,
    payload: ShopLocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_jeweller),
):
    result = await db.execute(
        select(Shop).where(Shop.id == shop_id, Shop.owner_id == current_user.id)
    )
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found or does not belong to you.")
    shop.latitude = payload.latitude
    shop.longitude = payload.longitude
    return {"latitude": shop.latitude, "longitude": shop.longitude}


@router.patch("/{shop_id}/toggle-emi")
async def toggle_emi(
    shop_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_jeweller),
):
    result = await db.execute(
        select(Shop).where(Shop.id == shop_id, Shop.owner_id == current_user.id)
    )
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found or does not belong to you.")
    shop.accepts_emi = not shop.accepts_emi
    return {"accepts_emi": shop.accepts_emi}


@router.patch("/{shop_id}/approve")
async def approve_shop(
    shop_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop.status = ShopStatus.APPROVED
    return {"message": "Shop approved"}
