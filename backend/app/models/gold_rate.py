from sqlalchemy import Float, ForeignKey, Date, Boolean, String
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.db.base import Base
from datetime import date


class GoldRate(Base):
    __tablename__ = "gold_rates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    shop_id: Mapped[int] = mapped_column(ForeignKey("shops.id"), nullable=False, index=True)
    rate_per_gram_22k: Mapped[float] = mapped_column(Float, nullable=False)
    rate_per_gram_24k: Mapped[float] = mapped_column(Float, nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    is_manual_override: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    shop: Mapped["Shop"] = relationship(back_populates="gold_rates")
