# Stock Tracker App

A full-stack, microservices-based application built to securely track stock market prices, visualize historical data, and set intuitive price alerts.

## 🚀 Architecture

The application is structured into clearly defined microservices:

1. **Frontend (Vite/React)**: A stunning, glassmorphic UI built with React, Recharts, and Tailwind CSS.
2. **API Gateway (Node/Express)**: A fast `express-http-proxy` router orchestrating frontend requests to backend nodes.
3. **User Service (Node/PostgreSQL)**: Manages secure user authentication (JWT/bcrypt) and tracks persistent user watchlists and alerts in a local PostgreSQL database.
4. **Stock Service (Node/Yahoo Finance)**: Directly streams real-time stock prices and historical data using the `yahoo-finance2` API, handling both arrays of tickers and single chart data.
5. **Alert Service (Node/Cron)**: A dedicated background worker script evaluating real-time stock bounds against the database of pending alerts every minute via `node-cron`.

## 🛠️ Tech Stack
* **Frontend:** React, Vite, Tailwind CSS (v4), Recharts, Axios, React Router v7
* **Backend:** Node.js, Express, jsonwebtoken, Node-Cron, yahoo-finance2
* **Database:** PostgreSQL (pg)

## 📦 Getting Started

### Prerequisites
* **Node.js**: v18 or later.
* **PostgreSQL**: Install and ensure the service is running locally on port `5432`.
* *Note: The database credentials in the project default to `postgres` : `hussain6` and point to a database named `stock_tracker`.*

### Installation & Execution

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Fazilwithcruxi/Trade_Stock_App.git
   cd Trade_Stock_App
   ```

2. **Install dependencies:**
    The project requires dependencies for all 5 services. You must run `npm install` inside each folder: `frontend`, `api-gateway`, `user-service`, `stock-service`, and `alert-service`.

3. **Start the Microservices:**
    If you are on Windows, you can use the provided batch script to launch all 5 services automatically in separate terminal windows:
    ```bash
    .\start.bat
    ```
    *(Alternatively, you can manually run `npm start` in each backend directory, and `npm run dev` in the frontend directory).*

4. **Open the App:**
    Navigate to `http://localhost:5173` in your browser.

## 💡 Features
* **Watchlist Management**: Add tickers worldwide to keep an eye on real-time prices. 
* **Historical Data Charts**: View the last 30-days of market movement dynamically rendered.
* **Price Alerts**: Establish 'Above' or 'Below' thresholds and let the background worker notify you the moment your bounds are breached.
* **Secure Auth**: Safe, encrypted login via JWT to protect your watchlist data.
