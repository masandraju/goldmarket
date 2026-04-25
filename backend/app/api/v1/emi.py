from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.shop import Shop, ShopStatus
from app.models.emi import EMIPlan, EMIPayment, EMIStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.core.dependencies import require_customer
from app.services.gold_rate_service import GoldRateService
from app.services.ledger_service import LedgerService
from app.services.payment_service import payment_service
from pydantic import BaseModel
from datetime import date
from dateutil.relativedelta import relativedelta

router = APIRouter(prefix="/emi", tags=["EMI"])


class EMIPlanRequest(BaseModel):
    shop_id: int
    monthly_amount_inr: float
    total_months: int
    purity: str = "22k"


class EMIPaymentVerifyRequest(BaseModel):
    plan_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/create")
async def create_emi_plan(
    payload: EMIPlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_customer),
):
    if payload.monthly_amount_inr < 500:
        raise HTTPException(status_code=400, detail="Minimum monthly EMI is ₹500")
    if payload.total_months < 3 or payload.total_months > 36:
        raise HTTPException(status_code=400, detail="EMI duration must be 3–36 months")

    result = await db.execute(select(Shop).where(Shop.id == payload.shop_id))
    shop = result.scalar_one_or_none()
    if not shop or shop.status != ShopStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Shop not found or not approved")
    if not shop.accepts_emi:
        raise HTTPException(status_code=400, detail="This shop does not accept EMI plans")

    rate = await GoldRateService.get_today_rate(db, payload.shop_id)
    if not rate:
        raise HTTPException(status_code=400, detail="Shop has not set today's gold rate")

    rate_per_gram = rate.rate_per_gram_22k if payload.purity == "22k" else rate.rate_per_gram_24k
    total_amount = payload.monthly_amount_inr * payload.total_months
    total_gold = GoldRateService.calculate_gold_grams(total_amount, rate_per_gram)
    today = date.today()

    plan = EMIPlan(
        user_id=current_user.id,
        shop_id=payload.shop_id,
        total_amount_inr=total_amount,
        monthly_installment_inr=payload.monthly_amount_inr,
        total_installments=payload.total_months,
        installments_paid=0,
        total_gold_grams=total_gold,
        gold_grams_accumulated=0.0,
        start_date=today,
        next_due_date=today,
        status=EMIStatus.ACTIVE,
    )
    db.add(plan)
    await db.flush()

    return {
        "plan_id": plan.id,
        "total_amount_inr": total_amount,
        "monthly_installment_inr": payload.monthly_amount_inr,
        "total_months": payload.total_months,
        "estimated_total_gold_grams": total_gold,
        "next_due_date": str(today),
        "message": "EMI plan created. Pay your first installment to activate.",
    }


@router.post("/pay/initiate")
async def initiate_emi_payment(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_customer),
):
    result = await db.execute(
        select(EMIPlan).where(EMIPlan.id == plan_id, EMIPlan.user_id == current_user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="EMI plan not found")
    if plan.status != EMIStatus.ACTIVE:
        raise HTTPException(status_code=400, detail=f"Plan is {plan.status.value}")
    if plan.installments_paid >= plan.total_installments:
        raise HTTPException(status_code=400, detail="All installments already paid")

    receipt = f"emi_{plan.id}_{plan.installments_paid + 1}"
    rz_order = await payment_service.create_order(
        amount_inr=plan.monthly_installment_inr,
        receipt=receipt,
    )

    return {
        "plan_id": plan.id,
        "razorpay_order_id": rz_order["id"],
        "amount_inr": plan.monthly_installment_inr,
        "installment_number": plan.installments_paid + 1,
        "currency": "INR",
    }


@router.post("/pay/verify")
async def verify_emi_payment(
    payload: EMIPaymentVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_customer),
):
    result = await db.execute(
        select(EMIPlan).where(EMIPlan.id == payload.plan_id, EMIPlan.user_id == current_user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="EMI plan not found")

    if not payment_service.verify_signature(
        payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature
    ):
        raise HTTPException(status_code=400, detail="Payment verification failed")

    rate = await GoldRateService.get_today_rate(db, plan.shop_id)
    rate_per_gram = rate.rate_per_gram_22k if rate else (plan.total_amount_inr / plan.total_gold_grams)
    gold_this_installment = GoldRateService.calculate_gold_grams(plan.monthly_installment_inr, rate_per_gram)

    installment_num = plan.installments_paid + 1

    # Create transaction
    txn = Transaction(
        user_id=current_user.id,
        shop_id=plan.shop_id,
        transaction_type=TransactionType.EMI_PAYMENT,
        amount_inr=plan.monthly_installment_inr,
        gold_grams=gold_this_installment,
        rate_per_gram=rate_per_gram,
        status=TransactionStatus.COMPLETED,
        razorpay_payment_id=payload.razorpay_payment_id,
    )
    db.add(txn)
    await db.flush()

    db.add(EMIPayment(
        plan_id=plan.id,
        amount_inr=plan.monthly_installment_inr,
        gold_grams=gold_this_installment,
        rate_per_gram=rate_per_gram,
        installment_number=installment_num,
        razorpay_payment_id=payload.razorpay_payment_id,
    ))

    plan.installments_paid += 1
    plan.gold_grams_accumulated = round(plan.gold_grams_accumulated + gold_this_installment, 6)
    plan.next_due_date = date.today() + relativedelta(months=1)

    if plan.installments_paid >= plan.total_installments:
        plan.status = EMIStatus.COMPLETED

    await db.flush()
    await LedgerService.credit(db, current_user.id, gold_this_installment, txn.id)

    return {
        "message": f"Installment {installment_num}/{plan.total_installments} paid successfully",
        "gold_credited_grams": gold_this_installment,
        "total_accumulated_grams": plan.gold_grams_accumulated,
        "installments_remaining": plan.total_installments - plan.installments_paid,
        "plan_status": plan.status.value,
    }


@router.get("/my-plans")
async def get_my_emi_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_customer),
):
    result = await db.execute(
        select(EMIPlan, Shop.name.label("shop_name"))
        .join(Shop, EMIPlan.shop_id == Shop.id)
        .where(EMIPlan.user_id == current_user.id)
        .order_by(EMIPlan.id.desc())
    )
    rows = result.all()
    return [
        {
            "plan_id": p.id,
            "shop_id": p.shop_id,
            "shop_name": shop_name,
            "monthly_installment_inr": p.monthly_installment_inr,
            "installments_paid": p.installments_paid,
            "total_installments": p.total_installments,
            "gold_accumulated_grams": p.gold_grams_accumulated,
            "total_gold_grams": p.total_gold_grams,
            "next_due_date": str(p.next_due_date),
            "status": p.status.value,
        }
        for p, shop_name in rows
    ]
