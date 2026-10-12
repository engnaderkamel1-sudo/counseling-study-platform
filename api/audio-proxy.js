// Vercel Serverless Function: Google Drive Audio Stream Proxy
// Pipes Google Drive audio chunks directly to HTML5 audio element with HTTP 206 Range support and auto MIME sniffing

const { Readable } = require("stream");

// Global in-memory cache for audio MIME types per file ID
const mimeCache = new Map();

module.exports = async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, Accept");
      res.statusCode = 200;
      return res.end();
    }

    const fileId = (req.query.id || "").trim();
    if (!fileId || !/^[a-zA-Z0-9_-]{10,120}$/.test(fileId)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.end(JSON.stringify({ error: "Invalid or missing file id parameter" }));
    }

    const candidates = [
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
      `https://docs.google.com/uc?export=download&confirm=t&id=${fileId}`,
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      `https://lh3.googleusercontent.com/d/${fileId}`
    ];

    const fetchHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "*/*"
    };

    if (req.headers.range) {
      fetchHeaders["Range"] = req.headers.range;
    }

    let chosenResp = null;

    for (const url of candidates) {
      try {
        const resp = await fetch(url, {
          headers: fetchHeaders,
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
            const retryResp = await fetch(nextUrl, {
              headers: fetchHeaders,
              redirect: "follow"
            });
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

    res.statusCode = chosenResp.status === 206 ? 206 : 200;
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, Accept");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");

    const contentRange = chosenResp.headers.get("content-range");
    if (contentRange) {
      res.setHeader("Content-Range", contentRange);
    }

    const contentLength = chosenResp.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    let finalCType = req.query.type ? (req.query.type.includes("/") ? req.query.type : `audio/${req.query.type}`) : mimeCache.get(fileId);

    if (req.method === "HEAD") {
      res.setHeader("Content-Type", finalCType || "audio/wav");
      return res.end();
    }

    const nodeStream = Readable.fromWeb(chosenResp.body);

    req.on("close", () => {
      try { nodeStream.destroy(); } catch (e) {}
    });

    let isFirst = true;
    for await (const chunk of nodeStream) {
      if (isFirst) {
        isFirst = false;
        if (!finalCType) {
          if (chunk.length >= 4 && chunk[0] === 0x52 && chunk[1] === 0x49 && chunk[2] === 0x46 && chunk[3] === 0x46) {
            // RIFF WAVE header -> PCM audio/wav
            finalCType = "audio/wav";
          } else if ((chunk.length >= 3 && chunk[0] === 0x49 && chunk[1] === 0x44 && chunk[2] === 0x33) ||
                     (chunk.length >= 2 && chunk[0] === 0xFF && (chunk[1] & 0xE0) === 0xE0)) {
            // ID3 tag or MP3 sync frame
            finalCType = "audio/mpeg";
          } else if (chunk.length >= 4 && chunk[0] === 0x4F && chunk[1] === 0x67 && chunk[2] === 0x67 && chunk[3] === 0x53) {
            // Ogg header
            finalCType = "audio/ogg";
          } else {
            const rawCT = chosenResp.headers.get("content-type") || "";
            finalCType = (rawCT && !rawCT.includes("text/html")) ? rawCT : "audio/wav";
          }
          mimeCache.set(fileId, finalCType);
        }
        res.setHeader("Content-Type", finalCType);
      }
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify({ error: err.message || "Proxy failure" }));
    }
  }
};