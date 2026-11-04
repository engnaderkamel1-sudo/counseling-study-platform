import urllib.request
import json

apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
bookUrl = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}'

# 1. Fetch
req = urllib.request.urlopen(bookUrl)
book_doc = json.loads(req.read().decode('utf-8'))
chaps = book_doc['fields']['audioChapters']['arrayValue']['values']
target_idx = 4
chap_fields = chaps[target_idx]['mapValue']['fields']

# 2. Update timeOffset to 0
chap_fields['timeOffset'] = {'integerValue': '0'}

# 3. Patch
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
    print('Firestore PATCH status:', resp.status)
    print('timeOffset successfully set to 0 for Chapter 4 in Firestore!')
