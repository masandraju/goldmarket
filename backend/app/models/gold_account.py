from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.db.base import Base


class GoldAccount(Base):
    __tablename__ = "gold_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False, index=True)
    balance_grams: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    user: Mapped["User"] = relationship(back_populates="gold_account")
    ledger_entries: Mapped[list["LedgerEntry"]] = relationship(back_populates="account")
