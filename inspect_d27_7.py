import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('data_3.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

item = data[27][7]
print("Type:", type(item), "len:", len(item))
# Let's save item to d27_7.json
with open('d27_7.json', 'w', encoding='utf-8') as f:
    json.dump(item, f, ensure_ascii=False, indent=2)

print("Saved d27_7.json")
