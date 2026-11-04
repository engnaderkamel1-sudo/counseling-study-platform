import urllib.request
import json

url = 'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key=AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
req = urllib.request.urlopen(url)
data = json.loads(req.read().decode('utf-8'))
chap4 = data['fields']['audioChapters']['arrayValue']['values'][4]['mapValue']['fields']

with open('chap4_sample.json', 'w', encoding='utf-8') as f:
    json.dump({
        'title': chap4.get('title', {}).get('stringValue', ''),
        'audioUrl': chap4.get('audioUrl', {}).get('stringValue', ''),
        'text_head': chap4.get('text', {}).get('stringValue', '')[:1000],
        'text_total_len': len(chap4.get('text', {}).get('stringValue', ''))
    }, f, ensure_ascii=False, indent=2)

print('SAVED')
