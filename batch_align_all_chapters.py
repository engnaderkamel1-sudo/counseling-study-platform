import asyncio
import urllib.request
import json
import re
import os
import sys

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

async def align_single_chapter(text, drive_id, idx):
    import edge_tts
    # 1. Fetch audio and calculate duration
    proxy_url = f"https://counseling-study-platform.vercel.app/api/audio-proxy?id={drive_id}"
    req = urllib.request.Request(proxy_url, headers={'User-Agent': 'Mozilla/5.0'})
    print(f"[{idx}] Downloading audio for duration check...")
    with urllib.request.urlopen(req) as resp:
        audio_data = resp.read()
    
    target_dur = get_mp3_duration_from_bytes(audio_data)
    print(f"[{idx}] Audio duration: {target_dur:.2f}s ({target_dur/60:.2f} mins), size: {len(audio_data)} bytes")
    
    if target_dur <= 0:
        raise ValueError(f"Invalid audio duration: {target_dur}")

    # 2. Split text and generate sentences
    chunks = split_text_into_chunks(text, max_chars=12000)
    print(f"[{idx}] Text length: {len(text)} chars across {len(chunks)} chunks")
    
    all_sentences = []
    cumulative_offset = 0.0

    for c_i, ch in enumerate(chunks):
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
        raise ValueError("No sentences generated from text")

    # 3. Calibrate sentences to exact audio duration
    raw_end = all_sentences[-1]['end']
    if raw_end > 0 and abs(target_dur - raw_end) > 0.5:
        scale = target_dur / raw_end
        print(f"[{idx}] Calibrating scale factor: {scale:.5f} (raw={raw_end:.2f}s -> target={target_dur:.2f}s)")
        calibrated = []
        for s in all_sentences:
            calibrated.append({
                'start': round(s['start'] * scale, 2),
                'end': round(s['end'] * scale, 2),
                'text': s['text']
            })
        all_sentences = calibrated

    all_sentences[-1]['end'] = round(target_dur, 2)
    print(f"[{idx}] Generated {len(all_sentences)} sentences! Final timestamp: {all_sentences[-1]['end']}s")
    return all_sentences

def patch_chapter_to_firestore(idx, subtitles):
    apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
    bookUrl = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}'
    req = urllib.request.urlopen(bookUrl)
    book_doc = json.loads(req.read().decode('utf-8'))
    chaps = book_doc['fields']['audioChapters']['arrayValue']['values']

    chap_fields = chaps[idx]['mapValue']['fields']
    
    firestore_subs = []
    for s in subtitles:
        firestore_subs.append({
            'mapValue': {
                'fields': {
                    'start': {'doubleValue': float(s['start'])},
                    'end': {'doubleValue': float(s['end'])},
                    'text': {'stringValue': str(s['text'])}
                }
            }
        })

    chap_fields['subtitles'] = {
        'arrayValue': {
            'values': firestore_subs
        }
    }
    chap_fields['timeOffset'] = {'integerValue': '0'}

    patch_url = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}&updateMask.fieldPaths=audioChapters'
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
        print(f"[{idx}] Firestore updated! Status: {resp.status}")

async def main():
    apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
    bookUrl = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}'
    req = urllib.request.urlopen(bookUrl)
    data = json.loads(req.read().decode('utf-8'))
    chaps = data['fields']['audioChapters']['arrayValue']['values']

    targets = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10]
    print(f"Processing {len(targets)} chapters: {targets}")

    for idx in targets:
        f = chaps[idx]['mapValue']['fields']
        text = f.get('text', {}).get('stringValue', '')
        aurl = f.get('audioUrl', {}).get('stringValue', '')
        m = re.search(r'/file/d/([a-zA-Z0-9_-]+)', aurl) or re.search(r'id=([a-zA-Z0-9_-]+)', aurl)
        drive_id = m.group(1) if m else ''

        if not text or not drive_id:
            print(f"[{idx}] Skipping: missing text or drive_id")
            continue

        print(f"\n==========================================")
        print(f"STARTING CHAPTER [{idx}]")
        print(f"==========================================")
        try:
            subs = await align_single_chapter(text, drive_id, idx)
            patch_chapter_to_firestore(idx, subs)
            print(f"[{idx}] SUCCESS!")
        except Exception as e:
            print(f"[{idx}] ERROR: {type(e)} {e}")

    print("\nALL TARGET CHAPTERS PROCESSED SUCCESSFULLY!")

if __name__ == '__main__':
    asyncio.run(main())
