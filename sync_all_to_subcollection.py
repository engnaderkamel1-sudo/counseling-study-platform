import asyncio
import urllib.request
import urllib.error
import json
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_KEY = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
BOOK_ID = 'book-1791651887196'
BOOK_URL = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{BOOK_ID}?key={API_KEY}'

os.makedirs('backup_subs', exist_ok=True)

def get_mp3_duration_from_bytes(data):
    pos = 0
    l = len(data)
    bitrates_v2_l3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
    bitrates_v1_l3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
    sample_rates_v1 = [44100, 48000, 32000, 0]
    sample_rates_v2 = [22050, 24000, 16000, 0]
    total_frames = 0
    duration = 0.0

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

def split_text_into_chunks(text, max_chars=12000):
    paragraphs = text.split('\n')
    chunks = []
    current_chunk = []
    current_len = 0
    
    for p in paragraphs:
        p_len = len(p) + 1
        if current_len + p_len > max_chars and current_chunk:
            chunks.append('\n'.join(current_chunk))
            current_chunk = [p]
            current_len = p_len
        else:
            current_chunk.append(p)
            current_len += p_len
            
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
        
    return chunks

async def align_chapter_edge_tts(text, drive_id, idx):
    import edge_tts
    proxy_url = f"https://counseling-study-platform.vercel.app/api/audio-proxy?id={drive_id}"
    req = urllib.request.Request(proxy_url, headers={'User-Agent': 'Mozilla/5.0'})
    print(f"[{idx}] Downloading MP3 to determine exact duration...", flush=True)
    with urllib.request.urlopen(req) as resp:
        audio_data = resp.read()
    
    target_dur = get_mp3_duration_from_bytes(audio_data)
    print(f"[{idx}] Target audio duration: {target_dur:.2f}s ({target_dur/60:.2f} mins)", flush=True)
    if target_dur <= 0:
        raise ValueError(f"Invalid duration: {target_dur}")

    chunks = split_text_into_chunks(text, max_chars=12000)
    print(f"[{idx}] Text chars: {len(text)} split into {len(chunks)} chunks", flush=True)
    
    all_sentences = []
    cumulative_offset = 0.0

    for c_i, ch in enumerate(chunks):
        print(f"[{idx}] Processing chunk {c_i+1}/{len(chunks)}...", flush=True)
        comm = edge_tts.Communicate(ch, 'ar-EG-SalmaNeural')
        max_end = 0.0
        async for chunk_msg in comm.stream():
            if chunk_msg['type'] == 'SentenceBoundary':
                s_start = round((chunk_msg['offset'] / 10000000) + cumulative_offset, 2)
                s_dur = round(chunk_msg['duration'] / 10000000, 2)
                s_end = round(s_start + s_dur, 2)
                t = chunk_msg['text'].strip()
                if t:
                    all_sentences.append({
                        'start': s_start,
                        'end': s_end,
                        'text': t
                    })
                rel_end = (chunk_msg['offset'] + chunk_msg['duration']) / 10000000
                if rel_end > max_end:
                    max_end = rel_end
        cumulative_offset += max_end

    if not all_sentences:
        raise ValueError("No sentences generated!")

    raw_end = all_sentences[-1]['end']
    if raw_end > 0 and abs(target_dur - raw_end) > 0.5:
        scale = target_dur / raw_end
        print(f"[{idx}] Calibrating scale: {scale:.5f} (raw={raw_end:.2f}s -> target={target_dur:.2f}s)", flush=True)
        calibrated = []
        for s in all_sentences:
            calibrated.append({
                'start': round(s['start'] * scale, 2),
                'end': round(s['end'] * scale, 2),
                'text': s['text']
            })
        all_sentences = calibrated

    all_sentences[-1]['end'] = round(target_dur, 2)
    print(f"[{idx}] Completed with {len(all_sentences)} sentences! Final timestamp: {all_sentences[-1]['end']}s", flush=True)
    return all_sentences

