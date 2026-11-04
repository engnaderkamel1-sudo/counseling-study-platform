// Vercel Serverless Function: YouTube Transcript Extractor
// Extracts, cleans, and formats YouTube captions into timestamped paragraphs

function extractYouTubeId(url) {
  if (!url) return null;
  const str = String(url).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+?&v=))([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = str.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
}

function cleanSubText(t) {
  if (!t) return "";
  return t
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rlm;/g, "")
    .replace(/&lrm;/g, "")
    .replace(/&#x200E;/g, "")
    .replace(/&#x200F;/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\[موسيقى\]/g, "")
    .replace(/\[تصفيق\]/g, "")
    .replace(/\[ضحك\]/g, "")
    .replace(/\[صوت\]/g, "")
    .replace(/>>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function groupIntoParagraphs(chunks) {
  if (!chunks || !chunks.length) return "";
  const paragraphs = [];
  let currentWords = [];
  let currentStartMs = chunks[0].startMs;

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const text = cleanSubText(c.text);
    if (!text) continue;

    currentWords.push(text);

    const wordCount = currentWords.join(" ").split(/\s+/).length;
    const timeDeltaMs = c.startMs - currentStartMs;

    // Split paragraph every ~60-80 words or after a pause > 40 seconds
    if (wordCount >= 70 || timeDeltaMs >= 45000) {
      paragraphs.push(`⏱️ [${formatTime(currentStartMs)}]\n${currentWords.join(" ")}`);
      currentWords = [];
      if (i + 1 < chunks.length) {
        currentStartMs = chunks[i + 1].startMs;
      }
    }
  }

  if (currentWords.length) {
    paragraphs.push(`⏱️ [${formatTime(currentStartMs)}]\n${currentWords.join(" ")}`);
  }

  return paragraphs.join("\n\n");
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  try {
    const rawUrl = req.query.url || req.query.id || req.body?.url || req.body?.id;
    const videoId = extractYouTubeId(rawUrl);

    if (!videoId) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({
        success: false,
        error: "رابط فيديو يوتيوب غير صالح أو غير محدد."
      }));
    }

    let captionTracks = [];

    // Method 1: Query YouTube Innertube API
    try {
      const innertubeResp = await fetch("https://www.youtube.com/youtubei/v1/player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        },
        body: JSON.stringify({
          context: {
            client: {
              hl: "ar",
              gl: "EG",
              clientName: "WEB",
              clientVersion: "2.20240401.01.00"
            }
          },
          videoId: videoId
        })
      });

      if (innertubeResp.ok) {
        const pData = await innertubeResp.json();
        captionTracks = pData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      }
    } catch (eInner) {
      console.warn("Innertube API fetch error:", eInner.message);
    }

    // Method 2: Watch page scraping fallback if Innertube did not yield tracks
    if (!captionTracks.length) {
      try {
        const watchResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "ar,en;q=0.9"
          }
        });
        if (watchResp.ok) {
          const html = await watchResp.text();
          const match = html.match(/"captionTracks":\s*(\[.*?\])/);
          if (match) {
            captionTracks = JSON.parse(match[1]);
          }
        }
      } catch (eWatch) {
        console.warn("Watch page scrape fallback error:", eWatch.message);
      }
    }

    if (!captionTracks || !captionTracks.length) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({
        success: false,
        error: "لم يتم العثور على مسارات ترجمة أو تفريغ صوتي مسجل لهذا الفيديو على يوتيوب."
      }));
    }

    // Prefer Arabic, then auto-generated Arabic, then English, then first available
    let chosen = captionTracks.find(t => t.languageCode === "ar" || (t.vssId && t.vssId.includes(".ar")));
    if (!chosen) {
      chosen = captionTracks.find(t => (t.name?.simpleText && t.name.simpleText.includes("عربي")) || t.languageCode?.startsWith("ar"));
    }
    if (!chosen) {
      chosen = captionTracks[0];
    }

    const subBaseUrl = chosen.baseUrl;
    let chunks = [];

    // Try fetching JSON3 format
    try {
      const jsonUrl = subBaseUrl.includes("fmt=json3") ? subBaseUrl : (subBaseUrl + "&fmt=json3");
      const subResp = await fetch(jsonUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (subResp.ok) {
        const subData = await subResp.json();
        const events = subData.events || [];
        for (const ev of events) {
          if (!ev.segs) continue;
          const text = ev.segs.map(s => s.utf8 || "").join("");
          if (text.trim()) {
            chunks.push({
              startMs: ev.tStartMs || 0,
              durMs: ev.dDurationMs || 0,
              text: text
            });
          }
        }
      }
    } catch (eSubJson) {
      console.warn("Sub JSON3 fetch failed, will try XML fallback:", eSubJson.message);
    }

    // If json3 failed, try XML
    if (!chunks.length) {
      try {
        const xmlResp = await fetch(subBaseUrl, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (xmlResp.ok) {
          const xml = await xmlResp.text();
          const regex = /<text start="([\d\.]+)" dur="([\d\.]+)".*?>(.*?)<\/text>/g;
          let m;
          while ((m = regex.exec(xml)) !== null) {
            chunks.push({
              startMs: Math.round(parseFloat(m[1]) * 1000),
              durMs: Math.round(parseFloat(m[2]) * 1000),
              text: m[3]
            });
          }
        }
      } catch (eXml) {
        console.warn("XML sub fallback failed:", eXml.message);
      }
    }

    if (!chunks.length) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({
        success: false,
        error: "تعذر قراءة نصوص الترجمة من مسار يوتيوب لهذا الفيديو."
      }));
    }

    const formattedTranscript = "📜 تفريغ المحاضرة الكامل من واقع التسجيل الصوتي:\n\n" + groupIntoParagraphs(chunks);
    const wordCount = formattedTranscript.split(/\s+/).filter(Boolean).length;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      success: true,
      videoId: videoId,
      language: chosen.languageCode || "ar",
      chunksCount: chunks.length,
      wordCount: wordCount,
      transcript: formattedTranscript
    }));

  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      success: false,
      error: "خطأ داخلي أثناء استخراج التفريغ: " + err.message
    }));
  }
};
