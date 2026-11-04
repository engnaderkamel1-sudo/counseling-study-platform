import json
import urllib.request
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('all_drive_files.json', 'r', encoding='utf-8') as f:
    files = json.load(f)

# Let's check sizes by doing HEAD request on download url for each file
print(f"Checking sizes for {len(files)} items...")

results = []
for it in files:
    fid = it['id']
    name = it['name']
    mime = it['mime']
    
    if mime == 'application/vnd.google-apps.folder':
        results.append({**it, 'size_bytes': 0, 'size_mb': 0})
        continue
        
    url = f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"
    size = None
    try:
        req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            cl = resp.headers.get('Content-Length')
            if cl:
                size = int(cl)
    except Exception as e:
        # Fallback to GET preview or just ignore
        pass
    
    size_mb = round(size / (1024 * 1024), 2) if size else 0
    results.append({**it, 'size_bytes': size or 0, 'size_mb': size_mb})
    print(f"[{len(results)}/{len(files)}] {name[:40]} -> {size_mb} MB")

with open('files_with_sizes.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Done! Total size calculated.")
