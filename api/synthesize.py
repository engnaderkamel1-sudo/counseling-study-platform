from http.server import BaseHTTPRequestHandler
import json
import asyncio
import edge_tts
import base64
import re
import urllib.parse

def clean_arabic_text(text):
    if not text:
        return ""
    # Strip Byte Order Mark, zero-width characters
    cleaned = text.replace("\ufeff", "").replace("\u200b", "").replace("\u200c", "").replace("\u200d", "")
    # Remove superscript footnote numbers
    cleaned = re.sub(r"[¹²³⁴⁵⁶⁷⁸⁹⁰]", "", cleaned)
    # Remove isolated non-printable control chars except newlines and tabs
    return "".join(ch for ch in cleaned if ch in "\n\r\t" or ord(ch) >= 32).strip()

async def synthesize(text, voice="ar-EG-SalmaNeural"):
    clean_text = clean_arabic_text(text)
    if not clean_text:
        return b"", []

    comm = edge_tts.Communicate(clean_text, voice)
    audio = bytearray()
    cues = []

    async for packet in comm.stream():
        if packet["type"] == "audio":
            audio.extend(packet["data"])
        elif packet["type"] == "SentenceBoundary":
            cues.append({
                "start": round(packet["offset"] / 10_000_000, 2),
                "end": round((packet["offset"] + packet["duration"]) / 10_000_000, 2),
                "text": packet["text"]
            })

    return bytes(audio), cues

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        # Health check
        if "health" in params or not params.get("text"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "online",
                "service": "Edge-TTS Egyptian Salma Neural Synthesis API",
                "defaultVoice": "ar-EG-SalmaNeural"
            }).encode("utf-8"))
            return

        text = params["text"][0]
        voice = params.get("voice", ["ar-EG-SalmaNeural"])[0]
        self._process_synthesis(text, voice)

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else ""
            data = json.loads(body) if body else {}

            text = data.get("text") or data.get("q") or ""
            voice = data.get("voice") or "ar-EG-SalmaNeural"
            self._process_synthesis(text, voice)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    def _process_synthesis(self, text, voice):
        try:
            if " - " in voice:
                voice = voice.split(" - ")[0].strip()
            if not voice:
                voice = "ar-EG-SalmaNeural"

            if not (text or "").strip():
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No text provided for speech synthesis."}).encode("utf-8"))
                return

            audio_bytes, cues = asyncio.run(synthesize(text, voice))

            if len(audio_bytes) == 0:
                # Retry once after 1 second if transient error
                import time
                time.sleep(1)
                audio_bytes, cues = asyncio.run(synthesize(text, voice))

            if len(audio_bytes) == 0:
                # Check if text had any pronounceable letters
                clean_t = clean_arabic_text(text)
                has_letters = bool(re.search(r"[\u0600-\u06FFa-zA-Z0-9]", clean_t))
                if not has_letters:
                    # Return silent MP3 frame for non-pronounceable text
                    audio_bytes = b"\xff\xfb\x90\x00" + (b"\x00" * 413)
                    cues = []
                else:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "تعذر توليد الصوت لهذا المقطع من خادم مايكروسوفت، يرجى المحاولة مرة أخرى."}).encode("utf-8"))
                    return

            b64 = base64.b64encode(audio_bytes).decode("ascii")

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response_data = {
                "status": "success",
                "voice": voice,
                "audioBytes": len(audio_bytes),
                "audioBase64": b64,
                "subtitles": cues
            }
            self.wfile.write(json.dumps(response_data).encode("utf-8"))
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
