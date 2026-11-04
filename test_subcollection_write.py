import urllib.request
import json

apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
bookId = 'book-1791651887196'
chapId = 'chap_1791651928434_5'

url = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{bookId}/chapter_subtitles/{chapId}?key={apiKey}'

payload = json.dumps({
    'fields': {
        'chapterId': {'stringValue': chapId},
        'subtitles': {
            'arrayValue': {
                'values': [
                    {'stringValue': '0.10|3.50|تجربة التخزين في المستند الفرعي المستقل.'}
                ]
            }
        }
    }
}).encode('utf-8')

req = urllib.request.Request(url, data=payload, method='PATCH', headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as resp:
        print('Subcollection write status:', resp.status)
        data = json.loads(resp.read().decode('utf-8'))
        print('Created document name:', data.get('name'))
except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code)
    print('Body:', e.read().decode('utf-8'))
