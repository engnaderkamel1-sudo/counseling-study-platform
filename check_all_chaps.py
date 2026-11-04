import urllib.request
import json
import re

apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
bookUrl = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}'

req = urllib.request.urlopen(bookUrl)
data = json.loads(req.read().decode('utf-8'))
chaps = data['fields']['audioChapters']['arrayValue']['values']

print(f'Total chapters in book: {len(chaps)}')
for idx, c in enumerate(chaps):
    f = c['mapValue']['fields']
    aurl = f.get('audioUrl', {}).get('stringValue', '')
    text = f.get('text', {}).get('stringValue', '')
    subs = f.get('subtitles', {}).get('arrayValue', {}).get('values', [])
    m = re.search(r'/file/d/([a-zA-Z0-9_-]+)', aurl) or re.search(r'id=([a-zA-Z0-9_-]+)', aurl)
    fid = m.group(1) if m else ''
    print(f'[{idx}] chars={len(text)} | drive_id={fid} | existing_subs={len(subs)}')
