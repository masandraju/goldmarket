import enum
from sqlalchemy import String, Boolean, Float, Integer, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.db.base import Base


class ShopStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class Shop(Base):
    __tablename__ = "shops"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False, default="Maharashtra")
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(15), nullable=True)
    status: Mapped[ShopStatus] = mapped_column(SAEnum(ShopStatus), default=ShopStatus.PENDING)
    avg_rating: Mapped[float] = mapped_column(Float, default=0.0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    accepts_emi: Mapped[bool] = mapped_column(Boolean, default=False)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="shop")
    services: Mapped[list["ShopService"]] = relationship(back_populates="shop", cascade="all, delete-orphan")
    gold_rates: Mapped[list["GoldRate"]] = relationship(back_populates="shop", order_by="GoldRate.effective_date.desc()")
    inventory: Mapped[list["InventoryItem"]] = relationship(back_populates="shop")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="shop")
    emi_plans: Mapped[list["EMIPlan"]] = relationship(back_populates="shop")
    redemption_requests: Mapped[list["RedemptionRequest"]] = relationship(back_populates="shop")
    reviews: Mapped[list["Review"]] = relationship(back_populates="shop")


class ShopService(Base):
    __tablename__ = "shop_services"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    shop_id: Mapped[int] = mapped_column(ForeignKey("shops.id"), nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(100), nullable=False)

    shop: Mapped["Shop"] = relationship(back_populates="services")
