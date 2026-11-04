import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('d27_7.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

print("d len:", len(d))
elem0 = d[0]
print("elem0 type:", type(elem0), "len:", len(elem0) if isinstance(elem0, list) else "N/A")

for idx, x in enumerate(elem0):
    print(f"[{idx}] type: {type(x)}, len: {len(x) if isinstance(x, list) else ''}")
    if isinstance(x, list) and len(x) > 1:
        print(f"   sample: {json.dumps(x[0], ensure_ascii=False)[:100]}")
