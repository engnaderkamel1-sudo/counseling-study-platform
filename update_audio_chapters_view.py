# Update AudioChaptersView.js with subcollection and hasSubtitles awareness
with open('src/components/books/AudioChaptersView.js', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. handle fetch in download
t1 = '''    if (existingSubs && Array.isArray(existingSubs) && existingSubs.length > 0) {
      downloadSubtitlesAsFile(existingSubs);
      return;
    }'''

r1 = '''    if ((!existingSubs || !Array.isArray(existingSubs) || existingSubs.length === 0) && (targetChap.hasSubtitles || targetChap.subtitlesCount)) {
      if (window.cloudSync && typeof window.cloudSync.getChapterSubtitles === "function" && activeBook && activeBook.id) {
        try {
          var fetchedSubs = await window.cloudSync.getChapterSubtitles(activeBook.id, targetChap.id);
          if (fetchedSubs && Array.isArray(fetchedSubs) && fetchedSubs.length > 0) {
            existingSubs = fetchedSubs;
            targetChap.subtitles = fetchedSubs;
          }
        } catch (eF) {}
      }
    }

    if (existingSubs && Array.isArray(existingSubs) && existingSubs.length > 0) {
      downloadSubtitlesAsFile(existingSubs);
      return;
    }'''

# 2. pendingChaps
t2 = '''    var pendingChaps = readyChaps.filter(function(c) {
      return !c.subtitles || !Array.isArray(c.subtitles) || c.subtitles.length === 0;
    });'''

r2 = '''    var pendingChaps = readyChaps.filter(function(c) {
      return (!c.subtitles || !Array.isArray(c.subtitles) || c.subtitles.length === 0) && !c.hasSubtitles && !c.subtitlesCount;
    });'''

# 3. missingSrtCount
t3 = 'var missingSrtCount = audioAndTextChaps.filter(function(c) { return !c.subtitles || !Array.isArray(c.subtitles) || c.subtitles.length === 0; }).length;'
r3 = 'var missingSrtCount = audioAndTextChaps.filter(function(c) { return (!c.subtitles || !Array.isArray(c.subtitles) || c.subtitles.length === 0) && !c.hasSubtitles && !c.subtitlesCount; }).length;'

# 4. badge
t4 = '''                // 3. شارة حالة ملف التزامن SRT
                (function() {
                  var hasSubs = chap.subtitles && Array.isArray(chap.subtitles) && chap.subtitles.length > 0;
                  var hasAudio = chap.audioUrl && chap.audioUrl.trim();
                  if (hasSubs) {
                    return React.createElement("span", {
                      className: "text-violet-700 dark:text-violet-300 font-bold bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-md border border-violet-200 dark:border-violet-800 text-[11px] flex items-center gap-1"
                    }, "🎯 تزامن SRT: دقيق (" + chap.subtitles.length + " جملة)");'''

r4 = '''                // 3. شارة حالة ملف التزامن SRT
                (function() {
                  var hasSubs = (chap.subtitles && Array.isArray(chap.subtitles) && chap.subtitles.length > 0) || !!chap.hasSubtitles || (chap.subtitlesCount > 0);
                  var subsCount = (chap.subtitles && chap.subtitles.length) || chap.subtitlesCount || 0;
                  var hasAudio = chap.audioUrl && chap.audioUrl.trim();
                  if (hasSubs) {
                    return React.createElement("span", {
                      className: "text-violet-700 dark:text-violet-300 font-bold bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-md border border-violet-200 dark:border-violet-800 text-[11px] flex items-center gap-1"
                    }, "🎯 تزامن SRT: دقيق (" + subsCount + " جملة)");'''

# 5. button
t5 = '''              var isSrtGen = (srtGeneratingChapId === chap.id);
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
                      : "bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800") +
                  ((isSrtGen || !!audioBatchProgress || (generatingAudioChapterId === chap.id)) ? " opacity-50 cursor-not-allowed" : ""),
                title: hasSubs ? ("تزامن الـ SRT جاهز ومحفوظ بالمشغل (" + chap.subtitles.length + " جملة) - اضغط للتحديث والتنزيل") : "توليد ملف تزامن الكلمات (SRT) للتحكم الدقيق بالقراءة"
              },
                isSrtGen
                  ? React.createElement("span", { className: "w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" })
                  : React.createElement("svg", { className: "w-3.5 h-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" })
                    ),
                React.createElement("span", null, isSrtGen ? "جاري ضبط SRT..." : (hasSubs ? ("تحديث الـ SRT (" + chap.subtitles.length + ")") : "توليد الـ SRT"))
              );'''

r5 = '''              var isSrtGen = (srtGeneratingChapId === chap.id);
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
                      : "bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800") +
                  ((isSrtGen || !!audioBatchProgress || (generatingAudioChapterId === chap.id)) ? " opacity-50 cursor-not-allowed" : ""),
                title: hasSubs ? ("تزامن الـ SRT جاهز ومحفوظ بالمشغل (" + subsCount + " جملة) - اضغط للتحديث والتنزيل") : "توليد ملف تزامن الكلمات (SRT) للتحكم الدقيق بالقراءة"
              },
                isSrtGen
                  ? React.createElement("span", { className: "w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" })
                  : React.createElement("svg", { className: "w-3.5 h-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" })
                    ),
                React.createElement("span", null, isSrtGen ? "جاري ضبط SRT..." : (hasSubs ? ("تحديث الـ SRT (" + subsCount + ")") : "توليد الـ SRT"))
              );'''

for t, r, name in [(t1, r1, 'fetch in download'), (t2, r2, 'pendingChaps'), (t3, r3, 'missingSrtCount'), (t4, r4, 'badge'), (t5, r5, 'button')]:
    if t in c:
        c = c.replace(t, r, 1)
        print(f'Replaced {name}')
    else:
        tcrlf = t.replace('\n', '\r\n')
        rcrlf = r.replace('\n', '\r\n')
        if tcrlf in c:
            c = c.replace(tcrlf, rcrlf, 1)
            print(f'Replaced {name} (CRLF)')
        else:
            print(f'NOT FOUND: {name}')

with open('src/components/books/AudioChaptersView.js', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done updating AudioChaptersView.js')