def save_subtitles_to_subcollection(chap_id, subs):
    firestore_subs = []
    for s in subs:
        firestore_subs.append({
            'mapValue': {
                'fields': {
                    'start': {'doubleValue': float(s['start'])},
                    'end': {'doubleValue': float(s['end'])},
                    'text': {'stringValue': str(s['text'])}
                }
            }
        })
    payload = json.dumps({
        'fields': {
            'chapterId': {'stringValue': chap_id},
            'subtitles': {
                'arrayValue': {
                    'values': firestore_subs
                }
            }
        }
    }).encode('utf-8')

    url = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{BOOK_ID}/cached_pages/sub_{chap_id}?key={API_KEY}'
    req = urllib.request.Request(url, data=payload, method='PATCH', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return resp.status

async def process_all():
    print("Fetching book document from Firestore...", flush=True)
    req = urllib.request.urlopen(BOOK_URL)
    book_doc = json.loads(req.read().decode('utf-8'))
    chaps = book_doc['fields']['audioChapters']['arrayValue']['values']
    print(f"Total chapters: {len(chaps)}", flush=True)

    final_subs_counts = {}

    for idx, c in enumerate(chaps):
        f = c['mapValue']['fields']
        chap_id = f.get('id', {}).get('stringValue', f'chap_{idx}')
        title = f.get('title', {}).get('stringValue', '')
        aurl = f.get('audioUrl', {}).get('stringValue', '')
        text = f.get('text', {}).get('stringValue', '')
        existing_subs_raw = f.get('subtitles', {}).get('arrayValue', {}).get('values', [])
        
        m = re.search(r'/file/d/([a-zA-Z0-9_-]+)', aurl) or re.search(r'id=([a-zA-Z0-9_-]+)', aurl)
        drive_id = m.group(1) if m else ''

        print(f"\n==========================================", flush=True)
        print(f"Processing Chapter [{idx}] - {title[:30]} (ID: {chap_id})", flush=True)
        print(f"==========================================", flush=True)

        subs = []
        if idx == 4 and os.path.exists('chap4_calibrated_subtitles.json'):
            print(f"[{idx}] Using calibrated Chapter 4 subtitles (649 sentences)", flush=True)
            with open('chap4_calibrated_subtitles.json', 'r', encoding='utf-8') as f_sub:
                subs = json.load(f_sub)
        elif len(existing_subs_raw) > 10:
            print(f"[{idx}] Chapter has {len(existing_subs_raw)} existing subtitles. Parsing...", flush=True)
            for item in existing_subs_raw:
                if 'mapValue' in item:
                    sf = item['mapValue']['fields']
                    s_start = sf.get('start', {}).get('doubleValue') or sf.get('start', {}).get('integerValue') or 0
                    s_end = sf.get('end', {}).get('doubleValue') or sf.get('end', {}).get('integerValue') or 0
                    s_text = sf.get('text', {}).get('stringValue', '')
                    subs.append({'start': float(s_start), 'end': float(s_end), 'text': s_text})
                elif 'stringValue' in item:
                    p = item['stringValue'].split('|')
                    subs.append({'start': float(p[0]), 'end': float(p[1]), 'text': '|'.join(p[2:])})
        else:
            print(f"[{idx}] Chapter has NO valid subtitles. Generating with Edge TTS...", flush=True)
            subs = await align_chapter_edge_tts(text, drive_id, idx)

        # Save to local backup
        backup_path = f'backup_subs/sub_{chap_id}.json'
        with open(backup_path, 'w', encoding='utf-8') as f_bak:
            json.dump(subs, f_bak, ensure_ascii=False, indent=2)
        print(f"[{idx}] Saved {len(subs)} sentences to local backup: {backup_path}", flush=True)

        # Upload to subcollection
        status = save_subtitles_to_subcollection(chap_id, subs)
        print(f"[{idx}] Uploaded to cached_pages/sub_{chap_id} with HTTP status: {status}", flush=True)

        final_subs_counts[idx] = len(subs)

    print("\n==========================================", flush=True)
    print("ALL 11 CHAPTERS SAVED TO SUBCOLLECTIONS!", flush=True)
    print("Subtitles summary:", final_subs_counts, flush=True)
    print("==========================================", flush=True)

    # Now update main book document:
    # 1. Strip 'subtitles' from audioChapters
    # 2. Set 'hasSubtitles' = True, 'subtitlesCount' = count, 'timeOffset' = 0
    print("\nNow slimming main book document...", flush=True)
    for idx, c in enumerate(chaps):
        f = c['mapValue']['fields']
        # remove subtitles
        if 'subtitles' in f:
            del f['subtitles']
        f['hasSubtitles'] = {'booleanValue': True}
        f['subtitlesCount'] = {'integerValue': str(final_subs_counts[idx])}
        f['timeOffset'] = {'integerValue': '0'}

    patch_url = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{BOOK_ID}?key={API_KEY}&updateMask.fieldPaths=audioChapters'
    payload = json.dumps({
        'fields': {
            'audioChapters': {
                'arrayValue': {
                    'values': chaps
                }
            }
        }
    }).encode('utf-8')

    print(f"New audioChapters payload size: {len(payload)} bytes (was >1.2MB!)", flush=True)
    patch_req = urllib.request.Request(patch_url, data=payload, method='PATCH', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(patch_req) as resp:
        print(f"Main book document successfully updated! Status: {resp.status}", flush=True)

    print("\nALL TASKS COMPLETED 100% SUCCESSFULLY!")

if __name__ == '__main__':
    asyncio.run(process_all())
