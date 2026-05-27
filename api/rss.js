let cache = new Map();
const CACHE_TTL = 1000 * 60 * 2; // 2 minutes

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      xml: null,
      error: "Missing RSS url",
      cached: false
    });
  }

  const now = Date.now();
  const cached = cache.get(url);

  // -------------------------
  // 1. CACHE HIT (FRESH)
  // -------------------------
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return res.status(200).json({
      xml: cached.data,
      cached: true,
      stale: false
    });
  }

  try {
    // -------------------------
    // 2. FETCH RSS
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
    // 3. BASIC VALIDATION
    // -------------------------
    if (!text || !text.includes("<item")) {
      throw new Error("Invalid RSS payload received");
    }

    // -------------------------
    // 4. STORE CACHE
    // -------------------------
    cache.set(url, {
      data: text,
      timestamp: now
    });

    // -------------------------
    // 5. RETURN SUCCESS
    // -------------------------
    return res.status(200).json({
      xml: text,
      cached: false,
      stale: false
    });

  } catch (err) {
    console.error("RSS ERROR:", err);

    // -------------------------
    // 6. STALE FALLBACK
    // -------------------------
    if (cached) {
      return res.status(200).json({
        xml: cached.data,
        cached: true,
        stale: true
      });
    }

    // -------------------------
    // 7. HARD FAILURE
    // -------------------------
    return res.status(500).json({
      xml: null,
      error: err.message,
      cached: false
    });
  }
}