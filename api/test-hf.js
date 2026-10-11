module.exports = async function handler(req, res) {
  try {
    const url = req.query.url || "https://innoai-edge-tts-text-to-speech.hf.space";
    const r = await fetch(url);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ ok: r.ok, status: r.status, statusText: r.statusText });
  } catch (e) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ error: e.message, stack: e.stack });
  }
};
