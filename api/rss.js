let cache = new Map();
const TTL = 1000 * 90; // 90 seconds (good middle ground)

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing RSS url" });
  }

  const now = Date.now();

  // -------------------------
  // 1. CHECK CACHE
  // -------------------------
  const cached = cache.get(url);

  if (cached && (now - cached.timestamp < TTL)) {
    return res.status(200).json({
      contents: cached.contents,
      cached: true
    });
  }

  try {
    // -------------------------
    // 2. FETCH FRESH DATA
    // -------------------------
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const text = await response.text();

    // -------------------------
    // 3. UPDATE CACHE
    // -------------------------
    cache.set(url, {
      contents: text,
      timestamp: now
    });

    // optional cleanup (prevents memory bloat)
    if (cache.size > 50) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    // -------------------------
    // 4. RETURN RESPONSE
    // -------------------------
    res.status(200).json({
      contents: text,
      cached: false
    });

  } catch (err) {
    console.error("RSS proxy error:", err);

    // fallback to stale cache if available
    if (cached) {
      return res.status(200).json({
        contents: cached.contents,
        cached: true,
        stale: true
      });
    }

    res.status(500).json({
      error: "Failed to fetch RSS",
      details: err.message
    });
  }
}