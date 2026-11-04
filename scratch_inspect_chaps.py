import urllib.request
import json
import sys

url = 'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key=AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
req = urllib.request.urlopen(url)
data = json.loads(req.read().decode('utf-8'))
chaps = data['fields']['audioChapters']['arrayValue']['values']

info = []
for idx, c in enumerate(chaps):
    f = c['mapValue']['fields']
    title = f.get('title', {}).get('stringValue', '')
    cid = f.get('id', {}).get('stringValue', '')
    aurl = f.get('audioUrl', {}).get('stringValue', '')
    text = f.get('text', {}).get('stringValue', '')
    has_subs = 'subtitles' in f
    subs_count = len(f['subtitles'].get('arrayValue', {}).get('values', [])) if has_subs else 0
    info.append({
        'index': idx,
        'id': cid,
        'title': title,
        'audioUrl': aurl,
        'textLength': len(text),
        'subsCount': subs_count
    })

with open('scratch_chaps.json', 'w', encoding='utf-8') as out:
    json.dump(info, out, ensure_ascii=False, indent=2)

print('SUCCESS')
