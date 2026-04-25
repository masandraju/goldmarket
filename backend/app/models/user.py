import enum
from sqlalchemy import String, Boolean, Enum as SAEnum
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.db.base import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    CUSTOMER = "customer"
    JEWELLER = "jeweller"


class KYCStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(15), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    kyc_status: Mapped[KYCStatus] = mapped_column(SAEnum(KYCStatus), default=KYCStatus.PENDING)
    pan_number: Mapped[str | None] = mapped_column(String(10), nullable=True)
    aadhaar_last4: Mapped[str | None] = mapped_column(String(4), nullable=True)

    # Relationships
    gold_account: Mapped["GoldAccount"] = relationship(back_populates="user", uselist=False)
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")
    emi_plans: Mapped[list["EMIPlan"]] = relationship(back_populates="user")
    redemption_requests: Mapped[list["RedemptionRequest"]] = relationship(back_populates="user")
    reviews: Mapped[list["Review"]] = relationship(back_populates="user")
    shop: Mapped["Shop"] = relationship(back_populates="owner", uselist=False)
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")
