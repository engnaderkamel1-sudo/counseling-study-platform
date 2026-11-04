import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_KEY = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
BOOK_ID = 'book-1791651887196'
BOOK_URL = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{BOOK_ID}?key={API_KEY}'

with open('chap10_cleaned_text.txt', 'r', encoding='utf-8') as f:
    clean_text = f.read()

print(f"Clean text length: {len(clean_text)} characters")

req = urllib.request.urlopen(BOOK_URL)
book_doc = json.loads(req.read().decode('utf-8'))
chaps = book_doc['fields']['audioChapters']['arrayValue']['values']
c10 = chaps[10]['mapValue']['fields']

c10['text'] = {'stringValue': clean_text}
c10['audioUrl'] = {'stringValue': 'https://drive.google.com/file/d/1SJ6diy7msVRH1vykrI5nt7iitcGu4tsA/view?usp=drivesdk'}
c10['audioDuration'] = {'doubleValue': 3240.26}
c10['hasSubtitles'] = {'booleanValue': True}
c10['subtitlesCount'] = {'integerValue': '411'}
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
    print(f"Firestore Chapter 10 updated to clean text! HTTP Status: {resp.status}")
