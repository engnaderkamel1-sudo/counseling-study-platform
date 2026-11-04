import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('trash_list.json', 'r', encoding='utf-16') as f:
    items = json.load(f)

print(f"Total items in Trash folder: {len(items)}")

# Let's categorize them
categories = {
    'duplicates_pdf': [],
    'duplicates_audio': [],
    'test_files': [],
    'empty_folders': [],
    'other': []
}

for idx, it in enumerate(items, 1):
    name = it.get('name', '')
    size = int(it.get('size', 0)) if it.get('size') else 0
    mime = it.get('mimeType', '')
    fid = it.get('id', '')
    
    entry = f"{name} ({size/(1024*1024):.2f} MB)" if size > 1024*1024 else f"{name} ({size/1024:.1f} KB)"
    
    if mime == 'application/vnd.google-apps.folder':
        categories['empty_folders'].append(entry)
    elif name.startswith('test') or name.startswith('sample'):
        categories['test_files'].append(entry)
    elif any(x in name for x in ['WA0016', 'Copy', 'جدول', 'الثقافى', 'الجسد']):
        categories['duplicates_pdf'].append(entry)
    elif any(x in name for x in ['chapter', 'المقدمة', 'تجربه', 'wav', 'الفصل']):
        categories['duplicates_audio'].append(entry)
    else:
        categories['other'].append(entry)

print("\n--- 1. مجلدات قديمة فارغة ---")
for x in categories['empty_folders']: print("  -", x)

print(f"\n--- 2. ملفات تجارب وفحص واختبار ({len(categories['test_files'])} ملف) ---")
for x in categories['test_files']: print("  -", x)

print(f"\n--- 3. نسخ إضافية مكررة تماماً لمستندات PDF ({len(categories['duplicates_pdf'])} ملف) ---")
for x in categories['duplicates_pdf']: print("  -", x)

print(f"\n--- 4. نسخ إضافية مكررة لتسجيلات صوتية ({len(categories['duplicates_audio'])} ملف) ---")
for x in categories['duplicates_audio']: print("  -", x)

print(f"\n--- 5. أخرى ({len(categories['other'])} ملف) ---")
for x in categories['other']: print("  -", x)
