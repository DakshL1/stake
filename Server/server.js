// server.js

const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}))

// Scrapers
const { scrapeSharePrice } = require('./SharesCartScraper');
const { scrapeWWIShareByName } = require('./wwiplScraper');

app.use(express.json());


app.get('/api/:name', async (req, res) => {
    const shareName = req.params.name;

    if (!shareName || shareName.trim() === "") {
        return res.status(400).json({ 
            error: 'Missing share name. Example: /api/nse or /api/NSE India' 
        });
    }

    console.log(`\n[API] Searching for: ${shareName}`);

    const [sharescartResult, wwiplResult] = await Promise.all([
        scrapeSharePrice(shareName),
        scrapeWWIShareByName(shareName)
    ]);

    const responseData = {
        query: shareName,
        timestamp: new Date().toISOString(),

        sharesCart: {
            status: (sharescartResult && !sharescartResult.error) ? 'FOUND' : 'NOT_FOUND',
            data: (sharescartResult && !sharescartResult.error) ? sharescartResult : null
        },

        wwipl: {
            status: (wwiplResult && !wwiplResult.error) ? 'FOUND' : 'NOT_FOUND',
            data: (wwiplResult && !wwiplResult.error) ? wwiplResult : null
        },

        summary: `SharesCart: ${(sharescartResult && !sharescartResult.error) ? 'Found' : 'Missing'}, WWIPL: ${(wwiplResult && !wwiplResult.error) ? 'Found' : 'Missing'}`
    };

    res.status(200).json(responseData);
});

app.listen(port, () => {
  console.log(`\n✅ Server running at: http://localhost:${port}`);
});
