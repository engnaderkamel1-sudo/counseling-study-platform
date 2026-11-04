with open('src/components/books/ChapterTextViewerModal.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix line 1144-1146
target1 = """              ((viewingChapterText && viewingChapterText.subtitles && viewingChapterText.subtitles.length > 0) || (asyncSubtitles && asyncSubtitles.length > 0))
                ? React.createElement("span", { className: "px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]" }, "🎯 متزامن بدقة (" + viewingChapterText.subtitles.length + " جملة)")
                : React.createElement("span", { className: "px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-[10px]" }, "تزامن تقديري (لم يتم حفظ SRT)")"""

replacement1 = """              ((viewingChapterText && viewingChapterText.subtitles && viewingChapterText.subtitles.length > 0) || (asyncSubtitles && asyncSubtitles.length > 0) || (viewingChapterText && viewingChapterText.subtitlesCount > 0))
                ? React.createElement("span", { className: "px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]" }, "🎯 متزامن بدقة (" + ((asyncSubtitles && asyncSubtitles.length) || (viewingChapterText && viewingChapterText.subtitles && viewingChapterText.subtitles.length) || (viewingChapterText && viewingChapterText.subtitlesCount) || 0) + " جملة)")
                : React.createElement("span", { className: "px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-[10px]" }, "تزامن تقديري (لم يتم حفظ SRT)")"""

# 2. Fix line 281
target2 = """    var subs = viewingChapterText && viewingChapterText.subtitles;"""
replacement2 = """    var subs = (asyncSubtitles && asyncSubtitles.length > 0) ? asyncSubtitles : (viewingChapterText && viewingChapterText.subtitles);"""

content_norm = content.replace('\r\n', '\n')
target1_norm = target1.replace('\r\n', '\n')
replacement1_norm = replacement1.replace('\r\n', '\n')

assert target1_norm in content_norm, "Target 1 not found!"
assert target2 in content_norm, "Target 2 not found!"

content_norm = content_norm.replace(target1_norm, replacement1_norm)
content_norm = content_norm.replace(target2, replacement2)

with open('src/components/books/ChapterTextViewerModal.js', 'w', encoding='utf-8') as f:
    f.write(content_norm)

print("SUCCESS: Patched ChapterTextViewerModal.js!")
