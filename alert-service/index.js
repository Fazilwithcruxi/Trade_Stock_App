const cron = require('node-cron');
const axios = require('axios');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const STOCK_SERVICE_URL = process.env.STOCK_SERVICE_URL || 'http://localhost:3002';

console.log('Alert Service Started. Checking alerts every minute...');

// Run every minute
cron.schedule('* * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running alert check...`);
    try {
        // 1. Fetch pending alerts
        const alertsRes = await axios.get(`${USER_SERVICE_URL}/internal/alerts/pending`);
        const pendingAlerts = alertsRes.data;

        if (!pendingAlerts || pendingAlerts.length === 0) {
            console.log('No pending alerts.');
            return;
        }

        // 2. Get unique symbols to check
        const symbols = [...new Set(pendingAlerts.map(a => a.symbol))];

        // 3. Fetch current prices
        const pricesRes = await axios.post(`${STOCK_SERVICE_URL}/prices`, { symbols });
        const currentPrices = pricesRes.data;

        // Convert array to map for fast lookup
        const priceMap = {};
        currentPrices.forEach(cp => {
            priceMap[cp.symbol] = cp.price;
        });

        // 4. Evaluate alerts
        for (const alert of pendingAlerts) {
            const currentPrice = priceMap[alert.symbol];
            if (!currentPrice) continue;

            let triggered = false;
            const target = parseFloat(alert.target_price);

            if (alert.condition === 'above' && currentPrice >= target) {
                triggered = true;
            } else if (alert.condition === 'below' && currentPrice <= target) {
                triggered = true;
            }

            // 5. Trigger alert if condition met
            if (triggered) {
                console.log(`[ALERT] User ${alert.username}: ${alert.symbol} is now ${currentPrice} (Condition: ${alert.condition} ${target})`);
                try {
                    await axios.patch(`${USER_SERVICE_URL}/alerts/${alert.id}/trigger`);
                } catch (e) {
                    console.error(`Failed to mark alert ${alert.id} as triggered`);
                }
            }
        }
    } catch (err) {
        console.error('Error during alert check cycle:', err.message);
    }
});

// To keep the process alive and provide health check
const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'alert-service' }));
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Alert Service HTTP Server is running on port ${PORT}`);
});
