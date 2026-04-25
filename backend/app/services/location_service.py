import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.shop import Shop, ShopStatus


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def get_nearby_shops(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    radius_km: float = 10.0,
    min_rating: float | None = None,
    city: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    query = (
        select(Shop)
        .where(Shop.status == ShopStatus.APPROVED)
        .options(selectinload(Shop.services))
    )
    if city:
        query = query.where(Shop.city.ilike(f"%{city}%"))

    result = await db.execute(query)
    shops = result.scalars().all()

    shops_with_distance = []
    for shop in shops:
        dist = haversine_distance(latitude, longitude, shop.latitude, shop.longitude)
        if dist <= radius_km:
            if min_rating and shop.avg_rating < min_rating:
                continue
            shops_with_distance.append({"shop": shop, "distance_km": round(dist, 2)})

    shops_with_distance.sort(key=lambda x: x["distance_km"])
    return shops_with_distance[offset: offset + limit]
