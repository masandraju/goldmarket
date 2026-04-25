from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.models.user import User
from app.models.shop import Shop, ShopStatus
from app.models.redemption import RedemptionRequest, RedemptionStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.core.dependencies import require_customer, require_jeweller, get_current_user
from app.services.ledger_service import LedgerService
from app.services.gold_rate_service import GoldRateService
from pydantic import BaseModel

router = APIRouter(prefix="/redemptions", tags=["Redemption"])


class RedemptionCreateRequest(BaseModel):
    shop_id: int
    gold_grams: float
    preferred_item: str | None = None
    user_notes: str | None = None


class RedemptionActionRequest(BaseModel):
    status: RedemptionStatus
    shop_notes: str | None = None


@router.post("/request")
async def create_redemption_request(
    payload: RedemptionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_customer),
):
    if payload.gold_grams <= 0:
        raise HTTPException(status_code=400, detail="Gold grams must be positive")

    balance = await LedgerService.get_balance(db, current_user.id)
    if balance < payload.gold_grams:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: {balance:.4f}g, Requested: {payload.gold_grams:.4f}g",
        )

    result = await db.execute(select(Shop).where(Shop.id == payload.shop_id))
    shop = result.scalar_one_or_none()
    if not shop or shop.status != ShopStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Shop not found or not approved")

    # Look up today's rate for estimated INR value (best effort)
    rate = await GoldRateService.get_today_rate(db, payload.shop_id)
    rate_per_gram = rate.rate_per_gram_22k if rate else 0.0
    amount_inr = round(payload.gold_grams * rate_per_gram, 2)

    # Create transaction record
    txn = Transaction(
        user_id=current_user.id,
        shop_id=payload.shop_id,
        transaction_type=TransactionType.REDEMPTION,
        amount_inr=amount_inr,
        gold_grams=payload.gold_grams,
        rate_per_gram=rate_per_gram,
        status=TransactionStatus.PENDING,
    )
    db.add(txn)
    await db.flush()

    # Reserve gold (debit from ledger, linked to transaction)
    await LedgerService.debit(db, current_user.id, payload.gold_grams, txn.id)

    req = RedemptionRequest(
        user_id=current_user.id,
        shop_id=payload.shop_id,
        gold_grams=payload.gold_grams,
        preferred_item=payload.preferred_item,
        user_notes=payload.user_notes,
        status=RedemptionStatus.PENDING,
    )
    db.add(req)

    return {"message": "Redemption request submitted. Shop will contact you.", "request_id": req.id}


@router.get("/my-requests")
async def get_my_redemptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_customer),
):
    result = await db.execute(
        select(RedemptionRequest, Shop.name.label("shop_name"))
        .join(Shop, RedemptionRequest.shop_id == Shop.id)
        .where(RedemptionRequest.user_id == current_user.id)
        .order_by(desc(RedemptionRequest.created_at))
    )
    rows = result.all()
    return [
        {
            "id": r.id,
            "shop_id": r.shop_id,
            "shop_name": shop_name,
            "gold_grams": r.gold_grams,
            "status": r.status.value,
            "preferred_item": r.preferred_item,
            "user_notes": r.user_notes,
            "shop_notes": r.shop_notes,
            "created_at": r.created_at.isoformat(),
        }
        for r, shop_name in rows
    ]


@router.get("/shop/requests")
async def get_shop_redemption_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_jeweller),
):
    shop_ids_result = await db.execute(select(Shop.id).where(Shop.owner_id == current_user.id))
    shop_ids = [row[0] for row in shop_ids_result.all()]
    if not shop_ids:
        return []

    result = await db.execute(
        select(RedemptionRequest, Shop.name.label("shop_name"),
               User.full_name.label("customer_name"), User.email.label("customer_email"))
        .join(Shop, RedemptionRequest.shop_id == Shop.id)
        .join(User, RedemptionRequest.user_id == User.id)
        .where(RedemptionRequest.shop_id.in_(shop_ids))
        .order_by(desc(RedemptionRequest.created_at))
    )
    rows = result.all()
    return [
        {
            "id": r.id,
            "shop_id": r.shop_id,
            "shop_name": shop_name,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "gold_grams": r.gold_grams,
            "status": r.status.value,
            "preferred_item": r.preferred_item,
            "user_notes": r.user_notes,
            "shop_notes": r.shop_notes,
            "created_at": r.created_at.isoformat(),
        }
        for r, shop_name, customer_name, customer_email in rows
    ]


@router.patch("/{request_id}/action")
async def update_redemption_status(
    request_id: int,
    payload: RedemptionActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_jeweller),
):
    shop_ids_result = await db.execute(select(Shop.id).where(Shop.owner_id == current_user.id))
    shop_ids = [row[0] for row in shop_ids_result.all()]

    result = await db.execute(
        select(RedemptionRequest).where(
            RedemptionRequest.id == request_id,
            RedemptionRequest.shop_id.in_(shop_ids),
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Redemption request not found")

    if payload.status == RedemptionStatus.REJECTED:
        await LedgerService.credit(db, req.user_id, req.gold_grams)

    req.status = payload.status
    if payload.shop_notes is not None:
        req.shop_notes = payload.shop_notes

    return {"message": f"Redemption request {payload.status.value}"}
