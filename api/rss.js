let cache = {};
let CACHE_TTL = 1000 * 60 * 2; // 2 minutes

export default async function handler(req, res) {

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing RSS url" });
  }

  const now = Date.now();

  // CHECK CACHE FIRST
  if (cache[url] && (now - cache[url].timestamp < CACHE_TTL)) {
    return res.status(200).json({
      contents: cache[url].data,
      cached: true
    });
  }

  try {

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const text = await response.text();

    // SAVE TO CACHE
    cache[url] = {
      data: text,
      timestamp: now
    };

    return res.status(200).json({
      contents: text,
      cached: false
    });

  } catch (err) {

    return res.status(500).json({
      error: "Failed to fetch RSS",
      details: err.message
    });
  }
}