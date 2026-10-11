module.exports = async function handler(req, res) {
  try {
    const fixedTarget = "https://innoai-edge-tts-text-to-speech.hf.space";
    const r = await fetch(fixedTarget);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ ok: r.ok, status: r.status, statusText: r.statusText });
  } catch (e) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: "Upstream connection test failed" });
  }
};
