const express = require('express');
const cors = require('cors');
const proxy = require('express-http-proxy');

const app = express();

// Standard middleware
app.use(cors());

// Proxy routes (do not parse body before proxying with express-http-proxy)
app.use('/api/users', proxy('http://localhost:3001'));
app.use('/api/stocks', proxy('http://localhost:3002'));

// Base health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
});
