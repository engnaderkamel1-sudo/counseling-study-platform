// Vercel Serverless Function: Resilient YouTube Transcript Extractor with Debugging
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

function extractCaptionTracksFromHtml(html) {
  if (!html) return [];
  const idx = html.indexOf('"captionTracks":');
  if (idx === -1) return [];
  const startBracket = html.indexOf('[', idx);
  if (startBracket === -1) return [];
  let bracketCount = 0;
  let inString = false;
  let escape = false;
  let endBracket = -1;
  for (let i = startBracket; i < html.length; i++) {
    const ch = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '[') bracketCount++;
      else if (ch === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          endBracket = i;
          break;
        }
      }
    }
  }
  if (endBracket !== -1) {
    try {
      const jsonStr = html.substring(startBracket, endBracket + 1);
      return JSON.parse(jsonStr);
    } catch (e) {}
  }
  return [];
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  const debug = {};

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
    let apiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

    // Step 1: Query YouTube Android InnerTube directly
    try {
      const innertubeResp = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip",
          "Accept-Language": "en-US"
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: "20.10.38"
            }
          },
          videoId: videoId
        })
      });

      debug.android_status = innertubeResp.status;
      if (innertubeResp.ok) {
        const pData = await innertubeResp.json();
        debug.android_playability = pData?.playabilityStatus?.status;
        debug.android_reason = pData?.playabilityStatus?.reason;
        captionTracks = pData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        debug.android_tracks_count = captionTracks.length;
      }
    } catch (eInner) {
      debug.android_err = eInner.message;
    }

    // Step 2: Fallback to iOS InnerTube client
    if (!captionTracks || !captionTracks.length) {
      try {
        const iosResp = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "com.google.ios.youtube/19.09.3 (iPhone; CPU iPhone OS 17_4 like Mac OS X)",
            "Accept-Language": "en-US"
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: "IOS",
                clientVersion: "19.09.3",
                deviceMake: "Apple",
                deviceModel: "iPhone14,3"
              }
            },
            videoId: videoId
          })
        });

        debug.ios_status = iosResp.status;
        if (iosResp.ok) {
          const iosData = await iosResp.json();
          debug.ios_playability = iosData?.playabilityStatus?.status;
          captionTracks = iosData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
          debug.ios_tracks_count = captionTracks.length;
        }
      } catch (eIos) {
        debug.ios_err = eIos.message;
      }
    }

    // Step 3: Fallback to watch page scrape
    if (!captionTracks || !captionTracks.length) {
      try {
        const watchResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-US"
          }
        });
        debug.watch_status = watchResp.status;
        if (watchResp.ok) {
          const html = await watchResp.text();
          captionTracks = extractCaptionTracksFromHtml(html);
          debug.watch_tracks_count = captionTracks.length;
        }
      } catch (eWatch) {
        debug.watch_err = eWatch.message;
      }
    }

    if (!captionTracks || !captionTracks.length) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({
        success: false,
        error: "لم يتم العثور على مسارات تفريغ صوتي مسجل لهذا الفيديو على يوتيوب.",
        debug: debug
      }));
    }

    let chosen = captionTracks.find(t => t.languageCode === "ar" || (t.vssId && t.vssId.includes(".ar")));
    if (!chosen) {
      chosen = captionTracks.find(t => {
        const lang = t.languageCode || "";
        const name = t.name?.simpleText || (t.name?.runs && t.name.runs[0]?.text) || "";
        return lang.startsWith("ar") || name.includes("عربي");
      });
    }
    if (!chosen) {
      chosen = captionTracks[0];
    }

    let subBaseUrl = chosen.baseUrl;
    debug.chosen_lang = chosen.languageCode;
    debug.sub_url_has_xpe = subBaseUrl.includes("exp=xpe");

    let chunks = [];

    const parseBodyToChunks = (bodyText) => {
      const parsed = [];
      if (!bodyText) return parsed;
      if (bodyText.includes("<p t=")) {
        const pRegex = /<p\s+t="(\d+)"(?:[^>]*?d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g;
        let pm;
        while ((pm = pRegex.exec(bodyText)) !== null) {
          const tMs = parseInt(pm[1], 10) || 0;
          const dMs = parseInt(pm[2], 10) || 0;
          const rawText = cleanSubText(pm[3]);
          if (rawText) {
            parsed.push({ startMs: tMs, durMs: dMs, text: rawText });
          }
        }
      }
      if (!parsed.length && bodyText.includes("<text start=")) {
        const textRegex = /<text\s+start="([\d\.]+)"(?:[^>]*?dur="([\d\.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
        let tm;
        while ((tm = textRegex.exec(bodyText)) !== null) {
          const startMs = Math.round(parseFloat(tm[1]) * 1000);
          const durMs = Math.round(parseFloat(tm[2] || "0") * 1000);
          const rawText = cleanSubText(tm[3]);
          if (rawText) {
            parsed.push({ startMs: startMs, durMs: durMs, text: rawText });
          }
        }
      }
      return parsed;
    };

    try {
      const subResp = await fetch(subBaseUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US"
        }
      });
      debug.sub_fetch_status = subResp.status;
      if (subResp.ok) {
        const bodyText = await subResp.text();
        debug.sub_body_length = bodyText.length;
        chunks = parseBodyToChunks(bodyText);
        debug.chunks_count = chunks.length;
      }
    } catch (eFetchSub) {
      debug.sub_fetch_err = eFetchSub.message;
    }

    if (!chunks.length) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({
        success: false,
        error: "تعذر قراءة وتفكيك نصوص مسار التفريغ الصوتي لهذا الفيديو.",
        debug: debug
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

  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      success: false,
      error: "حدث خطأ غير متوقع أثناء معالجة تفريغ الفيديو: " + err.message,
      debug: debug
    }));
  }
};
