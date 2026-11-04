import asyncio
import edge_tts
import sys
import os
import json
import base64
import time
import urllib.request
import re

sys.stdout.reconfigure(encoding='utf-8')

API_KEY = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
BOOK_ID = 'book-1791651887196'
BOOK_URL = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{BOOK_ID}?key={API_KEY}'
DRIVE_ENDPOINT = "https://script.google.com/macros/s/AKfycbzVQ7NkIeykIhT8vU61Chphju1nnOjuEp1MvxKGnx2bBQix0MaV5R0z5cELFs5CSiJW/exec"

def get_mp3_duration_from_bytes(data):
    total_frames = 0
    duration = 0.0
    pos = 0
    l = len(data)
    bitrates_v2_l3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
    bitrates_v1_l3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
    sample_rates_v1 = [44100, 48000, 32000, 0]
    sample_rates_v2 = [22050, 24000, 16000, 0]

    while pos < l - 4:
        if data[pos] == 0xFF and (data[pos+1] & 0xE0) == 0xE0:
            version = (data[pos+1] >> 3) & 0x03
            layer = (data[pos+1] >> 1) & 0x03
            bitrate_idx = (data[pos+2] >> 4) & 0x0F
            sr_idx = (data[pos+2] >> 2) & 0x03
            padding = (data[pos+2] >> 1) & 0x01

            if version == 3 and layer == 1:
                br = bitrates_v1_l3[bitrate_idx] * 1000
                sr = sample_rates_v1[sr_idx]
                frame_len = (144 * br // sr) + padding
                samples_per_frame = 1152
            elif version == 2 and layer == 1:
                br = bitrates_v2_l3[bitrate_idx] * 1000
                sr = sample_rates_v2[sr_idx]
                frame_len = (72 * br // sr) + padding
                samples_per_frame = 576
            else:
                pos += 1
                continue

            if frame_len <= 0 or pos + frame_len > l:
                pos += 1
                continue

            total_frames += 1
            duration += samples_per_frame / sr
            pos += frame_len
        else:
            pos += 1

    return duration

async def main():
    print("=" * 60)
    print("STEP 1: Reading cleaned Chapter 10 text...")
    print("=" * 60)
    with open('chap10_cleaned_text.txt', 'r', encoding='utf-8') as f:
        clean_text = f.read()

    print(f"Clean text length: {len(clean_text)} characters")

    # Split into chunks around paragraph boundaries (~1200 chars)
    paragraphs = re.split(r'(\r?\n)+', clean_text)
    chunks = []
    current = ""
    for p in paragraphs:
        p_str = p.strip()
        if not p_str:
            continue
        if len(current) + len(p_str) > 1200 and len(current) > 0:
            chunks.append(current.strip())
            current = p_str
        else:
            current = (current + "\n" + p_str) if current else p_str
    if current.strip():
        chunks.append(current.strip())

    print(f"Total chunks to synthesize: {len(chunks)}")
    print("=" * 60)
    print("STEP 2: Synthesizing audio and capturing exact SentenceBoundaries...")
    print("=" * 60)

    full_audio = bytearray()
    all_subtitles = []
    current_time_offset = 0.0

    for idx, chunk in enumerate(chunks):
        t0 = time.time()
        print(f"[{idx+1}/{len(chunks)}] Synthesizing chunk ({len(chunk)} chars)... ", end='', flush=True)

        success = False
        for attempt in range(3):
            try:
                comm = edge_tts.Communicate(chunk, 'ar-EG-SalmaNeural')
                chunk_audio = bytearray()
                chunk_subs = []

                async for item in comm.stream():
                    if item['type'] == 'audio':
                        chunk_audio.extend(item['data'])
                    elif item['type'] == 'SentenceBoundary':
                        st = current_time_offset + (item['offset'] / 10000000.0)
                        dur = item['duration'] / 10000000.0
                        chunk_subs.append({
                            'start': round(st, 2),
                            'end': round(st + dur, 2),
                            'text': item['text'].strip()
                        })

                if len(chunk_audio) > 0:
                    chunk_duration = get_mp3_duration_from_bytes(chunk_audio)
                    full_audio.extend(chunk_audio)
                    all_subtitles.extend(chunk_subs)
                    current_time_offset += chunk_duration
                    print(f"DONE in {time.time()-t0:.1f}s ({len(chunk_subs)} sentences, chunk dur: {chunk_duration:.1f}s)", flush=True)
                    success = True
                    break
            except Exception as e:
                print(f"Retry {attempt+1} due to: {e}", flush=True)
                await asyncio.sleep(2)

        if not success:
            print(f"FAILED on chunk {idx+1}!")
            return

    total_duration = get_mp3_duration_from_bytes(full_audio)
    print("=" * 60)
    print(f"Synthesis Complete! Total audio: {len(full_audio)/(1024*1024):.2f} MB")
    print(f"Total Duration: {total_duration:.2f} seconds ({total_duration/60:.2f} minutes)")
    print(f"Total Subtitles / Sentences: {len(all_subtitles)}")
    print("=" * 60)

    # Save local MP3 backup
    mp3_filename = "chap10_salma_final.mp3"
    with open(mp3_filename, 'wb') as f:
        f.write(full_audio)
    print(f"Saved local audio file: {mp3_filename}")

    # Save local subtitles backup
    chap_id = 'chap_1791651928435_10'
    subs_path = f'backup_subs/sub_{chap_id}.json'
    with open(subs_path, 'w', encoding='utf-8') as f:
        json.dump(all_subtitles, f, ensure_ascii=False, indent=2)
    print(f"Saved local subtitles file: {subs_path}")

    # STEP 3: Upload MP3 to Google Drive
    print("=" * 60)
    print("STEP 3: Uploading MP3 to Google Drive...")
    print("=" * 60)
    drive_payload = json.dumps({
        "fileName": "الفصل العاشر - قانون الحياة.mp3",
        "mimeType": "audio/mp3",
        "base64Data": base64.b64encode(full_audio).decode("ascii")
    }).encode("utf-8")

    drive_req = urllib.request.Request(
        DRIVE_ENDPOINT,
        data=drive_payload,
        headers={"Content-Type": "text/plain;charset=utf-8"}
    )
    with urllib.request.urlopen(drive_req, timeout=120) as resp:
        drive_res = json.loads(resp.read().decode("utf-8"))

    if drive_res.get("status") != "success" or not drive_res.get("fileUrl"):
        print("Drive upload failed!", drive_res)
        return

    new_audio_url = drive_res["fileUrl"]
    print(f"Drive upload SUCCESS! New URL: {new_audio_url}")

    # STEP 4: Save subtitles to Firestore subcollection
    print("=" * 60)
    print("STEP 4: Saving subtitles to Firestore subcollection...")
    print("=" * 60)
    firestore_subs = []
    for s in all_subtitles:
        firestore_subs.append({
            'mapValue': {
                'fields': {
                    'start': {'doubleValue': float(s['start'])},
                    'end': {'doubleValue': float(s['end'])},
                    'text': {'stringValue': str(s['text'])}
                }
            }
        })
    sub_payload = json.dumps({
        'fields': {
            'chapterId': {'stringValue': chap_id},
            'subtitles': {
                'arrayValue': {
                    'values': firestore_subs
                }
            }
        }
    }).encode('utf-8')
    sub_url = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{BOOK_ID}/cached_pages/sub_{chap_id}?key={API_KEY}'
    sub_req = urllib.request.Request(sub_url, data=sub_payload, method='PATCH', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(sub_req) as sub_resp:
        print(f"Subcollection write SUCCESS! HTTP Status: {sub_resp.status}")

    # STEP 5: Update Chapter 10 ONLY in the main Book Document
    print("=" * 60)
    print("STEP 5: Updating Book Document for Chapter 10 ONLY...")
    print("=" * 60)
    req = urllib.request.urlopen(BOOK_URL)
    book_doc = json.loads(req.read().decode('utf-8'))
    chaps = book_doc['fields']['audioChapters']['arrayValue']['values']

    # Strict safety check: ensure we only modify chapter 10
    c10 = chaps[10]['mapValue']['fields']
    c10_id = c10.get('id', {}).get('stringValue', '')
    print(f"Targeting chapter at index 10: {c10_id} - {c10.get('title', {}).get('stringValue', '')}")
    assert c10_id == chap_id, f"ID mismatch! Expected {chap_id}, got {c10_id}"

    c10['audioUrl'] = {'stringValue': new_audio_url}
    c10['audioDuration'] = {'doubleValue': round(total_duration, 2)}
    c10['hasSubtitles'] = {'booleanValue': True}
    c10['subtitlesCount'] = {'integerValue': str(len(all_subtitles))}
    c10['timeOffset'] = {'integerValue': '0'}

    patch_url = f'{BOOK_URL}&updateMask.fieldPaths=audioChapters'
    payload = json.dumps({
        'fields': {
            'audioChapters': {
                'arrayValue': {
                    'values': chaps
                }
            }
        }
    }).encode('utf-8')
    patch_req = urllib.request.Request(patch_url, data=payload, method='PATCH', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(patch_req) as resp:
        print(f"Book document updated successfully! HTTP Status: {resp.status}")

    print("\n" + "=" * 60)
    print("ALL STEPS COMPLETED 100% SUCCESSFULLY!")
    print("=" * 60)

if __name__ == '__main__':
    asyncio.run(main())
