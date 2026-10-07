// Vercel Serverless Function: High-Quality Arabic TTS Streaming
// Streams genuine audio/mpeg without CORS or Referer restrictions, with global CDN caching

module.exports = async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.statusCode = 200;
      return res.end();
    }

    const text = (req.query.q || req.query.text || "").trim();
    if (!text) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Missing text parameter" }));
    }

    const lang = req.query.tl || "ar";
    // Truncate to safe limit for upstream Google TTS (max ~180 chars)
    const safeText = text.substring(0, 200);
    const upstreamUrl = "https://translate.google.com/translate_tts?ie=UTF-8&tl=" + 
      encodeURIComponent(lang) + 
      "&client=tw-ob&q=" + 
      encodeURIComponent(safeText);

    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*"
      }
    });

    if (!upstreamResponse.ok) {
      res.statusCode = upstreamResponse.status;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Upstream TTS service returned " + upstreamResponse.status }));
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Global caching: CDN caches audio chunks for 7 days so repeats are 0ms instant
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.statusCode = 200;
    return res.end(buffer);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: err.message || "TTS serverless function failed" }));
  }
};
