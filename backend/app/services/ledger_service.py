from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.gold_account import GoldAccount
from app.models.ledger import LedgerEntry, LedgerEntryType
from fastapi import HTTPException, status


class LedgerService:

    @staticmethod
    async def get_or_create_account(db: AsyncSession, user_id: int) -> GoldAccount:
        result = await db.execute(select(GoldAccount).where(GoldAccount.user_id == user_id))
        account = result.scalar_one_or_none()
        if not account:
            account = GoldAccount(user_id=user_id, balance_grams=0.0)
            db.add(account)
            await db.flush()
        return account

    @staticmethod
    async def credit(
        db: AsyncSession,
        user_id: int,
        gold_grams: float,
        transaction_id: int | None = None,
    ) -> LedgerEntry:
        account = await LedgerService.get_or_create_account(db, user_id)
        account.balance_grams = round(account.balance_grams + gold_grams, 6)
        entry = LedgerEntry(
            account_id=account.id,
            transaction_id=transaction_id,
            entry_type=LedgerEntryType.CREDIT,
            gold_grams=gold_grams,
            balance_after=account.balance_grams,
        )
        db.add(entry)
        await db.flush()
        return entry

    @staticmethod
    async def debit(
        db: AsyncSession,
        user_id: int,
        gold_grams: float,
        transaction_id: int | None = None,
    ) -> LedgerEntry:
        account = await LedgerService.get_or_create_account(db, user_id)
        if account.balance_grams < gold_grams:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient gold balance. Available: {account.balance_grams:.4f}g, Required: {gold_grams:.4f}g",
            )
        account.balance_grams = round(account.balance_grams - gold_grams, 6)
        entry = LedgerEntry(
            account_id=account.id,
            transaction_id=transaction_id,
            entry_type=LedgerEntryType.DEBIT,
            gold_grams=gold_grams,
            balance_after=account.balance_grams,
        )
        db.add(entry)
        await db.flush()
        return entry

    @staticmethod
    async def get_balance(db: AsyncSession, user_id: int) -> float:
        account = await LedgerService.get_or_create_account(db, user_id)
        return account.balance_grams
