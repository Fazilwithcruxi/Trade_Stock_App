const express = require('express');
const cors = require('cors');
// using require for yahoo-finance2
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'stock-service' }));

// Helper to append .NS suffix for Indian Stocks if they don't have a suffix
const formatSymbol = (sym) => sym;

// Helper to strip suffix for the frontend display
const displaySymbol = (sym) => sym;

app.get('/price/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const querySymbol = formatSymbol(symbol);
        const quote = await yahooFinance.quote(querySymbol);
        if (!quote) return res.status(404).json({ error: 'Stock not found' });

        res.json({
            symbol: displaySymbol(quote.symbol),
            price: quote.regularMarketPrice,
            currency: quote.currency,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            time: quote.regularMarketTime
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stock price', details: err.message });
    }
});

app.post('/prices', async (req, res) => {
    try {
        const { symbols } = req.body;
        if (!symbols || !Array.isArray(symbols)) {
            return res.status(400).json({ error: 'Invalid symbols array' });
        }

        const validQuotes = [];
        const querySymbols = symbols.map(formatSymbol);

        try {
            // yahooFinance.quote can accept an array of symbols to fetch them in bulk
            const quotes = await yahooFinance.quote(querySymbols);

            // It might return a single object or an array, make sure we handle it
            const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

            for (const q of quotesArray) {
                if (q) {
                    validQuotes.push({
                        symbol: displaySymbol(q.symbol),
                        price: q.regularMarketPrice,
                        change: q.regularMarketChange,
                        changePercent: q.regularMarketChangePercent
                    });
                }
            }
        } catch (e) {
            console.error(`Error fetching bulk quotes: ${e.message}`);
        }

        res.json(validQuotes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch multiple stock prices', details: err.message });
    }
});

app.get('/historical/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const querySymbol = formatSymbol(symbol);

        // Default: 1 month ago
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const period1 = req.query.start || oneMonthAgo.toISOString().split('T')[0];
        const period2 = req.query.end || new Date().toISOString().split('T')[0];

        const queryOptions = { period1, period2, interval: '1d' };
        const result = await yahooFinance.chart(querySymbol, queryOptions);
        res.json(result.quotes || []);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch historical data', details: err.message });
    }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Stock Service is running on port ${PORT}`);
});
