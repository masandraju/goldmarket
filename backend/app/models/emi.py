import enum
from sqlalchemy import Float, Integer, ForeignKey, Date, String, Enum as SAEnum
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.db.base import Base
from datetime import date


class EMIStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    DEFAULTED = "defaulted"
    CANCELLED = "cancelled"


class EMIPlan(Base):
    __tablename__ = "emi_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    shop_id: Mapped[int] = mapped_column(ForeignKey("shops.id"), nullable=False, index=True)

    total_amount_inr: Mapped[float] = mapped_column(Float, nullable=False)
    monthly_installment_inr: Mapped[float] = mapped_column(Float, nullable=False)
    total_installments: Mapped[int] = mapped_column(Integer, nullable=False)
    installments_paid: Mapped[int] = mapped_column(Integer, default=0)
    total_gold_grams: Mapped[float] = mapped_column(Float, nullable=False)
    gold_grams_accumulated: Mapped[float] = mapped_column(Float, default=0.0)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    next_due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[EMIStatus] = mapped_column(SAEnum(EMIStatus), default=EMIStatus.ACTIVE)

    razorpay_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    user: Mapped["User"] = relationship(back_populates="emi_plans")
    shop: Mapped["Shop"] = relationship(back_populates="emi_plans")
    payments: Mapped[list["EMIPayment"]] = relationship(back_populates="plan", order_by="EMIPayment.created_at")


class EMIPayment(Base):
    __tablename__ = "emi_payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("emi_plans.id"), nullable=False, index=True)
    amount_inr: Mapped[float] = mapped_column(Float, nullable=False)
    gold_grams: Mapped[float] = mapped_column(Float, nullable=False)
    rate_per_gram: Mapped[float] = mapped_column(Float, nullable=False)
    installment_number: Mapped[int] = mapped_column(Integer, nullable=False)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    plan: Mapped["EMIPlan"] = relationship(back_populates="payments")
