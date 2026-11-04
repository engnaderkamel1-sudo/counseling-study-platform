with open('src/components/books/ChapterTextViewerModal.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''  // حالة إزاحة تزامن الصوت مع النص (Time Shift بالثواني مع الكسور مثل +1.5s أو -2s)'''
pos = text.find(target)
end_str = '}, [viewingChapterText && viewingChapterText.id]);'
end_pos = text.find(end_str, pos) + len(end_str)

new_block = '''  // حالة إزاحة تزامن الصوت مع النص (الاعتماد دائماً وبشكل قطعي على الإعداد السحابي المعتمد للفصل)
  var [timeOffset, setTimeOffset] = React.useState(function() {
    if (viewingChapterText && viewingChapterText.timeOffset !== undefined) {
      return parseFloat(viewingChapterText.timeOffset) || 0;
    }
    return 0;
  });

  var [showOffsetPanel, setShowOffsetPanel] = React.useState(false);
  var [isSavingOffset, setIsSavingOffset] = React.useState(false);
  var [offsetSavedNotice, setOffsetSavedNotice] = React.useState("");
  var [srtNotice, setSrtNotice] = React.useState("");
  var [asyncSubtitles, setAsyncSubtitles] = React.useState(function() {
    if (!viewingChapterText) return null;
    if (viewingChapterText.subtitles && Array.isArray(viewingChapterText.subtitles) && viewingChapterText.subtitles.length > 0) {
      return viewingChapterText.subtitles;
    }
    var targetCount = viewingChapterText.subtitlesCount ? parseInt(viewingChapterText.subtitlesCount, 10) : 0;
    try {
      var cached = localStorage.getItem("counsel_cached_subtitles_" + viewingChapterText.id);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0 && (!targetCount || parsed.length === targetCount)) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  React.useEffect(function() {
    if (!viewingChapterText || !activeBook) return;
    var subs = viewingChapterText.subtitles;
    if (subs && Array.isArray(subs) && subs.length > 0) {
      setAsyncSubtitles(subs);
      return;
    }
    var targetCount = viewingChapterText.subtitlesCount ? parseInt(viewingChapterText.subtitlesCount, 10) : 0;
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
  }, [viewingChapterText && viewingChapterText.id, viewingChapterText && viewingChapterText.subtitlesCount, activeBook && activeBook.id]);
  var [isGeneratingSrt, setIsGeneratingSrt] = React.useState(false);

  // تحديث الإزاحة عند تغيير الفصل: الاعتماد دائماً وبشكل قطعي على الإعداد السحابي المعتمد للفصل
  React.useEffect(function() {
    if (viewingChapterText) {
      var cloudOffset = (viewingChapterText.timeOffset !== undefined) ? (parseFloat(viewingChapterText.timeOffset) || 0) : 0;
      setTimeOffset(cloudOffset);
    }
  }, [viewingChapterText && viewingChapterText.id, viewingChapterText && viewingChapterText.timeOffset]);'''

updated_text = text[:pos] + new_block + text[end_pos:]
with open('src/components/books/ChapterTextViewerModal.js', 'w', encoding='utf-8') as f:
    f.write(updated_text)

print('Updated ChapterTextViewerModal.js with smart cache validation and cloud-authoritative offset!')
