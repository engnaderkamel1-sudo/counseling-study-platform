with open('src/components/books/AudioChaptersView.js', 'r', encoding='utf-8') as f:
    c = f.read()

target = '''              var isSrtGen = (srtGeneratingChapId === chap.id);
              var hasSubs = chap.subtitles && Array.isArray(chap.subtitles) && chap.subtitles.length > 0;
              return React.createElement("button", {
                type: "button",
                onClick: function() { handleGenerateOrDownloadSrt(chap); },
                disabled: isSrtGen || !!audioBatchProgress || (generatingAudioChapterId === chap.id),
                className: "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border " +
                  (isSrtGen
                    ? "bg-violet-600 text-white border-violet-600 shadow-md animate-pulse"
                    : hasSubs
                      ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                      : "bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800 active:scale-95"),
                title: hasSubs ? ("تزامن الـ SRT جاهز ومحفوظ بالمشغل (" + chap.subtitles.length + " جملة) - اضغط للتحديث والتنزيل") : "توليد ملف تزامن الكلمات (SRT) للتحكم الدقيق بالقراءة"
              },
              React.createElement("span", null, isSrtGen ? "⏳" : (hasSubs ? "✅" : "⚡")),
              React.createElement("span", null, isSrtGen ? "جاري ضبط SRT..." : (hasSubs ? ("تحديث الـ SRT (" + chap.subtitles.length + ")") : "توليد الـ SRT"))
              );'''

replacement = '''              var isSrtGen = (srtGeneratingChapId === chap.id);
              var hasSubs = (chap.subtitles && Array.isArray(chap.subtitles) && chap.subtitles.length > 0) || !!chap.hasSubtitles || (chap.subtitlesCount > 0);
              var subsCount = (chap.subtitles && chap.subtitles.length) || chap.subtitlesCount || 0;
              return React.createElement("button", {
                type: "button",
                onClick: function() { handleGenerateOrDownloadSrt(chap); },
                disabled: isSrtGen || !!audioBatchProgress || (generatingAudioChapterId === chap.id),
                className: "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border " +
                  (isSrtGen
                    ? "bg-violet-600 text-white border-violet-600 shadow-md animate-pulse"
                    : hasSubs
                      ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                      : "bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800 active:scale-95"),
                title: hasSubs ? ("تزامن الـ SRT جاهز ومحفوظ بالمشغل (" + subsCount + " جملة) - اضغط للتحديث والتنزيل") : "توليد ملف تزامن الكلمات (SRT) للتحكم الدقيق بالقراءة"
              },
              React.createElement("span", null, isSrtGen ? "⏳" : (hasSubs ? "✅" : "⚡")),
              React.createElement("span", null, isSrtGen ? "جاري ضبط SRT..." : (hasSubs ? ("تحديث الـ SRT (" + subsCount + ")") : "توليد الـ SRT"))
              );'''

if target in c:
    c = c.replace(target, replacement, 1)
    print('Updated button successfully!')
else:
    c = c.replace(target.replace('\n', '\r\n'), replacement.replace('\n', '\r\n'), 1)
    print('Updated button (CRLF) successfully!')

with open('src/components/books/AudioChaptersView.js', 'w', encoding='utf-8') as f:
    f.write(c)
