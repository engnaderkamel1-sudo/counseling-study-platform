import asyncio
import urllib.request
import json
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_KEY = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
BOOK_ID = 'book-1791651887196'
BOOK_URL = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{BOOK_ID}?key={API_KEY}'

from sync_all_to_subcollection import align_chapter_edge_tts, save_subtitles_to_subcollection

async def main():
    print("Fetching book from Firestore...", flush=True)
    req = urllib.request.urlopen(BOOK_URL)
    book_doc = json.loads(req.read().decode('utf-8'))
    chaps = book_doc['fields']['audioChapters']['arrayValue']['values']
    c10 = chaps[10]['mapValue']['fields']
    text10 = c10.get('text', {}).get('stringValue', '')

    print(f"Original Chapter 10 text length: {len(text10)} characters", flush=True)
    
    # 1. Clean duplicate block while preserving 100% of the original text
    lines = text10.split('\n')
    # Duplicate block is lines 35:64 and the stray heading line 75
    # Let's verify line contents exactly:
    assert 'كتبَ باخوميوس' in lines[34], f"Unexpected line 34: {lines[34]}"
    assert 'القانون أحياناً' in lines[65] or 'القانون أحيانًا' in lines[65], f"Unexpected line 65: {lines[65]}"
    
    cleaned_lines = lines[:35] + lines[65:]
    # Remove stray duplicate heading 'الخطوة التالية: كيف نضع "قانون الحياة" لأنفسنا' that was inside Saint Francis paragraph
    cleaned_lines_final = []
    for l in cleaned_lines:
        if l.strip() == 'الخطوة التالية: كيف نضع "قانون الحياة" لأنفسنا' and len(cleaned_lines_final) > 30:
            print("Removed stray heading inside paragraph:", l, flush=True)
            continue
        cleaned_lines_final.append(l)

    cleaned_text = '\n'.join(cleaned_lines_final)
    print(f"Cleaned Chapter 10 text length: {len(cleaned_text)} characters (removed {len(text10) - len(cleaned_text)} duplicate chars)", flush=True)

    with open('chap10_cleaned_text.txt', 'w', encoding='utf-8') as f:
        f.write(cleaned_text)

    # 2. Update Firestore text for Chapter 10
    c10['text'] = {'stringValue': cleaned_text}
    print("Updating Chapter 10 text in Firestore...", flush=True)
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
        print(f"Firestore text updated successfully! Status: {resp.status}", flush=True)

    # 3. Generate accurate subtitles for cleaned text with Edge TTS
    aurl = c10.get('audioUrl', {}).get('stringValue', '')
    m = re.search(r'/file/d/([a-zA-Z0-9_-]+)', aurl) or re.search(r'id=([a-zA-Z0-9_-]+)', aurl)
    drive_id = m.group(1) if m else ''
    chap_id = c10.get('id', {}).get('stringValue', 'chap_1791651928435_10')

    print(f"\nNow generating accurate subtitles for Chapter 10 ({drive_id})...", flush=True)
    subs = await align_chapter_edge_tts(cleaned_text, drive_id, 10)
    print(f"Generated {len(subs)} sentences for cleaned Chapter 10!", flush=True)

    # 4. Save to subcollection and local backup
    with open(f'backup_subs/sub_{chap_id}.json', 'w', encoding='utf-8') as f_bak:
        json.dump(subs, f_bak, ensure_ascii=False, indent=2)

    status = save_subtitles_to_subcollection(chap_id, subs)
    print(f"Uploaded to cached_pages/sub_{chap_id} with status: {status}", flush=True)

    # 5. Update subtitlesCount on book document
    c10['subtitlesCount'] = {'integerValue': str(len(subs))}
    c10['hasSubtitles'] = {'booleanValue': True}
    c10['timeOffset'] = {'integerValue': '0'}
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
        print(f"Updated subtitlesCount to {len(subs)}! Status: {resp.status}", flush=True)

    print("\nCHAPTER 10 CLEANING AND REALIGNMENT COMPLETED 100%!", flush=True)

if __name__ == '__main__':
    asyncio.run(main())
