export default async function handler(req, res) {

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing RSS url" });
  }

  try {

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const xmlText = await response.text();

    return res.status(200).json({
      contents: xmlText
    });

  } catch (err) {

    return res.status(500).json({
      error: "Failed to fetch RSS",
      details: err.message
    });
  }
}