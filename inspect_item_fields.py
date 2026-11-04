import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('parsed_drive_items.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

for idx in [0, 1, 2, 4, 10, 18, 29, 30]:
    it = items[idx]
    print(f"=== Item {idx} ===")
    print(f"ID: {it[0][1]}")
    # print all non-none elements and their indices
    for j, val in enumerate(it):
        if val is not None:
            s = json.dumps(val, ensure_ascii=False)
            if len(s) > 120:
                s = s[:120] + "..."
            print(f"  [{j}]: {s}")
