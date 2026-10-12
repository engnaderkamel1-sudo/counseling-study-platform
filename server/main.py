from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import edge_tts
import io

app = FastAPI(title="Counseling TTS Service")

# السماح للواجهة بالاتصال بالسيرفر بدون أي حظر CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_VOICE = "ar-EG-SalmaNeural"

@app.get("/")
def home():
    return {"status": "running", "service": "Counseling Edge TTS Engine"}

@app.post("/api/tts")
async def generate_speech_post(data: dict):
    text = data.get("text", "").strip()
    voice = data.get("voice", DEFAULT_VOICE)
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    communicate = edge_tts.Communicate(text, voice)
    audio_stream = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_stream.write(chunk["data"])

    audio_bytes = audio_stream.getvalue()
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Failed to synthesize audio")

    return Response(content=audio_bytes, media_type="audio/mpeg")

@app.get("/api/tts")
async def generate_speech_get(text: str = Query(...), voice: str = Query(DEFAULT_VOICE)):
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    communicate = edge_tts.Communicate(text.strip(), voice)
    audio_stream = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_stream.write(chunk["data"])

    audio_bytes = audio_stream.getvalue()
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Failed to synthesize audio")

    return Response(content=audio_bytes, media_type="audio/mpeg")
