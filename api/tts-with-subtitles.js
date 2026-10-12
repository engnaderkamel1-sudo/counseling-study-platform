// Vercel Serverless Function: Edge-TTS with Synchronized Subtitles (SRT / VTT / Cues)
const { Communicate, SubMaker } = require("edge-tts-universal");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.statusCode = 200;
      return res.end();
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    let text = "";
    let voice = "ar-EG-SalmaNeural";

    if (req.method === "POST") {
      const body = req.body || {};
      text = (body.text || body.q || "").trim();
      if (body.voice) voice = body.voice.trim();
    } else {
      text = (req.query.text || req.query.q || "").trim();
      if (req.query.voice) voice = req.query.voice.trim();
    }

    if (!text) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "No text provided for speech synthesis." }));
    }

    // Clean voice name (extract prefix if in format "ar-EG-SalmaNeural - ar-EG (Female)")
    const cleanVoice = voice.split(" - ")[0].trim() || "ar-EG-SalmaNeural";

    const communicate = new Communicate(text, { voice: cleanVoice });
    const subMaker = new SubMaker();
    const audioChunks = [];

    for await (const chunk of communicate.stream()) {
      if (chunk.type === "audio" && chunk.data) {
        audioChunks.push(chunk.data);
      } else if (chunk.type === "WordBoundary" || chunk.type === "SentenceBoundary") {
        if (typeof subMaker.feed === "function") {
          subMaker.feed(chunk);
        }
      }
    }

    const audioBuffer = Buffer.concat(audioChunks);
    let srt = "";
    let vtt = "";

    try {
      if (typeof subMaker.getSrt === "function") {
        srt = subMaker.getSrt();
      } else if (typeof subMaker.generateSrt === "function") {
        srt = subMaker.generateSrt();
      }
    } catch (eSrt) {
      console.warn("SRT extraction fallback:", eSrt);
    }

    try {
      if (typeof subMaker.getVtt === "function") {
        vtt = subMaker.getVtt();
      }
    } catch (eVtt) {}

    // Return JSON with base64 audio and subtitle text
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      status: "success",
      voice: cleanVoice,
      audioBytes: audioBuffer.length,
      audioBase64: audioBuffer.toString("base64"),
      srt: srt,
      vtt: vtt
    }));
  } catch (err) {
    console.error("TTS with subtitles error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message || "Speech synthesis failed." }));
    }
  }
};
