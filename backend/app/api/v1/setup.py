from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.gold_account import GoldAccount
from app.core.security import hash_password
from app.core.config import settings

router = APIRouter(prefix="/setup", tags=["setup"])


class AdminSetupPayload(BaseModel):
    setup_token: str
    email: str
    phone: str
    full_name: str
    password: str


@router.post("/create-admin")
async def create_admin(payload: AdminSetupPayload, db: AsyncSession = Depends(get_db)):
    if payload.setup_token != settings.SETUP_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid setup token")

    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        phone=payload.phone,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=UserRole.SUPER_ADMIN,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    account = GoldAccount(user_id=user.id, balance_grams=0.0)
    db.add(account)
    await db.commit()

    return {"message": f"Admin '{payload.email}' created successfully"}
