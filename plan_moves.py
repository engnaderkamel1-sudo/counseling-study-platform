import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('gdrive_all.json', 'r', encoding='utf-16') as f:
    items = json.load(f)

# Folder IDs:
F_RULES = "1tnA2ywvpqJ0627wqvwMdLw43ZcgTwdju"      # 01_اللوائح_والجداول_الدراسية
F_LECTURES = "15c7wHS9H4CymMD8egGj-8c223bKgKi-w"   # 02_المحاضرات_والعروض_الدراسية
F_BOOKS = "1cc_1ZwVPKdK7quwjGeaIpRiYZndZaF5b"      # 03_الكتب_والمراجع_العامة
F_AUDIO = "19R0tojYajPsU5bwJ1igkjlTmXEfc_VJK"      # 04_الكتاب_الصوتي_الروحانية_الناضجة
F_TRASH = "1kJlen1rBtfHrrqC6IMM0PKpwvUiUshWC"      # 99_سلة_المهملات_والأرشيف_المؤقت

# Newly created folders (skip moving them)
created_folders = {F_RULES, F_LECTURES, F_BOOKS, F_AUDIO, F_TRASH}

plan = []

for it in items:
    fid = it['id']
    name = it['name']
    mime = it.get('mimeType', '')
    size = int(it.get('size', 0))
    
    if fid in created_folders:
        continue

    # Old empty folders -> Move to trash/archive or keep
    if mime == 'application/vnd.google-apps.folder':
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (مجلد قديم)'})
        continue

    # Damaged files (0 bytes or few bytes)
    if size < 100 and name not in ['test_diag.txt']:
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (ملف تالف)'})
        continue

    # Test files
    if name.startswith('test') or name.startswith('sample_test'):
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (ملف تجارب)'})
        continue

    # Duplicate or wav audio files:
    if name == 'book_intro_audio.wav':
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (ملف صوتي خام غير مضغوط)'})
        continue

    if 'تجربه.mp3' in name:
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (صوت تجريبي)'})
        continue

    # Multiple identical WA0016
    # Let's keep 1 PDF in 02_Lectures, move the other 5 PDFs, the doc, and the jpg to trash
    # Let's see which PDF to keep: '1UDNGZC5qUMVd3P9yXdE3yvh09jbI_zXJ'
    if 'DOC-20260910-WA0016' in name:
        if fid == '1UDNGZC5qUMVd3P9yXdE3yvh09jbI_zXJ':
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_LECTURES, 'dest_name': '02_المحاضرات (كراسة الدراسة المعتمدة)'})
        else:
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (نسخة مكررة من كراسة الدراسة)'})
        continue

    # Duplicate chapters:
    # chapter_2.mp3: keep '1FKBLq-v7kqebQNJHLrF1VNXZ9e5S_5k4', trash the other two
    if name == 'chapter_2.mp3':
        if fid == '1FKBLq-v7kqebQNJHLrF1VNXZ9e5S_5k4':
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (الفصل 2)'})
        else:
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (نسخة مكررة من فصل 2)'})
        continue

    # chapter_4.mp3: keep '1FN_37AjlW31VkfVb-Azdz9fUfiiEI_WV', trash the other two
    if name == 'chapter_4.mp3':
        if fid == '1FN_37AjlW31VkfVb-Azdz9fUfiiEI_WV':
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (الفصل 4)'})
        else:
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (نسخة مكررة من فصل 4)'})
        continue

    # المقدمة:
    # There are multiple:
    # 4 copies of 'الروحانية الناضجة وجدانياً_المقدمة.mp3'
    # 1 of 'الروحانية الناضجة وجدانياً - المقدمة.mp3' (2.9 MB, id: 1mEDja-YAeB1fydzQSn28g8s5EZTHojX5)
    # 1 of 'chapter_0.mp3' (2.9 MB, id: 11bD627DxRmvHuvwmZVEk14vSKYAHwWzz)
    # Let's keep chapter_0.mp3 ('11bD627DxRmvHuvwmZVEk14vSKYAHwWzz') as the approved intro in 04_Audio!
    # And trash the duplicates!
    if 'المقدمة' in name:
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (نسخة مكررة من المقدمة)'})
        continue

    if name == 'chapter_0.mp3':
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (المقدمة المعتمدة)'})
        continue

    if name == 'chapter_1.mp3':
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (الفصل 1)'})
        continue

    if 'الروحانية الناضجة وجدانياً_الفصل_الأول' in name:
        # Duplicate of chapter 1
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (نسخة قديمة مكررة من فصل 1)'})
        continue

    if name == 'chapter_3.mp3':
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (الفصل 3)'})
        continue

    # Chapters 5, 6, 7, 8, 9, 10:
    if 'الفصل 5' in name:
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (الفصل 5)'})
        continue
    if 'الفصل 6' in name:
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (الفصل 6)'})
        continue
    if 'الفصل 7' in name:
        # User explicitly requested: Do not generate it, and the existing one is 0 bytes! Move the 0-byte file to trash!
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (فصل 7 تالف 0 بايت)'})
        continue
    if 'الفصل 8' in name:
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (الفصل 8)'})
        continue
    if 'الفصل 9' in name:
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (الفصل 9)'})
        continue
    if 'الفصل 10' in name:
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (الفصل 10)'})
        continue

    # Covers:
    # keep 'emotionally_healthy_spirituality_cover.png' in 04_Audio
    # cover_1791708603520.jpg vs cover_1792846293667.jpg -> keep one, trash duplicate
    if name == 'emotionally_healthy_spirituality_cover.png':
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (غلاف الكتاب الأصلي)'})
        continue
    if 'cover_' in name:
        if fid == '14gkDogORWXjrWL8hzrSmLXcZk7qX9kn9': # latest 24 Oct
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_AUDIO, 'dest_name': '04_الكتاب_الصوتي (غلاف الكتاب الحديث)'})
        else:
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (غلاف قديم مكرر)'})
        continue

    # Doctor Adel Halim body lectures:
    if 'الجسد' in name:
        # Notice part 1 has 2 duplicates: '16gL5zqbYoutRpYBYFfor4aHqPixQ3InM' and '1E0Ih65bgkO1JlAiekm4Tw4EnbDnh02zM'
        if fid == '1E0Ih65bgkO1JlAiekm4Tw4EnbDnh02zM':
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (نسخة مكررة من الجسد ج1)'})
        else:
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_LECTURES, 'dest_name': '02_المحاضرات (بحث الجسد د. عادل حليم)'})
        continue

    # النفس الانسانية pptx:
    if 'النفس' in name:
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_LECTURES, 'dest_name': '02_المحاضرات (عرض شرائح النفس الإنسانية)'})
        continue

    # Orthodox psychotherapy:
    if 'Orthodox' in name:
        if size > 1000:
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_BOOKS, 'dest_name': '03_الكتب_والمراجع (مرجع العلاج النفسي الأرثوذكسي)'})
        else:
            plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (ملف تالف 1 بايت)'})
        continue

    # Bible db:
    if 'الكتاب المقدس' in name:
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_BOOKS, 'dest_name': '03_الكتب_والمراجع (قاعدة بيانات أسفار الكتاب المقدس)'})
        continue

    # Student Guides / Schedule:
    if 'دليل_الدارس' in name:
        # Check duplicate schedule:
        if 'جدول_التيرم_الاول' in name:
            if fid == '1VMEf7M67SCigE0L0WtD33d7Mkjgf6Ei9': # keep later
                plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_RULES, 'dest_name': '01_اللوائح_والجداول (جدول التيرم الأول)'})
            else:
                plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (نسخة مكررة من جدول التيرم)'})
            continue

        if 'دليل_الثقافى' in name:
            if fid == '1nssrjUuyDxXRgNDjuB22wimJU7UVIJK5': # keep later
                plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_RULES, 'dest_name': '01_اللوائح_والجداول (الدليل الثقافي)'})
            else:
                plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (نسخة مكررة من الدليل الثقافي)'})
            continue

        # Other guides (Curriculum plan, bylaws):
        plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_RULES, 'dest_name': '01_اللوائح_والجداول (دليل ولوائح المعهد)'})
        continue

    # Fallback:
    plan.append({'id': fid, 'name': name, 'size': size, 'dest': F_TRASH, 'dest_name': '99_سلة_المهملات (ملف غير مصنف)'})

print(f"Total files in organization plan: {len(plan)}")

by_dest = {}
for p in plan:
    d = p['dest_name'].split(' ')[0]
    by_dest[d] = by_dest.get(d, 0) + 1

for d, c in sorted(by_dest.items()):
    print(f"  Folder {d}: {c} files")

with open('organize_plan.json', 'w', encoding='utf-8') as f:
    json.dump(plan, f, ensure_ascii=False, indent=2)
