import urllib.request
import json

apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
bookUrl = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}'
req = urllib.request.urlopen(bookUrl)
book_doc = json.loads(req.read().decode('utf-8'))
chaps = book_doc['fields']['audioChapters']['arrayValue']['values']

# Load chap5 subtitles
import asyncio, edge_tts
# Let's see what happens if we patch with chap5 subs
with open('chap5_test.json', 'w') as f:
    f.write('{}')

patch_url = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}&updateMask.fieldPaths=audioChapters'

# Dummy test with 1 subtitle in chap 5
chaps[5]['mapValue']['fields']['subtitles'] = {
    'arrayValue': {
        'values': [
            {'mapValue': {'fields': {'start': {'doubleValue': 0.0}, 'end': {'doubleValue': 1.0}, 'text': {'stringValue': 'test'}}}}
        ]
    }
}

payload = json.dumps({
    'fields': {
        'audioChapters': {
            'arrayValue': {
                'values': chaps
            }
        }
    }
}).encode('utf-8')

print('Payload size:', len(payload))
patch_req = urllib.request.Request(patch_url, data=payload, method='PATCH', headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(patch_req) as resp:
        print('Status:', resp.status)
except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code)
    print('Body:', e.read().decode('utf-8'))
