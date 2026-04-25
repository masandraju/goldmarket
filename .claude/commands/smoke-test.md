Run a smoke test against the GoldMarket production API to verify all key endpoints are working.

Base URL: https://goldmarket-production.up.railway.app/api/v1

Run these checks in order and report pass/fail for each:

1. Health check
   GET https://goldmarket-production.up.railway.app/health
   Expect: {"status":"ok"}

2. Nearby shops (public endpoint)
   GET /shops/nearby?latitude=18.5204&longitude=73.8567&radius_km=10&limit=5
   Expect: HTTP 200, JSON array

3. Register a test user
   POST /auth/register
   Body: {"email":"smoketest_<timestamp>@test.com","phone":"99000<timestamp_last5>","full_name":"Smoke Test","password":"Test@1234","role":"customer"}
   Expect: HTTP 200, user_id returned

4. Login with that user
   POST /auth/login
   Body: {"email":"smoketest_<timestamp>@test.com","password":"Test@1234"}
   Expect: HTTP 200, access_token returned

5. Get gold balance (authenticated)
   GET /gold/balance  with Authorization: Bearer <token from step 4>
   Expect: HTTP 200, balance_grams field present

Report a final summary table: which endpoints passed, which failed, and any error messages.
Note: The test user created in step 3 will remain in the database — this is expected for a smoke test.
