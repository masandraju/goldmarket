import enum
from sqlalchemy import String, Float, Integer, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.db.base import Base


class TransactionType(str, enum.Enum):
    LUMPSUM_BUY = "lumpsum_buy"
    EMI_PAYMENT = "emi_payment"
    REDEMPTION = "redemption"
    REFUND = "refund"


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    shop_id: Mapped[int] = mapped_column(ForeignKey("shops.id"), nullable=False, index=True)
    transaction_type: Mapped[TransactionType] = mapped_column(SAEnum(TransactionType), nullable=False, index=True)
    amount_inr: Mapped[float] = mapped_column(Float, nullable=False)
    gold_grams: Mapped[float] = mapped_column(Float, nullable=False)
    rate_per_gram: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(SAEnum(TransactionStatus), default=TransactionStatus.PENDING)

    # Razorpay fields
    razorpay_order_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    razorpay_signature: Mapped[str | None] = mapped_column(String(255), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="transactions")
    shop: Mapped["Shop"] = relationship(back_populates="transactions")
    ledger_entry: Mapped["LedgerEntry"] = relationship(back_populates="transaction", uselist=False)
