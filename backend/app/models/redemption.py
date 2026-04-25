import enum
from sqlalchemy import Float, ForeignKey, Text, String, Enum as SAEnum
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.db.base import Base


class RedemptionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    READY = "ready"
    FULFILLED = "fulfilled"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class RedemptionRequest(Base):
    __tablename__ = "redemption_requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    shop_id: Mapped[int] = mapped_column(ForeignKey("shops.id"), nullable=False, index=True)
    gold_grams: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[RedemptionStatus] = mapped_column(SAEnum(RedemptionStatus), default=RedemptionStatus.PENDING)
    user_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    shop_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_item: Mapped[str | None] = mapped_column(String(255), nullable=True)

    user: Mapped["User"] = relationship(back_populates="redemption_requests")
    shop: Mapped["Shop"] = relationship(back_populates="redemption_requests")
