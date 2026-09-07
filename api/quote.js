/**
 * Vercel Serverless Function: /api/quote
 * Fetches real-time / closing market prices via Yahoo Finance API on the server side.
 * Bypasses browser CORS and public proxy rate limits with dedicated Edge caching.
 */
export default async function handler(req, res) {
  // Set permissive CORS headers for development/production parity
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { symbol } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing required query parameter: symbol'
    });
  }

  const cleanSymbol = symbol.trim().toUpperCase();

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}?interval=1d&range=5d`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const response = await fetch(yahooUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com/'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Upstream error with status ${response.status}`
      });
    }

    const data = await response.json();
    const resultObj = data?.chart?.result?.[0];

    if (!resultObj) {
      return res.status(404).json({
        success: false,
        error: `No price data found for symbol: ${cleanSymbol}`
      });
    }

    const meta = resultObj.meta;
    let price = meta?.regularMarketPrice || meta?.chartPreviousClose || meta?.previousClose;

    // Fallback to the latest valid closing price from the indicators series
    if ((!price || price <= 0) && resultObj.indicators?.quote?.[0]?.close) {
      const closes = resultObj.indicators.quote[0].close.filter(
        (c) => typeof c === 'number' && !isNaN(c) && c > 0
      );
      if (closes.length > 0) {
        price = closes[closes.length - 1];
      }
    }

    if (typeof price === 'number' && price > 0) {
      // Cache at edge for 5 minutes (300s), permit stale responses while revalidating for 10 minutes (600s)
      res.setHeader(
        'Cache-Control',
        's-maxage=300, stale-while-revalidate=600, public'
      );

      return res.status(200).json({
        success: true,
        symbol: cleanSymbol,
        price: Number(price.toFixed(2)),
        currency: meta?.currency || 'USD',
        timestamp: meta?.regularMarketTime || Math.floor(Date.now() / 1000)
      });
    }

    return res.status(404).json({
      success: false,
      error: `Could not parse valid price for symbol: ${cleanSymbol}`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error while querying quote'
    });
  }
}
