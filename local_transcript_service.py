# -*- coding: utf-8 -*-
import sys
import json
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi

sys.stdout.reconfigure(encoding='utf-8')

PORT = 8765

def format_timestamp(seconds):
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"

def clean_text(t):
    if not t:
        return ""
    t = re.sub(r'[\r\n]+', ' ', t)
    return t.strip()

def build_formatted_transcript(snippets):
    blocks = []
    current_block = []
    current_start = None

    for s in snippets:
        text = s.text if hasattr(s, 'text') else s.get('text', '')
        start = s.start if hasattr(s, 'start') else s.get('start', 0)

        cleaned = clean_text(text)
        if not cleaned:
            continue

        if current_start is None:
            current_start = start

        current_block.append(cleaned)

        # تجميع الفقرات كل 35 ثانية
        if (start - current_start >= 35) and len(current_block) >= 4:
            ts = format_timestamp(current_start)
            blocks.append(f"⏱️ [{ts}]\n{' '.join(current_block)}")
            current_block = []
            current_start = None

    if current_block and current_start is not None:
        ts = format_timestamp(current_start)
        blocks.append(f"⏱️ [{ts}]\n{' '.join(current_block)}")

    return "\n\n".join(blocks)

class TranscriptHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if parsed.path == "/ping":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"status": "READY", "message": "خادم التفريغ المحلي جاهز"}).encode('utf-8'))
            return

        if parsed.path == "/transcript":
            video_id = params.get('videoId', [None])[0]
            url = params.get('url', [None])[0]

            if not video_id and url:
                m = re.search(r'(?:youtu\.be/|youtube\.com/(?:embed/|v/|watch\?v=|watch\?.+&v=))([\w-]{11})', url)
                if m:
                    video_id = m.group(1)

            if not video_id:
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "لم يتم توفير معرف الفيديو (videoId)"}).encode('utf-8'))
                return

            print(f"[طلب جديد] جلب تفريغ الفيديو: {video_id} ...", flush=True)

            try:
                api = YouTubeTranscriptApi()
                transcript_list = api.list(video_id)

                # البحث عن المسار العربي أو الأول
                found = None
                for t in transcript_list:
                    if 'ar' in t.language_code:
                        found = t
                        break
                if not found:
                    found = transcript_list[0]

                snippets = found.fetch()
                formatted = build_formatted_transcript(snippets)
                word_count = len(formatted.split())

                print(f"[نجاح] تم جلب {len(snippets)} مقطع ({word_count} كلمة).", flush=True)

                response_data = {
                    "success": True,
                    "transcript": formatted,
                    "transcriptText": formatted,
                    "wordCount": word_count,
                    "language": found.language_code,
                    "source": "local_service"
                }

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))

            except Exception as e:
                err_msg = str(e)
                print(f"[خطأ] فشل الجلب: {err_msg}", flush=True)
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": err_msg}, ensure_ascii=False).encode('utf-8'))
            return

        # أي مسار آخر
        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()

def run_server():
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, TranscriptHandler)
    print(f"===========================================================", flush=True)
    print(f"  خادم تفريغ المحاضرات المحلي يعمل الآن بنجاح على المنفذ {PORT}", flush=True)
    print(f"  اترك هذه النافذة مفتوحة أثناء استخدام زر التفريغ في المنصة", flush=True)
    print(f"===========================================================", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nتم إيقاف الخادم.", flush=True)

if __name__ == '__main__':
    run_server()
