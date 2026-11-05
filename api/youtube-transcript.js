// Vercel Serverless Function: Resilient YouTube Transcript Extractor
// Employs the official Android InnerTube protocol to reliably retrieve verbatim captions without cloud IP blocking

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
    .replace(/<[^>]+>/g, " ")
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

    // Split paragraph every ~70 words or after a pause > 45 seconds
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

    // Step 1: Fetch watch page to extract latest INNERTUBE_API_KEY
    let apiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
    try {
      const watchResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "ar,en;q=0.9"
        }
      });
      if (watchResp.ok) {
        const html = await watchResp.text();
        const mKey = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
        if (mKey && mKey[1]) {
          apiKey = mKey[1];
        }
        // Fallback: direct scrape captionTracks if already embedded in watch page
        const mCaptions = html.match(/"captionTracks":\s*(\[.*?\])/);
        if (mCaptions) {
          try {
            captionTracks = JSON.parse(mCaptions[1]);
          } catch(e) {}
        }
      }
    } catch(eWatch) {
      console.warn("Watch page scrape note:", eWatch.message);
    }

    // Step 2: Use Android InnerTube client with the active API key
    if (!captionTracks || !captionTracks.length) {
      try {
        const innertubeResp = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip"
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: "ANDROID",
                clientVersion: "20.10.38",
                hl: "ar",
                gl: "EG"
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
        console.warn("InnerTube Android client error:", eInner.message);
      }
    }

    // Step 3: Fallback to iOS InnerTube client if Android client yielded nothing
    if (!captionTracks || !captionTracks.length) {
      try {
        const iosResp = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "com.google.ios.youtube/19.09.3 (iPhone; CPU iPhone OS 17_4 like Mac OS X)"
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: "IOS",
                clientVersion: "19.09.3",
                deviceMake: "Apple",
                deviceModel: "iPhone14,3",
                hl: "ar",
                gl: "EG"
              }
            },
            videoId: videoId
          })
        });

        if (iosResp.ok) {
          const iosData = await iosResp.json();
          captionTracks = iosData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        }
      } catch (eIos) {
        console.warn("InnerTube iOS client error:", eIos.message);
      }
    }

    if (!captionTracks || !captionTracks.length) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({
        success: false,
        error: "لم يتم العثور على مسارات تفريغ صوتي مسجل لهذا الفيديو على يوتيوب."
      }));
    }

    // Prefer Arabic transcript, then any track containing 'ar', then first available
    let chosen = captionTracks.find(t => t.languageCode === "ar" || (t.vssId && t.vssId.includes(".ar")));
    if (!chosen) {
      chosen = captionTracks.find(t => t.languageCode?.startsWith("ar") || (t.name?.simpleText && t.name.simpleText.includes("عربي")));
    }
    if (!chosen) {
      chosen = captionTracks[0];
    }

    const subBaseUrl = chosen.baseUrl;
    let chunks = [];

    // Attempt fetching and parsing subtitle body (supports Format 3 XML, Format 1 XML, and JSON3)
    try {
      const subResp = await fetch(subBaseUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (subResp.ok) {
        const bodyText = await subResp.text();

        // 1. Try parsing Format 3 XML (<p t="123" d="456">...text...<s>...</s></p>)
        if (bodyText.includes("<p t=")) {
          const pRegex = /<p\s+t="(\d+)"(?:[^>]*?d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g;
          let pm;
          while ((pm = pRegex.exec(bodyText)) !== null) {
            const tMs = parseInt(pm[1], 10) || 0;
            const dMs = parseInt(pm[2], 10) || 0;
            const rawText = cleanSubText(pm[3]);
            if (rawText) {
              chunks.push({ startMs: tMs, durMs: dMs, text: rawText });
            }
          }
        }

        // 2. Try parsing Format 1 XML (<text start="1.23" dur="4.56">text</text>)
        if (!chunks.length && bodyText.includes("<text start=")) {
          const textRegex = /<text\s+start="([\d\.]+)"(?:[^>]*?dur="([\d\.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
          let tm;
          while ((tm = textRegex.exec(bodyText)) !== null) {
            const startMs = Math.round(parseFloat(tm[1]) * 1000);
            const durMs = Math.round(parseFloat(tm[2] || "0") * 1000);
            const rawText = cleanSubText(tm[3]);
            if (rawText) {
              chunks.push({ startMs: startMs, durMs: durMs, text: rawText });
            }
          }
        }

        // 3. Try parsing JSON format
        if (!chunks.length && bodyText.trim().startsWith("{")) {
          try {
            const subData = JSON.parse(bodyText);
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
          } catch(eJson) {}
        }
      }
    } catch (eFetchSub) {
      console.warn("Subtitle body fetch error:", eFetchSub.message);
    }

    if (!chunks.length) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({
        success: false,
        error: "تعذر قراءة وتفكيك نصوص مسار التفريغ الصوتي لهذا الفيديو."
      }));
    }

    const formattedTranscript = groupIntoParagraphs(chunks);
    const wordCount = formattedTranscript.split(/\s+/).length;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      success: true,
      videoId: videoId,
      language: chosen.languageCode || "ar",
      wordCount: wordCount,
      transcript: formattedTranscript
    }));

  } catch (error) {
    console.error("API error in youtube-transcript handler:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      success: false,
      error: "خطأ داخلي أثناء استخراج تفريغ اليوتيوب: " + (error?.message || error)
    }));
  }
};
