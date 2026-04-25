@echo off
echo ================================================
echo   GoldMarket - Starting Local Dev Environment
echo ================================================

echo.
echo [1/4] Starting PostgreSQL and Redis via Docker...
docker-compose up -d
timeout /t 5 /nobreak > nul

echo.
echo [2/4] Setting up Python virtual environment...
cd backend
if not exist venv (
    py -m venv venv
    echo Virtual environment created.
)
call venv\Scripts\activate.bat

echo.
echo [3/4] Installing Python dependencies...
pip install -r requirements.txt --quiet

echo.
echo [4/4] Running database migrations...
alembic upgrade head

echo.
echo ================================================
echo   Server starting at http://localhost:8000
echo   API Docs at    http://localhost:8000/docs
echo ================================================
uvicorn main:app --reload --host 0.0.0.0 --port 8000
