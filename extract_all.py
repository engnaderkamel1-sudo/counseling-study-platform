import json
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
    
    # Details from it[24]
    modified = ""
    size = ""
    if len(it) > 24 and it[24] and isinstance(it[24], list) and len(it[24]) > 2 and isinstance(it[24][2], list):
        col_list = it[24][2]
        for col in col_list:
            col_str = json.dumps(col, ensure_ascii=False)
            if 'Modified' in col_str or 'أكتوبر' in col_str or 'سبتمبر' in col_str or 'نوفمبر' in col_str or 'ديسمبر' in col_str or 'يناير' in col_str:
                # find the date text
                if len(col) > 2 and col[2] and isinstance(col[2], list) and len(col[2]) > 0 and col[2][0]:
                    modified = str(col[2][0][0])
            if 'Size:' in col_str or 'ميجابايت' in col_str or 'ميغابايت' in col_str or 'كيلوبايت' in col_str or 'بايت' in col_str or 'غيغابايت' in col_str or 'جيجابايت' in col_str:
                if len(col) > 2 and col[2] and isinstance(col[2], list) and len(col[2]) > 0 and col[2][0]:
                    size = str(col[2][0][0])

    extracted.append({
        'index': idx,
        'id': file_id,
        'name': name,
        'mime': mime,
        'size': size,
        'modified': modified
    })

# Save to json
with open('all_drive_files.json', 'w', encoding='utf-8') as f:
    json.dump(extracted, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(extracted)} items:")
for x in extracted:
    print(f"[{x['index']:02d}] {x['name']} | Size: {x['size']} | Mod: {x['modified']} | Mime: {x['mime']} | ID: {x['id']}")
