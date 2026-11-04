import urllib.request
import json

apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
bookUrl = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}'
req = urllib.request.urlopen(bookUrl)
data = json.loads(req.read().decode('utf-8'))
fields = data['fields']

print('Fields in book doc:', list(fields.keys()))
chaps = fields['audioChapters']['arrayValue']['values']
print('Total chaps:', len(chaps))

for i, c in enumerate(chaps):
    f = c['mapValue']['fields']
    text_len = len(f.get('text', {}).get('stringValue', ''))
    subs = f.get('subtitles', {}).get('arrayValue', {}).get('values', [])
    # calculate size of this chapter in json
    c_bytes = len(json.dumps(c).encode('utf-8'))
    print(f'Chap [{i}]: text_len={text_len} | subs_count={len(subs)} | json_size={c_bytes} bytes ({c_bytes/1024:.1f} KB)')
