"""
Run once to create the super admin account.
Usage: py create_admin.py
"""
import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password

ADMIN_EMAIL = "admin@goldmarket.in"
ADMIN_PHONE = "0000000000"
ADMIN_NAME = "GoldMarket Admin"
ADMIN_PASSWORD = "Admin@12345"


async def main():
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        if existing.scalar_one_or_none():
            print(f"Admin already exists: {ADMIN_EMAIL}")
            return

        admin = User(
            email=ADMIN_EMAIL,
            phone=ADMIN_PHONE,
            full_name=ADMIN_NAME,
            hashed_password=hash_password(ADMIN_PASSWORD),
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print("✓ Admin account created")
        print(f"  Email:    {ADMIN_EMAIL}")
        print(f"  Password: {ADMIN_PASSWORD}")
        print("  Change the password after first login!")


asyncio.run(main())
