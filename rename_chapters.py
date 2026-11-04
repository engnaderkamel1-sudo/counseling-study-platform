import subprocess
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

gdrive_exe = r"C:\Users\nader.reda\.gemini\antigravity\plugin_data\gdrive\bin\gdrive-999922155.exe"

renames = [
    ("11bD627DxRmvHuvwmZVEk14vSKYAHwWzz", "الفصل_00_المقدمة.mp3"),
    ("1uDgf9joeg6uhtdZVZMt37jAQ_oXTGs8q", "الفصل_01_إدراك_روحانية_قمة_جبل_الجليد.mp3"),
    ("1FKBLq-v7kqebQNJHLrF1VNXZ9e5S_5k4", "الفصل_02_الأعراض_العشرة_للروحانية_غير_الناضجة.mp3"),
    ("1H3xwNdQkg6EPhDYYdLLY-9QUaO3Wj_nU", "الفصل_03_الترياق_الثوري_كيف_تهدئ_نفسك.mp3"),
    ("1FN_37AjlW31VkfVb-Azdz9fUfiiEI_WV", "الفصل_04_اعرف_نفسك_لتعرف_الله.mp3"),
    ("1fevVED1xlVcRk4SgFc4MUuF6QsCFjWc4", "الفصل_05_الرجوع_إلى_الوراء_للتقدم_نحو_الأمام.mp3"),
    ("1jFOPJRK5Vq-TSjByIby5Jg5FWg-z953G", "الفصل_06_رحلة_عبر_الجدار.mp3"),
    ("1GCyUaSgFM95skneni0B2L59h8CLmhtOu", "الفصل_07_كيف_للخسارة_والنوح_أن_يفتحا_آفاق_النفس.mp3"),
    ("1RLCY3J-ryUVNvED3hOhDZGfBVVHhO89P", "الفصل_08_اكتشاف_إيقاعات_البرنامج_اليومي_والسبت_الأسبوعي.mp3"),
    ("1X0rXNvYPBt83I3uasxixHtEdXV2WzFYQ", "الفصل_09_النمو_إلى_شخص_راشد_وناضج.mp3"),
    ("199zsrmXT0PEq8gtOovLphGpz6YnxsQDk", "الفصل_10_الخطوة_التالية_كيف_نضع_قانون_الحياة.mp3"),
    ("14gkDogORWXjrWL8hzrSmLXcZk7qX9kn9", "غلاف_كتاب_الروحانية_الناضجة_وجدانياً.jpg"),
]

for idx, (fid, new_name) in enumerate(renames, 1):
    cmd = [gdrive_exe, "mutate", "rename", fid, new_name]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    if res.returncode == 0:
        print(f"[{idx:02d}/{len(renames)}] OK -> {new_name}")
    else:
        print(f"[{idx:02d}/{len(renames)}] ERR -> {new_name}: {res.stderr.strip()}")
    time.sleep(0.5)

print("Done renaming all chapters!")
