Create and apply a new Alembic database migration for GoldMarket.

Steps:
1. Ask the user: "What changed in the models? (brief description for the migration name)"
2. Navigate to the backend directory
3. Activate the venv: venv\Scripts\activate (Windows) or source venv/bin/activate (Mac/Linux)
4. Auto-generate the migration:
   alembic revision --autogenerate -m "<description from user>"
5. Show the user the generated file in backend/alembic/versions/ and ask them to review it
6. Ask: "Looks good to apply locally? (yes/no)"
7. If yes: alembic upgrade head
8. Confirm success and remind the user:
   - Commit the new migration file to git
   - Railway will auto-apply it on next deploy (alembic upgrade head runs at container startup)
