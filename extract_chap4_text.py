import urllib.request
import json

url = 'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key=AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
req = urllib.request.urlopen(url)
data = json.loads(req.read().decode('utf-8'))
chap4 = data['fields']['audioChapters']['arrayValue']['values'][4]['mapValue']['fields']
text = chap4.get('text', {}).get('stringValue', '')

with open('chap4_text.txt', 'w', encoding='utf-8') as f:
    f.write(text)

print(f'Saved chap4_text.txt ({len(text)} characters)')
