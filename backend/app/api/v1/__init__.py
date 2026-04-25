from fastapi import APIRouter
from app.api.v1 import auth, shops, gold_rates, gold_purchase, emi, redemption, reviews, admin

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(shops.router)
api_router.include_router(gold_rates.router)
api_router.include_router(gold_purchase.router)
api_router.include_router(emi.router)
api_router.include_router(redemption.router)
api_router.include_router(reviews.router)
api_router.include_router(admin.router)
