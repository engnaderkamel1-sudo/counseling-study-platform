import sys

with open('src/components/books/ChapterTextViewerModal.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = """    var targetCount = viewingChapterText.subtitlesCount ? parseInt(viewingChapterText.subtitlesCount, 10) : 0;
    try {
      var cached = localStorage.getItem("counsel_cached_subtitles_" + viewingChapterText.id);
      if (cached) {
        var parsed = JSON.parse(cached);
        // التحقق الذكي: لا نعتمد الكاش إلا إذا كان يطابق عدد جمل السحابة المحدث
        if (Array.isArray(parsed) && parsed.length > 0 && (!targetCount || parsed.length === targetCount)) {
          setAsyncSubtitles(parsed);
          return;
        } else {
          try { localStorage.removeItem("counsel_cached_subtitles_" + viewingChapterText.id); } catch (eRem) {}
        }
      }
    } catch (e) {}

    var cloudService = window.CloudSyncService || window.cloudSync;
    if (cloudService && typeof cloudService.getChapterSubtitles === "function") {
      cloudService.getChapterSubtitles(activeBook.id, viewingChapterText.id).then(function(res) {
        if (res && Array.isArray(res) && res.length > 0) {
          setAsyncSubtitles(res);
          try {
            localStorage.setItem("counsel_cached_subtitles_" + viewingChapterText.id, JSON.stringify(res));
          } catch (e) {}
        }
      }).catch(function() {});
    }
  }, [viewingChapterText && viewingChapterText.id, viewingChapterText && viewingChapterText.subtitlesCount, activeBook && activeBook.id]);"""

replacement = """    var targetCount = viewingChapterText.subtitlesCount ? parseInt(viewingChapterText.subtitlesCount, 10) : 0;
    var durKey = viewingChapterText.audioDuration ? Math.round(viewingChapterText.audioDuration) : 0;
    var cacheKey = "counsel_cached_subtitles_v2_" + viewingChapterText.id + "_" + durKey;
    try {
      // إزالة الكاش القديم غير المرتبط بمدة الصوت
      localStorage.removeItem("counsel_cached_subtitles_" + viewingChapterText.id);
      var cached = localStorage.getItem(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0 && (!targetCount || parsed.length === targetCount)) {
          setAsyncSubtitles(parsed);
          return;
        } else {
          try { localStorage.removeItem(cacheKey); } catch (eRem) {}
        }
      }
    } catch (e) {}

    var cloudService = window.CloudSyncService || window.cloudSync;
    if (cloudService && typeof cloudService.getChapterSubtitles === "function") {
      cloudService.getChapterSubtitles(activeBook.id, viewingChapterText.id).then(function(res) {
        if (res && Array.isArray(res) && res.length > 0) {
          setAsyncSubtitles(res);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(res));
          } catch (e) {}
        }
      }).catch(function() {});
    }
  }, [viewingChapterText && viewingChapterText.id, viewingChapterText && viewingChapterText.subtitlesCount, viewingChapterText && viewingChapterText.audioDuration, activeBook && activeBook.id]);"""

content_norm = content.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')
replacement_norm = replacement.replace('\r\n', '\n')

if target_norm in content_norm:
    new_content = content_norm.replace(target_norm, replacement_norm)
    with open('src/components/books/ChapterTextViewerModal.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: Patched ChapterTextViewerModal.js!")
else:
    print("ERROR: Target not found in ChapterTextViewerModal.js")
    sys.exit(1)
