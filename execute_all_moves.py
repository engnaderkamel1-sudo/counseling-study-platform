import json
import subprocess
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

gdrive_exe = r"C:\Users\nader.reda\.gemini\antigravity\plugin_data\gdrive\bin\gdrive-999922155.exe"

with open('final_move_plan.json', 'r', encoding='utf-8') as f:
    plan = json.load(f)

print(f"Total files to move: {len(plan)}")

success = 0
failed = 0

for idx, item in enumerate(plan, 1):
    fid = item['id']
    name = item['name']
    dest_id = item['dest_id']
    dest_folder = item['dest_folder']
    
    # Run gdrive mutate mv
    cmd = [gdrive_exe, "mutate", "mv", fid, dest_id]
    
    ok = False
    for attempt in range(2):
        res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        if res.returncode == 0:
            ok = True
            break
        else:
            time.sleep(1)
            
    if ok:
        success += 1
        print(f"[{idx:02d}/{len(plan)}] OK -> {dest_folder}: {name[:35]}")
    else:
        failed += 1
        print(f"[{idx:02d}/{len(plan)}] ERR -> {name[:35]}: {res.stderr.strip()[:80]}")

print("=" * 60)
print(f"COMPLETE! Success: {success}, Failed: {failed}")
