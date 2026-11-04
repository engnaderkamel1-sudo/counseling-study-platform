import urllib.request
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = 'https://drive.google.com/drive/folders/1zqzWL7HvWVtWJ3xiPCsxLB8ChzkASpjw?sort=14&direction=d'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
req = urllib.request.Request(url, headers=headers)
html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')

matches = re.findall(r'AF_initDataCallback\(({.*?})\);\s*</script>', html, re.DOTALL)
for m in matches:
    if 'ds:3' in m:
        data_m = re.search(r"data:\s*(\[.*\])\s*,\s*sideChannel", m, re.DOTALL)
        if not data_m:
            data_m = re.search(r"data:\s*(\[.*\])\s*\}\s*$", m, re.DOTALL)
        if data_m:
            d = json.loads(data_m.group(1))
            items = d[27][7][0][0]
            print(f"Extracted {len(items)} items in reverse order!")
            with open('reverse_drive_items.json', 'w', encoding='utf-8') as f:
                json.dump(items, f, ensure_ascii=False, indent=2)
            break
