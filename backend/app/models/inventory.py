import enum
from sqlalchemy import String, Float, Integer, Boolean, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.db.base import Base


class GoldPurity(str, enum.Enum):
    K18 = "18k"
    K22 = "22k"
    K24 = "24k"


class ItemCategory(str, enum.Enum):
    RING = "ring"
    CHAIN = "chain"
    NECKLACE = "necklace"
    BRACELET = "bracelet"
    EARRING = "earring"
    BANGLE = "bangle"
    PENDANT = "pendant"
    COIN = "coin"
    BAR = "bar"
    OTHER = "other"


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    shop_id: Mapped[int] = mapped_column(ForeignKey("shops.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[ItemCategory] = mapped_column(SAEnum(ItemCategory), nullable=False, index=True)
    purity: Mapped[GoldPurity] = mapped_column(SAEnum(GoldPurity), nullable=False)
    weight_grams: Mapped[float] = mapped_column(Float, nullable=False)
    making_charges: Mapped[float] = mapped_column(Float, default=0.0)
    stock_count: Mapped[int] = mapped_column(Integer, default=1)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    shop: Mapped["Shop"] = relationship(back_populates="inventory")
