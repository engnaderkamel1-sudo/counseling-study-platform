import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_KEY = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
BOOK_ID = 'book-1791651887196'
NEW_CHAP_ID = 'chap_1791651928435_10_v2'

# 1. Read clean text and subtitles
with open('chap10_cleaned_text.txt', 'r', encoding='utf-8') as f:
    clean_text = f.read()

with open('backup_subs/sub_chap_1791651928435_10.json', 'r', encoding='utf-8') as f:
    subs = json.load(f)

print(f"Clean text length: {len(clean_text)} chars")
print(f"Subtitles count: {len(subs)}")

# 2. Upload subtitles to NEW subcollection doc: sub_chap_1791651928435_10_v2
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

sub_payload = json.dumps({
    'fields': {
        'chapterId': {'stringValue': NEW_CHAP_ID},
        'subtitles': {
            'arrayValue': {
                'values': firestore_subs
            }
        }
    }
}).encode('utf-8')

sub_url = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{BOOK_ID}/cached_pages/sub_{NEW_CHAP_ID}?key={API_KEY}'
sub_req = urllib.request.Request(sub_url, data=sub_payload, method='PATCH', headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(sub_req) as sub_resp:
    print(f"Uploaded subtitles to cached_pages/sub_{NEW_CHAP_ID}! HTTP Status: {sub_resp.status}")

# 3. Update Book Document
BOOK_URL = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{BOOK_ID}?key={API_KEY}'
req = urllib.request.urlopen(BOOK_URL)
book_doc = json.loads(req.read().decode('utf-8'))
chaps = book_doc['fields']['audioChapters']['arrayValue']['values']

# Verify chapters 0 to 9 are safe
for i in range(10):
    cid = chaps[i]['mapValue']['fields'].get('id', {}).get('stringValue', '')
    title = chaps[i]['mapValue']['fields'].get('title', {}).get('stringValue', '')
    print(f"Verified untouched chap {i}: {cid} - {title[:30]}")

c10 = chaps[10]['mapValue']['fields']
c10['id'] = {'stringValue': NEW_CHAP_ID}
c10['text'] = {'stringValue': clean_text}
c10['audioUrl'] = {'stringValue': 'https://drive.google.com/file/d/1SJ6diy7msVRH1vykrI5nt7iitcGu4tsA/view?usp=drivesdk'}
c10['audioDuration'] = {'doubleValue': 3240.26}
c10['hasSubtitles'] = {'booleanValue': True}
c10['subtitlesCount'] = {'integerValue': str(len(subs))}
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
    print(f"Book Document updated to {NEW_CHAP_ID}! HTTP Status: {resp.status}")

print("ALL DONE 100%!")
