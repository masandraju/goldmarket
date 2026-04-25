import enum
from sqlalchemy import Float, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.db.base import Base


class LedgerEntryType(str, enum.Enum):
    CREDIT = "credit"   # gold added
    DEBIT = "debit"     # gold removed (redemption)


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("gold_accounts.id"), nullable=False, index=True)
    transaction_id: Mapped[int | None] = mapped_column(ForeignKey("transactions.id"), nullable=True)
    entry_type: Mapped[LedgerEntryType] = mapped_column(SAEnum(LedgerEntryType), nullable=False)
    gold_grams: Mapped[float] = mapped_column(Float, nullable=False)
    balance_after: Mapped[float] = mapped_column(Float, nullable=False)

    account: Mapped["GoldAccount"] = relationship(back_populates="ledger_entries")
    transaction: Mapped["Transaction"] = relationship(back_populates="ledger_entry")
