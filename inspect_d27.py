import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('data_3.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

d27 = data[27]
for idx, x in enumerate(d27):
    x_str = json.dumps(x, ensure_ascii=False) if x is not None else "null"
    print(f"data[27][{idx}]: type={type(x)}, len={len(x) if isinstance(x, list) else len(x_str)}")

# If one of them is a list of files:
for idx, x in enumerate(d27):
    if isinstance(x, list) and len(x) > 0:
        print(f"data[27][{idx}] has {len(x)} items")
        with open(f'data_27_{idx}_sample.json', 'w', encoding='utf-8') as sf:
            json.dump(x[0], sf, ensure_ascii=False, indent=2)
