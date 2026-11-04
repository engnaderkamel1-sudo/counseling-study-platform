import urllib.request
import json
import edge_tts
import asyncio

apiKey = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
bookUrl = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}'
req = urllib.request.urlopen(bookUrl)
book_doc = json.loads(req.read().decode('utf-8'))
chaps = book_doc['fields']['audioChapters']['arrayValue']['values']

# Generate subtitles for Chapter 5 text
text5 = chaps[5]['mapValue']['fields']['text']['stringValue']
print('Chap 5 text length:', len(text5))

# Let's chunk text5
def split_text(text, max_chars=12000):
    paragraphs = text.split('\n')
    chunks = []
    current_chunk = []
    current_len = 0
    for p in paragraphs:
        p_len = len(p) + 1
        if current_len + p_len > max_chars and current_chunk:
            chunks.append('\n'.join(current_chunk))
            current_chunk = [p]
            current_len = p_len
        else:
            current_chunk.append(p)
            current_len += p_len
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    return chunks

async def gen_subs():
    chunks = split_text(text5)
    all_s = []
    cum = 0.0
    for ch in chunks:
        c = edge_tts.Communicate(ch, 'ar-EG-SalmaNeural')
        max_e = 0.0
        async for m in c.stream():
            if m['type'] == 'SentenceBoundary':
                st = round((m['offset']/10000000) + cum, 2)
                du = round(m['duration']/10000000, 2)
                t = m['text'].strip()
                if t:
                    all_s.append({'start': st, 'end': round(st+du, 2), 'text': t})
                rel_e = (m['offset']+m['duration'])/10000000
                if rel_e > max_e:
                    max_e = rel_e
        cum += max_e
    return all_s

subs5 = asyncio.run(gen_subs())
print('Generated sentences for Chap 5:', len(subs5))
# Target duration from earlier audio check was 3978.74
target_dur = 3978.74
raw_e = subs5[-1]['end']
scale = target_dur / raw_e
calibrated = []
for s in subs5:
    calibrated.append({
        'start': round(s['start'] * scale, 2),
        'end': round(s['end'] * scale, 2),
        'text': s['text']
    })
calibrated[-1]['end'] = target_dur

firestore_subs = []
for s in calibrated:
    firestore_subs.append({
        'mapValue': {
            'fields': {
                'start': {'doubleValue': float(s['start'])},
                'end': {'doubleValue': float(s['end'])},
                'text': {'stringValue': str(s['text'])}
            }
        }
    })

chaps[5]['mapValue']['fields']['subtitles'] = {'arrayValue': {'values': firestore_subs}}
chaps[5]['mapValue']['fields']['timeOffset'] = {'integerValue': '0'}

payload = json.dumps({
    'fields': {
        'audioChapters': {
            'arrayValue': {
                'values': chaps
            }
        }
    }
}).encode('utf-8')

print('Payload size with Chap 5 full subs:', len(payload), 'bytes')
patch_url = f'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key={apiKey}&updateMask.fieldPaths=audioChapters'
patch_req = urllib.request.Request(patch_url, data=payload, method='PATCH', headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(patch_req) as resp:
        print('SUCCESS! Patch status for Chap 5:', resp.status)
except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code)
    print('Body:', e.read().decode('utf-8'))
