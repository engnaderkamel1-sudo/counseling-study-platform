import urllib.request
import json
import os

def update_firestore():
    if not os.path.exists('chap4_full_subtitles.json'):
        print('chap4_full_subtitles.json not found yet.')
        return

    with open('chap4_full_subtitles.json', 'r', encoding='utf-8') as f:
        subs = json.load(f)

    print(f'Loading {len(subs)} subtitles for Chapter 4...')
    
    # 1. Fetch current book
    apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
    bookUrl = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}'
    
    req = urllib.request.urlopen(bookUrl)
    book_doc = json.loads(req.read().decode('utf-8'))
    
    chaps = book_doc['fields']['audioChapters']['arrayValue']['values']
    target_idx = 4
    chap_fields = chaps[target_idx]['mapValue']['fields']
    print('Target chapter index:', target_idx)

    # Format subtitles into Firestore REST format
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

    chap_fields['subtitles'] = {
        'arrayValue': {
            'values': firestore_subs
        }
    }

    # Prepare PATCH payload
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
        print('Successfully saved subtitles to Firestore!')

if __name__ == '__main__':
    update_firestore()
