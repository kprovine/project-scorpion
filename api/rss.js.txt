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

    const text = await response.text();

    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(text);

  } catch (err) {

    res.status(500).json({
      error: "Failed to fetch RSS",
      details: err.message
    });
  }
}