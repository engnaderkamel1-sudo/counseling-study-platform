import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('d27_7.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

items = d[0][0]
print(f"Total items in folder: {len(items)}")

parsed_items = []
for i, item in enumerate(items):
    # item is a list
    # Let's inspect fields
    file_id = None
    if isinstance(item[0], list) and len(item[0]) > 1:
        file_id = item[0][1]
    
    mime_type = None
    if len(item) > 4:
        mime_type = item[4]
    
    # Let's search strings inside item
    # Usually name is at index 2 or 3 or nested
    item_json = json.dumps(item, ensure_ascii=False)
    
    # Let's find name
    name = None
    # Let's check item elements
    for x in item:
        if isinstance(x, str) and x != file_id and x != mime_type and len(x) > 0 and not x.startswith('http') and not x.startswith('application/'):
            name = x
            break
        elif isinstance(x, list):
            for y in x:
                if isinstance(y, str) and y != file_id and y != mime_type and len(y) > 0 and not y.startswith('http') and not y.startswith('application/'):
                    name = y
                    break
            if name: break

    parsed_items.append({
        'index': i,
        'id': file_id,
        'mime': mime_type,
        'name': name,
        'raw_len': len(item)
    })

# Print all
for it in parsed_items:
    print(f"[{it['index']:02d}] ID: {it['id']} | MIME: {it['mime']} | Name: {it['name']}")

with open('parsed_drive_items.json', 'w', encoding='utf-8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)
