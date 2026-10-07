// Vercel Serverless Function: Google Drive Audio Stream Proxy
// Pipes Google Drive audio chunks directly to HTML5 audio element without CORS or buffer size limits

const { Readable } = require("stream");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
      res.statusCode = 200;
      return res.end();
    }

    const fileId = (req.query.id || "").trim();
    if (!fileId) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.end(JSON.stringify({ error: "Missing file id parameter" }));
    }

    const candidates = [
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
      `https://docs.google.com/uc?export=download&confirm=t&id=${fileId}`,
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      `https://lh3.googleusercontent.com/d/${fileId}`
    ];

    let chosenResp = null;

    for (const url of candidates) {
      try {
        const resp = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "*/*"
          },
          redirect: "follow"
        });

        const cType = resp.headers.get("content-type") || "";
        if (resp.ok && !cType.includes("text/html")) {
          chosenResp = resp;
          break;
        } else if (resp.ok && cType.includes("text/html")) {
          const html = await resp.text();
          const match = html.match(/href="(\/uc\?export=download[^"]+)"/) || html.match(/href="(https:\/\/drive\.google\.com\/uc\?export=download[^"]+)"/);
          if (match && match[1]) {
            const nextUrl = match[1].startsWith("http") ? match[1] : ("https://docs.google.com" + match[1]);
            const retryResp = await fetch(nextUrl, { redirect: "follow" });
            const rType = retryResp.headers.get("content-type") || "";
            if (retryResp.ok && !rType.includes("text/html")) {
              chosenResp = retryResp;
              break;
            }
          }
        }
      } catch (e) {}
    }

    if (!chosenResp || !chosenResp.body) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.end(JSON.stringify({ error: "Could not stream file from Google Drive" }));
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");

    const contentLength = chosenResp.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    const nodeStream = Readable.fromWeb(chosenResp.body);
    nodeStream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify({ error: err.message || "Proxy failure" }));
    }
  }
};