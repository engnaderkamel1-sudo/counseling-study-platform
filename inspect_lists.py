import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('data_3.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for idx in [3, 7, 15, 23, 27]:
    val = data[idx]
    val_str = json.dumps(val, ensure_ascii=False)
    print(f"Index {idx}: length {len(val)}, json length {len(val_str)}")
    if len(val) > 0:
        first = val[0]
        first_str = json.dumps(first, ensure_ascii=False)
        print(f"  First item type: {type(first)}, length {len(first) if isinstance(first, list) else len(first_str)}")
        print(f"  Snippet: {first_str[:200]}")
