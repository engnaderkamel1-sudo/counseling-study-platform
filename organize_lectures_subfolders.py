import subprocess
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

gdrive_exe = r"C:\Users\nader.reda\.gemini\antigravity\plugin_data\gdrive\bin\gdrive-999922155.exe"
parent_lectures = "15c7wHS9H4CymMD8egGj-8c223bKgKi-w"

# 1. Create subfolders
folders_to_create = [
    "محاضرة 1_أبحاث_الجسد_د_عادل_حليم",
    "محاضرة 2_العلاج_النفسي_الأرثوذكسي",
    "محاضرة 3_تشريح_النفس_الإنسانية_ووظائفها"
]

created = {}
for fname in folders_to_create:
    cmd = [gdrive_exe, "mutate", "mkdir", fname, "--parent", parent_lectures, "--json"]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    try:
        data = json.loads(res.stdout)
        created[fname] = data['id']
        print(f"Created: {fname} -> ID: {data['id']}")
    except Exception as e:
        # try extract ID from output
        print(f"mkdir result for {fname}:", res.stdout.strip() or res.stderr.strip())
        import re
        m = re.search(r'ID:\s*([a-zA-Z0-9_\-]+)', res.stdout)
        if m:
            created[fname] = m.group(1)

print("\nFolder mapping:")
print(created)

# 2. File assignments:
# Body lectures -> Folder 1
f1_id = created["محاضرة 1_أبحاث_الجسد_د_عادل_حليم"]
body_files = [
    "16gL5zqbYoutRpYBYFfor4aHqPixQ3InM",  # الجسد 1
    "1HH4eKcLyUMq5l2A_xrKS0VbY2Sl_bTOe",  # الجسد 2
    "1bBZ1jToW2cT7-OpWT5WKl8DvgbiR86_e",  # الجسد 3
    "1scJ91gBA-sOUPPqwZxXW2YtUt-sp_Jr9"   # الجسد 4
]

for fid in body_files:
    cmd = [gdrive_exe, "mutate", "mv", fid, f1_id]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    print("Moved to Body folder:", r.stdout.strip())

# Orthodox psychotherapy -> Folder 2
f2_id = created["محاضرة 2_العلاج_النفسي_الأرثوذكسي"]
cmd = [gdrive_exe, "mutate", "mv", "1TH5mZmHEpKuISKj_i7_YqtBvCYIYiBOQ", f2_id]
r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
print("Moved to Psychotherapy folder:", r.stdout.strip())

# Human psyche presentation -> Folder 3
f3_id = created["محاضرة 3_تشريح_النفس_الإنسانية_ووظائفها"]
cmd = [gdrive_exe, "mutate", "mv", "1UQpHp3wlJ48eKC2NIo1vI0-rTP2WcrMU", f3_id]
r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
print("Moved to Human Psyche folder:", r.stdout.strip())

print("\nDone organizing lectures into subfolders!")
