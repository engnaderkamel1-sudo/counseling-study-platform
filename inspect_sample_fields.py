import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('parsed_drive_items.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

print(f"Total items: {len(items)}")

# Let's inspect all fields of an item to find size, modified time, etc.
sample = items[2] # A PDF file
for i, val in enumerate(sample):
    if val is not None:
        print(f"[{i}]: {val}")
