import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def clean_name(s):
    try:
        return s.encode('cp437').decode('utf-8')
    except Exception:
        return s

with open('gdrive_all.json', 'r', encoding='utf-16') as f:
    items = json.load(f)

F_RULES = "1tnA2ywvpqJ0627wqvwMdLw43ZcgTwdju"      # 01_اللوائح_والجداول_الدراسية
F_LECTURES = "15c7wHS9H4CymMD8egGj-8c223bKgKi-w"   # 02_المحاضرات_والعروض_الدراسية
F_BOOKS = "1cc_1ZwVPKdK7quwjGeaIpRiYZndZaF5b"      # 03_الكتب_والمراجع_العامة
F_AUDIO = "19R0tojYajPsU5bwJ1igkjlTmXEfc_VJK"      # 04_الكتاب_الصوتي_الروحانية_الناضجة
F_TRASH = "1kJlen1rBtfHrrqC6IMM0PKpwvUiUshWC"      # 99_سلة_المهملات_والأرشيف_المؤقت

created_folders = {F_RULES, F_LECTURES, F_BOOKS, F_AUDIO, F_TRASH}

moves = []

for it in items:
    fid = it['id']
    raw_name = it['name']
    name = clean_name(raw_name)
    mime = it.get('mimeType', '')
    size = int(it.get('size', 0)) if it.get('size') else 0
    
    if fid in created_folders:
        continue

    # Old empty folders
    if mime == 'application/vnd.google-apps.folder':
        moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'مجلد قديم غير مستخدم'))
        continue

    # Test / diagnostic / probe files
    if name.startswith('test') or name.startswith('sample_test'):
        moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'ملف تجارب وفحص قديم'))
        continue

    # book_intro_audio.wav
    if name == 'book_intro_audio.wav':
        moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'ملف صوتي خام غير مضغوط 6 ميجابايت'))
        continue

    # تجربه.mp3
    if 'تجربه' in name:
        moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'تسجيل تجريبي قديم'))
        continue

    # WA0016 files (6 PDFs, 1 Doc, 1 JPG)
    if 'DOC-20260910-WA0016' in name:
        if fid == '1UDNGZC5qUMVd3P9yXdE3yvh09jbI_zXJ':
            moves.append((fid, name, size, F_LECTURES, '02_المحاضرات_والعروض_الدراسية', 'كراسة الدراسة المعتمدة PDF'))
        else:
            moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'نسخة مكررة من كراسة الدراسة'))
        continue

    # Orthodox Psychotherapy: 1 valid, 1 corrupt
    if 'Orthodox' in name:
        if size > 100000 and fid == '1TH5mZmHEpKuISKj_i7_YqtBvCYIYiBOQ':
            moves.append((fid, name, size, F_BOOKS, '03_الكتب_والمراجع_العامة', 'مرجع العلاج النفسي الأرثوذكسي'))
        else:
            moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'نسخة مكررة أو تالفة من المرجع'))
        continue

    # Student Guides / Rules:
    if 'دليل_الدارس' in name:
        if 'جدول_التيرم_الاول' in name:
            if fid == '1VMEf7M67SCigE0L0WtD33d7Mkjgf6Ei9':
                moves.append((fid, name, size, F_RULES, '01_اللوائح_والجداول_الدراسية', 'جدول التيرم الأول المعتمد'))
            else:
                moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'نسخة مكررة من جدول التيرم'))
            continue
        if 'دليل_الثقافى' in name:
            if fid == '1nssrjUuyDxXRgNDjuB22wimJU7UVIJK5':
                moves.append((fid, name, size, F_RULES, '01_اللوائح_والجداول_الدراسية', 'الدليل الثقافي المعتمد'))
            else:
                moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'نسخة مكررة من الدليل الثقافي'))
            continue
        if 'المنهج_الدراسي' in name:
            moves.append((fid, name, size, F_RULES, '01_اللوائح_والجداول_الدراسية', 'المنهج الدراسي وخطة المشورة'))
            continue
        if 'لائحة_معهد_المشورة' in name:
            moves.append((fid, name, size, F_RULES, '01_اللوائح_والجداول_الدراسية', 'لائحة معهد المشورة ونظام الدراسة'))
            continue

    # Doctor Adel Halim - Body lectures
    if 'الجسد' in name:
        # Part 1 duplicate:
        if 'ج1' in name and fid == '1E0Ih65bgkO1JlAiekm4Tw4EnbDnh02zM':
            moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'نسخة مكررة من الجسد ج1'))
            continue
        moves.append((fid, name, size, F_LECTURES, '02_المحاضرات_والعروض_الدراسية', 'محاضرة الجسد د. عادل حليم'))
        continue

    # النفس الانسانية pptx
    if 'النفس' in name:
        moves.append((fid, name, size, F_LECTURES, '02_المحاضرات_والعروض_الدراسية', 'عرض شرائح النفس الإنسانية'))
        continue

    # Bible db
    if 'الكتاب المقدس' in name:
        moves.append((fid, name, size, F_BOOKS, '03_الكتب_والمراجع_العامة', 'قاعدة بيانات أسفار الكتاب المقدس'))
        continue

    # Covers
    if name == 'emotionally_healthy_spirituality_cover.png':
        moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'غلاف كتاب الروحانية الناضجة وجدانياً'))
        continue
    if 'cover_' in name:
        if fid == '14gkDogORWXjrWL8hzrSmLXcZk7qX9kn9':
            moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'غلاف الكتاب المعتمد'))
        else:
            moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'غلاف قديم مكرر'))
        continue

    # Audiobook chapters
    # chapter_0.mp3 -> keep
    if name == 'chapter_0.mp3':
        moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'المقدمة الصوتية المعتمدة'))
        continue
    if 'المقدمة' in name:
        moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'نسخة مكررة من المقدمة'))
        continue

    # chapter_1.mp3 -> keep
    if name == 'chapter_1.mp3':
        moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'الفصل 1'))
        continue
    if 'الفصل_الأول' in name:
        moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'نسخة قديمة مكررة من الفصل 1'))
        continue

    # chapter_2.mp3 -> keep '1FKBLq-v7kqebQNJHLrF1VNXZ9e5S_5k4'
    if name == 'chapter_2.mp3':
        if fid == '1FKBLq-v7kqebQNJHLrF1VNXZ9e5S_5k4':
            moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'الفصل 2'))
        else:
            moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'نسخة مكررة أو تالفة من الفصل 2'))
        continue

    # chapter_3.mp3 -> keep
    if name == 'chapter_3.mp3':
        moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'الفصل 3'))
        continue

    # chapter_4.mp3 -> keep '1FN_37AjlW31VkfVb-Azdz9fUfiiEI_WV'
    if name == 'chapter_4.mp3':
        if fid == '1FN_37AjlW31VkfVb-Azdz9fUfiiEI_WV':
            moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'الفصل 4'))
        else:
            moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'نسخة مكررة أو تالفة من الفصل 4'))
        continue

    if 'الفصل 5' in name:
        moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'الفصل 5'))
        continue
    if 'الفصل 6' in name:
        moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'الفصل 6'))
        continue
    if 'الفصل 7' in name:
        moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'الفصل 7 التالف (0 بايت) بانتظار تجربة المستخدم'))
        continue
    if 'الفصل 8' in name:
        moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'الفصل 8'))
        continue
    if 'الفصل 9' in name:
        moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'الفصل 9'))
        continue
    if 'الفصل 10' in name:
        moves.append((fid, name, size, F_AUDIO, '04_الكتاب_الصوتي_الروحانية_الناضجة', 'الفصل 10'))
        continue

    # Fallback
    moves.append((fid, name, size, F_TRASH, '99_سلة_المهملات', 'ملف إضافي'))

print(f"Total items classified: {len(moves)}")
summary = {}
for m in moves:
    summary[m[4]] = summary.get(m[4], 0) + 1

for folder_name, count in sorted(summary.items()):
    print(f"  {folder_name}: {count} files")

# Check all approved chapters in audio
print("\n--- Audio chapters approved ---")
for m in moves:
    if m[4] == '04_الكتاب_الصوتي_الروحانية_الناضجة':
        print(f"  * {m[5]}: {m[1]} ({m[0]})")

with open('final_move_plan.json', 'w', encoding='utf-8') as f:
    json.dump([{
        'id': m[0],
        'name': m[1],
        'size': m[2],
        'dest_id': m[3],
        'dest_folder': m[4],
        'description': m[5]
    } for m in moves], f, ensure_ascii=False, indent=2)
