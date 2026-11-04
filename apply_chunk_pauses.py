import json
import urllib.request

with open('chap4_full_subtitles.json', 'r', encoding='utf-8') as f:
    subs = json.load(f)

print('Total subtitles loaded:', len(subs))

# Boundaries from process_chunks_chap4:
# Chunk 1: 165 items (0..164)
# Chunk 2: 167 items (165..331)
# Chunk 3: 162 items (332..493)
# Chunk 4: 140 items (494..633)
# Chunk 5: 15 items  (634..648)

shifts = [
    (0, 165, 0.0),       # Chunk 1: no shift
    (165, 332, 1.8),     # Chunk 2: +1.8s
    (332, 494, 3.8),     # Chunk 3: +3.8s (covers minute 46)
    (494, 634, 5.2),     # Chunk 4: +5.2s
    (634, 649, 6.43)     # Chunk 5: +6.43s
]

calibrated_subs = []
for start_idx, end_idx, shift in shifts:
    for i in range(start_idx, end_idx):
        item = subs[i]
        calibrated_subs.append({
            'start': round(item['start'] + shift, 2),
            'end': round(item['end'] + shift, 2),
            'text': item['text']
        })

print('First subtitle:', calibrated_subs[0]['start'], '->', calibrated_subs[0]['end'])
# Check minute 46 area
m46_items = [s for s in calibrated_subs if 2750 <= s['start'] <= 2780]
print('Minute 46 sample count:', len(m46_items))
if m46_items:
    print('Sample around min 46:', m46_items[0]['start'], '->', m46_items[0]['end'])
print('Last subtitle:', calibrated_subs[-1]['start'], '->', calibrated_subs[-1]['end'])

# Save to json
with open('chap4_calibrated_subtitles.json', 'w', encoding='utf-8') as out:
    json.dump(calibrated_subs, out, ensure_ascii=False, indent=2)

# Now update Firestore
apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
bookUrl = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}'

req = urllib.request.urlopen(bookUrl)
book_doc = json.loads(req.read().decode('utf-8'))
chaps = book_doc['fields']['audioChapters']['arrayValue']['values']
target_idx = 4
chap_fields = chaps[target_idx]['mapValue']['fields']

firestore_subs = []
for s in calibrated_subs:
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
chap_fields['timeOffset'] = {'integerValue': '0'}

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
    print('Successfully updated Chapter 4 with calibrated subtitles!')
