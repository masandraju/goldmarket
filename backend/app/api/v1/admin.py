from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.db.session import get_db
from app.models.user import User
from app.models.shop import Shop, ShopService, ShopStatus
from app.models.transaction import Transaction, TransactionStatus
from app.core.dependencies import require_admin
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user_count = await db.execute(select(func.count(User.id)))
    shop_count = await db.execute(select(func.count(Shop.id)))
    pending_shops = await db.execute(
        select(func.count(Shop.id)).where(Shop.status == ShopStatus.PENDING)
    )
    total_txn_value = await db.execute(
        select(func.sum(Transaction.amount_inr)).where(Transaction.status == TransactionStatus.COMPLETED)
    )
    return {
        "total_users": user_count.scalar(),
        "total_shops": shop_count.scalar(),
        "pending_shop_approvals": pending_shops.scalar(),
        "total_transaction_value_inr": float(total_txn_value.scalar() or 0),
    }


@router.get("/shops/all")
async def all_shops(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Shop).order_by(Shop.created_at.desc()))
    shops = result.scalars().all()
    return [
        {
            "id": s.id, "name": s.name, "city": s.city, "phone": s.phone,
            "status": s.status.value, "owner_id": s.owner_id,
            "accepts_emi": s.accepts_emi, "avg_rating": s.avg_rating,
            "created_at": str(s.created_at),
        }
        for s in shops
    ]


@router.get("/shops/pending")
async def pending_shops(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Shop).where(Shop.status == ShopStatus.PENDING))
    shops = result.scalars().all()
    return [
        {"id": s.id, "name": s.name, "city": s.city, "owner_id": s.owner_id, "created_at": str(s.created_at)}
        for s in shops
    ]


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [
        {"id": u.id, "email": u.email, "role": u.role.value, "is_active": u.is_active}
        for u in users
    ]


class AdminShopUpdate(BaseModel):
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
    status: str | None = None
    services: list[str] | None = None


@router.patch("/shops/{shop_id}")
async def admin_edit_shop(
    shop_id: int,
    payload: AdminShopUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

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
    if payload.status is not None:
        try:
            shop.status = ShopStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")
    if payload.services is not None:
        await db.execute(delete(ShopService).where(ShopService.shop_id == shop.id))
        for svc in payload.services:
            db.add(ShopService(shop_id=shop.id, service_name=svc))

    return {"message": "Shop updated", "id": shop.id}


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    return {"user_id": user_id, "is_active": user.is_active}
