import hmac
import hashlib
import httpx
from app.core.config import settings

RAZORPAY_API = "https://api.razorpay.com/v1"


class PaymentService:

    async def create_order(self, amount_inr: float, receipt: str, notes: dict | None = None) -> dict:
        amount_paise = int(amount_inr * 100)
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{RAZORPAY_API}/orders",
                json={
                    "amount": amount_paise,
                    "currency": "INR",
                    "receipt": receipt,
                    "notes": notes or {},
                },
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            )
            response.raise_for_status()
            return response.json()

    def verify_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        expected = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, razorpay_signature)


payment_service = PaymentService()
