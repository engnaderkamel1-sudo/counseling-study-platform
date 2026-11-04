import json
import math
import urllib.request

API_KEY = 'AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8'
BOOK_ID = 'book-1791651887196'
CHAP_ID = 'chap_1791651928434_5'

with open('backup_subs/sub_chap_1791651928434_5.json', 'r', encoding='utf-8') as f:
    subs = json.load(f)

N = len(subs) # 551
target_dur = 3978.74
max_shift = 7.15 # seconds to advance highlighting in middle

calibrated = []
prev_end = 0.0

for i, s in enumerate(subs):
    if i <= 250:
        shift = max_shift * math.sin((math.pi / 2) * (i / 150)) if i < 150 else max_shift
    else:
        shift = max_shift * (1.0 - ((i - 250) / (N - 1 - 250)))

    # shift > 0 means sentence starts earlier (advancing highlight)
    orig_start = s['start']
    orig_end = s['end']
    orig_dur = max(0.5, orig_end - orig_start)

    new_start = max(0.1, orig_start - shift)
    if new_start < prev_end:
        new_start = prev_end

    new_end = new_start + orig_dur
    if i == N - 1:
        new_end = target_dur

    prev_end = new_end
    calibrated.append({
        'start': round(new_start, 2),
        'end': round(new_end, 2),
        'text': s['text']
    })

calibrated[-1]['end'] = target_dur

print(f"Calibrated {len(calibrated)} sentences for Chap 5:")
print(f"Sentence 0: {calibrated[0]['start']} -> {calibrated[0]['end']}")
print(f"Sentence 98: {calibrated[98]['start']} -> {calibrated[98]['end']} (was {subs[98]['start']})")
print(f"Sentence 100: {calibrated[100]['start']} -> {calibrated[100]['end']} (was {subs[100]['start']})")
print(f"Sentence 550: {calibrated[-1]['start']} -> {calibrated[-1]['end']}")

# Save calibrated to local backup
with open('backup_subs/sub_chap_1791651928434_5.json', 'w', encoding='utf-8') as f:
    json.dump(calibrated, f, ensure_ascii=False, indent=2)

# Upload to Firestore cached_pages/sub_chap_1791651928434_5
from sync_all_to_subcollection import save_subtitles_to_subcollection
status = save_subtitles_to_subcollection(CHAP_ID, calibrated)
print(f"Uploaded calibrated Chap 5 to Firestore! Status: {status}")
