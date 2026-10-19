import sys
import time
import json
import base64
import urllib.request
import re

def main():
    chapter_index = 4
    if len(sys.argv) > 1:
        chapter_index = int(sys.argv[1])

    start_total = time.time()
    print("=" * 60)
    print(f"1. Fetching book data from Firestore for Chapter {chapter_index}...")
    print("=" * 60)

    url = "https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        doc = json.loads(resp.read().decode("utf-8"))

    chaps = doc["fields"]["audioChapters"]["arrayValue"]["values"]
    target = chaps[chapter_index]["mapValue"]["fields"]
    title = target["title"]["stringValue"]
    text = target["text"]["stringValue"]

    print(f"Title: {title}")
    print(f"Total Text Length: {len(text)} characters")

    # Split text into chunks ~1400 chars
    paragraphs = re.split(r"(\r?\n)+", text)
    chunks = []
    current = ""
    for p in paragraphs:
        p_clean = p.strip()
        if not p_clean:
            continue
        if len(current) + len(p_clean) > 1400 and len(current) > 0:
            chunks.append(current.strip())
            current = p_clean
        else:
            current = (current + "\n" + p_clean) if current else p_clean

    if current.strip():
        chunks.append(current.strip())

    print(f"Total chunks: {len(chunks)}")
    print("=" * 60)
    print("2. Synthesizing audio chunks via Edge-TTS Salma Neural...")
    print("=" * 60)

    synthesize_url = "https://counseling-study-platform.vercel.app/api/synthesize"
    combined_audio = bytearray()

    for idx, chunk in enumerate(chunks, 1):
        t0 = time.time()
        print(f"[{idx}/{len(chunks)}] Synthesizing chunk ({len(chunk)} chars)... ", end="", flush=True)

        payload = json.dumps({
            "text": chunk,
            "voice": "ar-EG-SalmaNeural"
        }).encode("utf-8")

        chunk_req = urllib.request.Request(
            synthesize_url,
            data=payload,
            headers={"Content-Type": "application/json; charset=utf-8"}
        )

        success = False
        for retry in range(2):
            try:
                with urllib.request.urlopen(chunk_req, timeout=45) as chunk_resp:
                    chunk_data = json.loads(chunk_resp.read().decode("utf-8"))
                    if chunk_data.get("status") == "success" and chunk_data.get("audioBase64"):
                        mp3_bytes = base64.b64decode(chunk_data["audioBase64"])
                        combined_audio.extend(mp3_bytes)
                        elapsed = time.time() - t0
                        print(f"DONE in {elapsed:.1f}s ({len(mp3_bytes)/1024:.1f} KB)")
                        success = True
                        break
            except Exception as e:
                time.sleep(1.5)

        if not success:
            print(f"FAILED chunk {idx}")
            return

    total_mb = len(combined_audio) / (1024 * 1024)
    print("-" * 60)
    print(f"All audio synthesized successfully! Total Size: {total_mb:.2f} MB")

    # 3. Upload to Google Drive via Google Apps Script
    print("=" * 60)
    print("3. Uploading MP3 to Google Drive...")
    print("=" * 60)
    t_upload_start = time.time()

    clean_file_name = f"chapter_{chapter_index}.mp3"
    drive_payload = json.dumps({
        "fileName": clean_file_name,
        "mimeType": "audio/mp3",
        "base64Data": base64.b64encode(combined_audio).decode("ascii")
    }).encode("utf-8")

    drive_endpoint = "https://script.google.com/macros/s/AKfycbzVQ7NkIeykIhT8vU61Chphju1nnOjuEp1MvxKGnx2bBQix0MaV5R0z5cELFs5CSiJW/exec"
    drive_req = urllib.request.Request(
        drive_endpoint,
        data=drive_payload,
        headers={"Content-Type": "text/plain;charset=utf-8"}
    )

    with urllib.request.urlopen(drive_req, timeout=90) as drive_resp:
        drive_res = json.loads(drive_resp.read().decode("utf-8"))

    if drive_res.get("status") != "success" or not drive_res.get("fileUrl"):
        print("Drive upload failed:", drive_res)
        return

    permanent_url = drive_res["fileUrl"]
    t_upload = time.time() - t_upload_start
    print(f"Uploaded to Google Drive in {t_upload:.1f}s!")
    print(f"Permanent Drive URL: {permanent_url}")

    # 4. Update Firestore with permanent Drive URL
    print("=" * 60)
    print("4. Updating Firestore document...")
    print("=" * 60)

    api_key = "AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8"
    patch_url = f"https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={api_key}&updateMask.fieldPaths=audioChapters"

    for c_idx, item in enumerate(chaps):
        if c_idx == chapter_index:
            item["mapValue"]["fields"]["audioUrl"] = {"stringValue": permanent_url}

    patch_payload = json.dumps({
        "fields": {
            "audioChapters": {
                "arrayValue": {
                    "values": chaps
                }
            }
        }
    }).encode("utf-8")

    patch_req = urllib.request.Request(
        patch_url,
        data=patch_payload,
        headers={"Content-Type": "application/json"},
        method="PATCH"
    )

    with urllib.request.urlopen(patch_req, timeout=30) as patch_resp:
        patch_res = json.loads(patch_resp.read().decode("utf-8"))

    total_time = time.time() - start_total
    print("=" * 60)
    print(f"SUCCESS! Chapter {chapter_index} completely processed in {total_time:.1f}s ({total_time/60:.1f} mins)!")
    print(f"Permanent Google Drive URL: {permanent_url}")
    print("=" * 60)

if __name__ == "__main__":
    main()
