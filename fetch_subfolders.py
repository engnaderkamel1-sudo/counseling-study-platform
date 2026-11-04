import urllib.request
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def get_folder_items(folder_id):
    url = f'https://drive.google.com/drive/folders/{folder_id}'
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
                if len(d) > 27 and d[27] and len(d[27]) > 7 and d[27][7]:
                    return d[27][7][0][0]
    return []

# Fetch for subfolders
subfolders = {
    '1GrwqQzstJq4rs-VCcuyZ-9YyOwhQ-iR0': 'الكتب والمراجع الدراسية',
    '1cMdsmXjHkzrSgETaVJDnEh6g9qg-QnQ-': 'المحاضرات الصوتية والفيديو'
}

for fid, name in subfolders.items():
    print(f"\n==========================================")
    print(f"Subfolder: {name} ({fid})")
    print(f"==========================================")
    items = get_folder_items(fid)
    print(f"Count: {len(items)}")
    for idx, it in enumerate(items):
        item_id = it[0][1]
        mime = it[4]
        file_name = it[35][0][0] if len(it) > 35 and it[35] and it[35][0] else "Unknown"
        # Let's see if file size exists
        # In item, let's search for size if available
        print(f"  [{idx:02d}] {file_name} | MIME: {mime} | ID: {item_id}")
