from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.models.user import User
from app.models.shop import Shop, ShopStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.core.dependencies import require_customer, get_current_user
from app.services.gold_rate_service import GoldRateService
from app.services.ledger_service import LedgerService
from app.services.payment_service import payment_service
from pydantic import BaseModel

router = APIRouter(prefix="/gold", tags=["Gold Purchase"])


class BuyGoldRequest(BaseModel):
    shop_id: int
    amount_inr: float
    purity: str = "22k"


class VerifyPaymentRequest(BaseModel):
    transaction_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/buy/initiate")
async def initiate_gold_purchase(
    payload: BuyGoldRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_customer),
):
    if payload.amount_inr < 100:
        raise HTTPException(status_code=400, detail="Minimum purchase amount is ₹100")

    result = await db.execute(select(Shop).where(Shop.id == payload.shop_id))
    shop = result.scalar_one_or_none()
    if not shop or shop.status != ShopStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Shop not found or not approved")

    rate = await GoldRateService.get_today_rate(db, payload.shop_id)
    if not rate:
        raise HTTPException(status_code=400, detail="Shop has not set today's gold rate")

    rate_per_gram = rate.rate_per_gram_22k if payload.purity == "22k" else rate.rate_per_gram_24k
    gold_grams = GoldRateService.calculate_gold_grams(payload.amount_inr, rate_per_gram)

    # Create Razorpay order
    receipt = f"gold_buy_{current_user.id}_{payload.shop_id}"
    rz_order = await payment_service.create_order(
        amount_inr=payload.amount_inr,
        receipt=receipt,
        notes={"user_id": current_user.id, "shop_id": payload.shop_id},
    )

    txn = Transaction(
        user_id=current_user.id,
        shop_id=payload.shop_id,
        transaction_type=TransactionType.LUMPSUM_BUY,
        amount_inr=payload.amount_inr,
        gold_grams=gold_grams,
        rate_per_gram=rate_per_gram,
        status=TransactionStatus.PENDING,
        razorpay_order_id=rz_order["id"],
    )
    db.add(txn)
    await db.flush()

    return {
        "transaction_id": txn.id,
        "razorpay_order_id": rz_order["id"],
        "amount_inr": payload.amount_inr,
        "gold_grams": gold_grams,
        "rate_per_gram": rate_per_gram,
        "currency": "INR",
    }


@router.post("/buy/verify")
async def verify_gold_purchase(
    payload: VerifyPaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_customer),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == payload.transaction_id,
            Transaction.user_id == current_user.id,
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if txn.status != TransactionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Transaction already processed")

    if not payment_service.verify_signature(
        payload.razorpay_order_id,
        payload.razorpay_payment_id,
        payload.razorpay_signature,
    ):
        txn.status = TransactionStatus.FAILED
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    txn.status = TransactionStatus.COMPLETED
    txn.razorpay_payment_id = payload.razorpay_payment_id
    txn.razorpay_signature = payload.razorpay_signature
    await db.flush()

    await LedgerService.credit(db, current_user.id, txn.gold_grams, txn.id)

    balance = await LedgerService.get_balance(db, current_user.id)

    return {
        "message": "Payment successful. Gold credited to your account.",
        "gold_credited_grams": txn.gold_grams,
        "new_balance_grams": balance,
    }


@router.get("/balance")
async def get_gold_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_customer),
):
    balance = await LedgerService.get_balance(db, current_user.id)
    return {"user_id": current_user.id, "balance_grams": balance}


@router.get("/transactions")
async def get_my_transactions(
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_customer),
):
    result = await db.execute(
        select(Transaction, Shop.name.label("shop_name"))
        .join(Shop, Transaction.shop_id == Shop.id)
        .where(Transaction.user_id == current_user.id)
        .order_by(desc(Transaction.created_at))
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()
    return [
        {
            "id": txn.id,
            "shop_name": shop_name,
            "transaction_type": txn.transaction_type.value,
            "amount_inr": txn.amount_inr,
            "gold_grams": txn.gold_grams,
            "rate_per_gram": txn.rate_per_gram,
            "status": txn.status.value,
            "created_at": txn.created_at.isoformat(),
        }
        for txn, shop_name in rows
    ]
