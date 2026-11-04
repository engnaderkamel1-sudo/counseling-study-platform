import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

api_key = "AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8"
book_id = "book-1791651887196"
doc_url = f"https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{book_id}?key={api_key}"

req = urllib.request.Request(doc_url)
with urllib.request.urlopen(req) as resp:
    doc = json.loads(resp.read().decode('utf-8'))

chaps = doc["fields"]["audioChapters"]["arrayValue"]["values"]
print(f"Total chapters in Firestore: {len(chaps)}")

correct_mappings = {
    0: "https://drive.google.com/file/d/11bD627DxRmvHuvwmZVEk14vSKYAHwWzz/view?usp=drivesdk",  # chapter_0.mp3
    1: "https://drive.google.com/file/d/1uDgf9joeg6uhtdZVZMt37jAQ_oXTGs8q/view?usp=drivesdk",  # chapter_1.mp3
    2: "https://drive.google.com/file/d/1FKBLq-v7kqebQNJHLrF1VNXZ9e5S_5k4/view?usp=drivesdk",  # chapter_2.mp3
    3: "https://drive.google.com/file/d/1H3xwNdQkg6EPhDYYdLLY-9QUaO3Wj_nU/view?usp=drivesdk",  # chapter_3.mp3
    4: "https://drive.google.com/file/d/1FN_37AjlW31VkfVb-Azdz9fUfiiEI_WV/view?usp=drivesdk",  # chapter_4.mp3
    5: "https://drive.google.com/file/d/1fevVED1xlVcRk4SgFc4MUuF6QsCFjWc4/view?usp=drivesdk",  # الفصل 5
    6: "https://drive.google.com/file/d/1jFOPJRK5Vq-TSjByIby5Jg5FWg-z953G/view?usp=drivesdk",  # الفصل 6
    7: "",                                                                                        # الفصل 7 (Empty for user test)
    8: "https://drive.google.com/file/d/1RLCY3J-ryUVNvED3hOhDZGfBVVHhO89P/view?usp=drivesdk",  # الفصل 8
    9: "https://drive.google.com/file/d/1X0rXNvYPBt83I3uasxixHtEdXV2WzFYQ/view?usp=drivesdk",  # الفصل 9
    10: "https://drive.google.com/file/d/199zsrmXT0PEq8gtOovLphGpz6YnxsQDk/view?usp=drivesdk"  # الفصل 10
}

for idx, c in enumerate(chaps):
    title = c["mapValue"]["fields"]["title"]["stringValue"]
    new_url = correct_mappings[idx]
    c["mapValue"]["fields"]["audioUrl"] = {"stringValue": new_url}
    print(f"Chap {idx}: {title[:30]} -> {new_url if new_url else '[EMPTY - WAITING FOR USER TEST]'}")

patch_url = f"https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/{book_id}?key={api_key}&updateMask.fieldPaths=audioChapters"
payload = json.dumps({
    "fields": {
        "audioChapters": {
            "arrayValue": {
                "values": chaps
            }
        }
    }
}).encode('utf-8')

patch_req = urllib.request.Request(patch_url, data=payload, headers={"Content-Type": "application/json"}, method="PATCH")
with urllib.request.urlopen(patch_req) as resp:
    res = json.loads(resp.read().decode('utf-8'))

print("\nSUCCESS! Firestore updated perfectly with corrected chapter audio mappings!")
