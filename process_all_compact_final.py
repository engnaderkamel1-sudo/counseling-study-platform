import asyncio
import edge_tts
import urllib.request
import json
import os
import sys

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

async def generate_chapter_subs(text, idx):
    print(f"[{idx}] Generating subtitles for {len(text)} characters...")
    chunks = split_text_into_chunks(text, max_chars=12000)
    all_s = []
    cum = 0.0

    for c_i, ch in enumerate(chunks):
        comm = edge_tts.Communicate(ch, 'ar-EG-SalmaNeural')
        max_e = 0.0
        async for m in comm.stream():
            if m['type'] == 'SentenceBoundary':
                st = round((m['offset'] / 10000000) + cum, 2)
                du = round(m['duration'] / 10000000, 2)
                en = round(st + du, 2)
                t = m['text'].strip()
                if t:
                    all_s.append(f"{st}|{en}|{t}")
                rel_e = (m['offset'] + m['duration']) / 10000000
                if rel_e > max_e:
                    max_e = rel_e
        cum += max_e
        print(f"[{idx}] Chunk {c_i+1}/{len(chunks)} done. Sentences so far: {len(all_s)}")

    print(f"[{idx}] Completed! Total sentences: {len(all_s)}")
    return all_s

def convert_existing_subs_to_compact(subs_list):
    compact = []
    for s in subs_list:
        if isinstance(s, dict):
            # mapValue in Firestore REST format
            fields = s.get('mapValue', {}).get('fields', {})
            st = fields.get('start', {}).get('doubleValue') or fields.get('start', {}).get('integerValue') or 0
            en = fields.get('end', {}).get('doubleValue') or fields.get('end', {}).get('integerValue') or 0
            t = fields.get('text', {}).get('stringValue', '')
            compact.append(f"{float(st):.2f}|{float(en):.2f}|{t.strip()}")
        elif isinstance(s, str):
            compact.append(s)
    return compact

async def main():
    apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
    bookUrl = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}'
    req = urllib.request.urlopen(bookUrl)
    book_doc = json.loads(req.read().decode('utf-8'))
    chaps = book_doc['fields']['audioChapters']['arrayValue']['values']

    print(f"Loaded book document with {len(chaps)} chapters.")

    # 1. Convert existing chapters [0, 1, 2, 3, 4, 6] to compact
    existing_indices = [0, 1, 2, 3, 4, 6]
    for idx in existing_indices:
        f = chaps[idx]['mapValue']['fields']
        curr_subs = f.get('subtitles', {}).get('arrayValue', {}).get('values', [])
        if curr_subs:
            compact_subs = convert_existing_subs_to_compact(curr_subs)
            print(f"Converted Chapter [{idx}] ({len(curr_subs)} subs) to compact format.")
            f['subtitles'] = {
                'arrayValue': {
                    'values': [{'stringValue': s} for s in compact_subs]
                }
            }
            f['timeOffset'] = {'integerValue': '0'}

    # 2. Generate and store remaining chapters [5, 7, 8, 9, 10]
    remaining_indices = [5, 7, 8, 9, 10]
    for idx in remaining_indices:
        f = chaps[idx]['mapValue']['fields']
        text = f.get('text', {}).get('stringValue', '')
        if not text:
            print(f"Chapter [{idx}] has no text, skipping.")
            continue

        print(f"\n==========================================")
        print(f"PROCESSING REMAINING CHAPTER [{idx}]")
        print(f"==========================================")
        try:
            subs = await generate_chapter_subs(text, idx)
            f['subtitles'] = {
                'arrayValue': {
                    'values': [{'stringValue': s} for s in subs]
                }
            }
            f['timeOffset'] = {'integerValue': '0'}
        except Exception as e:
            print(f"[{idx}] ERROR: {type(e)} {e}")

    # 3. Check payload size and patch to Firestore
    payload_dict = {
        'fields': {
            'audioChapters': {
                'arrayValue': {
                    'values': chaps
                }
            }
        }
    }
    payload_bytes = json.dumps(payload_dict, ensure_ascii=False).encode('utf-8')
    size_kb = len(payload_bytes) / 1024
    print(f"\nFINAL PAYLOAD SIZE: {size_kb:.2f} KB ({len(payload_bytes)} bytes)")
    
    if len(payload_bytes) > 1048576:
        print("WARNING: Payload still exceeds 1MB!")
    else:
        print("EXCELLENT! Payload is safely under the 1MB Firestore limit.")

    patch_url = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}&updateMask.fieldPaths=audioChapters'
    patch_req = urllib.request.Request(patch_url, data=payload_bytes, method='PATCH', headers={'Content-Type': 'application/json; charset=utf-8'})

    with urllib.request.urlopen(patch_req) as resp:
        print(f"FIRESTORE PATCH SUCCESS! Status code: {resp.status}")

    print("\nALL 11 CHAPTERS ARE NOW FULLY SYNCHRONIZED AND SAVED IN FIRESTORE!")

if __name__ == '__main__':
    asyncio.run(main())
