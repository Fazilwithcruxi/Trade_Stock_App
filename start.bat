@echo off
echo ==============================================
echo Started booting StockTracker Microservices
echo ==============================================

echo [1] Starting API Gateway `...
cd api-gateway
start "API Gateway (Port 3000)" cmd /k "npm start"
cd ..

echo [2] Starting User Service (requires PostgreSQL) ...
cd user-service
start "User Service (Port 3001)" cmd /k "npm start"
cd ..

echo [3] Starting Stock Service (fetching from Yahoo Finance) ...
cd stock-service
start "Stock Service (Port 3002)" cmd /k "npm start"
cd ..

echo [4] Starting Alert Service (CRON Job checking thresholds) ...
cd alert-service
start "Alert Service (Port 3003)" cmd /k "npm start"
cd ..

echo [5] Starting Vite React Frontend ...
cd frontend
start "Frontend (Vite)" cmd /k "npm run dev"
cd ..

echo ==============================================
echo All services are launching in separate windows!
echo Please ensure that PostgreSQL is running locally on port 5432
echo with credentials postgres:postgres, and database "stock_tracker".
echo Alternatively, create a .env file in user-service and alert-service
echo to override DATABASE_URL.
echo ==============================================
pause
