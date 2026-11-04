import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('parsed_drive_items.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

extracted = []

for idx, it in enumerate(items):
    file_id = it[0][1] if len(it) > 0 and isinstance(it[0], list) and len(it[0]) > 1 else None
    mime = it[4] if len(it) > 4 else "unknown"
    
    # Name
    name = "unknown"
    if len(it) > 35 and it[35] and isinstance(it[35], list) and len(it[35]) > 0 and it[35][0]:
        name = it[35][0][0]
    
    # Search recursively for size and date in it
    raw_str = json.dumps(it, ensure_ascii=False)
    
    # Size patterns
    # e.g., "Size: 5 ميغابايت" or "5 ميغابايت" or "483 كيلوبايت" or "25 ميغابايت"
    size_m = re.findall(r'(\d+(?:\.\d+)?\s*(?:ميغابايت|ميجابايت|كيلوبايت|بايت|غيغابايت|جيجابايت|MB|KB|GB|B))', raw_str)
    size = size_m[0] if size_m else "غير محدد"
    
    # Date patterns (like "17 أكتوبر" or "10 سبتمبر")
    date_m = re.findall(r'(\d+\s*(?:يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر))', raw_str)
    date = date_m[0] if date_m else "غير محدد"

    extracted.append({
        'index': idx,
        'id': file_id,
        'name': name,
        'mime': mime,
        'size': size,
        'date': date
    })

# Print all
print(f"Total: {len(extracted)}")
for x in extracted:
    print(f"[{x['index']:02d}] {x['name']} | الحجم: {x['size']} | التاريخ: {x['date']} | النوع: {x['mime']}")

with open('all_files_clean.json', 'w', encoding='utf-8') as f:
    json.dump(extracted, f, ensure_ascii=False, indent=2)
