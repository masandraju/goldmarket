from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.review import Review
from app.models.shop import Shop
from app.models.user import User
from app.core.dependencies import require_customer, get_current_user
from pydantic import BaseModel, Field

router = APIRouter(prefix="/reviews", tags=["Reviews"])


class ReviewCreateRequest(BaseModel):
    shop_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = None


@router.post("/", status_code=201)
async def create_review(
    payload: ReviewCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_customer),
):
    existing = await db.execute(
        select(Review).where(Review.user_id == current_user.id, Review.shop_id == payload.shop_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already reviewed this shop")

    review = Review(
        user_id=current_user.id,
        shop_id=payload.shop_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    await db.flush()

    # Update shop aggregate rating
    stats = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(Review.shop_id == payload.shop_id)
    )
    avg_rating, count = stats.one()
    shop_result = await db.execute(select(Shop).where(Shop.id == payload.shop_id))
    shop = shop_result.scalar_one_or_none()
    if shop:
        shop.avg_rating = round(float(avg_rating or 0), 2)
        shop.review_count = count

    return {"message": "Review submitted", "review_id": review.id}


@router.get("/my-review/{shop_id}")
async def get_my_review(
    shop_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Review).where(Review.shop_id == shop_id, Review.user_id == current_user.id)
    )
    review = result.scalar_one_or_none()
    if not review:
        return None
    return {"id": review.id, "rating": review.rating, "comment": review.comment}


@router.get("/{shop_id}")
async def get_shop_reviews(shop_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review, User.full_name.label("reviewer_name"))
        .join(User, Review.user_id == User.id)
        .where(Review.shop_id == shop_id)
        .order_by(Review.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": r.id,
            "reviewer_name": reviewer_name,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat(),
        }
        for r, reviewer_name in rows
    ]
