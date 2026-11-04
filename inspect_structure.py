import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('data_3.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# The structure of Google Drive folder data in data_3:
# Let's see the top-level keys or elements
print("Type of data:", type(data))
if isinstance(data, list):
    print("Length of root list:", len(data))
    for idx, item in enumerate(data):
        print(f"Index {idx} type: {type(item)}, len: {len(item) if isinstance(item, list) else 'N/A'}")

# Let's write a recursive finder for file objects
# A file item usually has an array where item[0] is file ID (or item[0] is array), item[1] is name or similar.
# Let's inspect data[0]
with open('data_3_sample.json', 'w', encoding='utf-8') as sf:
    json.dump(data[0] if isinstance(data, list) else data, sf, ensure_ascii=False, indent=2)

print("Saved sample to data_3_sample.json")
