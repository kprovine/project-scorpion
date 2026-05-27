let cache = {};
let CACHE_TTL = 1000 * 60 * 2; // 2 minutes

export default async function handler(req, res) {

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing RSS url" });
  }

  const now = Date.now();

  // -------------------------
  // 1. CACHE HIT
  // -------------------------
  if (cache[url] && (now - cache[url].timestamp < CACHE_TTL)) {
    return res.status(200).json({
      contents: cache[url].data,
      cached: true
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
    // 3. SAVE CACHE
    // -------------------------
    cache[url] = {
      data: text,
      timestamp: now
    };

    // -------------------------
    // 4. RETURN
    // -------------------------
    return res.status(200).json({
      contents: text,
      cached: false
    });

  } catch (err) {

    console.error("RSS ERROR:", err);

    // -------------------------
    // 5. STALE FALLBACK (IMPORTANT)
    // -------------------------
    if (cache[url]) {
      return res.status(200).json({
        contents: cache[url].data,
        cached: true,
        stale: true
      });
    }

    return res.status(500).json({
      error: "Failed to fetch RSS",
      details: err.message
    });
  }
}