// Vercel Serverless Function: Download Audio Stream Proxy
// Fetches external audio files (e.g. from Hugging Face or any upstream TTS) server-side to bypass CORS
// and returns them with full CORS headers so the browser can convert them to Blobs and upload to Google Drive.

module.exports = async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.statusCode = 200;
      return res.end();
    }

    const rawUrl = (req.query.url || "").trim();
    if (!rawUrl) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.end(JSON.stringify({ error: "Missing url parameter" }));
    }

    const upstreamResp = await fetch(rawUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "*/*"
      },
      redirect: "follow"
    });

    if (!upstreamResp.ok) {
      res.statusCode = upstreamResp.status;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.end(JSON.stringify({ error: `Upstream error: ${upstreamResp.status}` }));
    }

    const contentType = upstreamResp.headers.get("content-type") || "audio/mpeg";
    const contentLength = upstreamResp.headers.get("content-length");

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    const arrayBuffer = await upstreamResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.end(buffer);
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify({ error: err.message || "Failed to download audio" }));
    }
  }
};
