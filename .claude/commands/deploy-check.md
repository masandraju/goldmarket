Check the health of both GoldMarket production services:

1. Run: curl -s https://goldmarket-production.up.railway.app/health
   - Expect: {"status":"ok","app":"GoldMarket","env":"production"}
   - If anything else — report it as an error

2. Run: curl -s -o /dev/null -w "%{http_code}" https://goldmarket-ruby.vercel.app
   - Expect: 200
   - If anything else — report it as an error

3. Run: curl -s https://goldmarket-production.up.railway.app/api/v1/shops/nearby?latitude=18.5204&longitude=73.8567&radius_km=10&limit=5
   - Expect: a JSON array (even if empty)
   - If error — report it

Report a clear summary: which services are UP, which are DOWN, and any error details.
