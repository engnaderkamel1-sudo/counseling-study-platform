with open('src/components/books/ChapterTextViewerModal.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  var [asyncSubtitles, setAsyncSubtitles] = React.useState(function() {
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
  });"""

replacement = """  var [asyncSubtitles, setAsyncSubtitles] = React.useState(function() {
    if (!viewingChapterText) return null;
    if (viewingChapterText.subtitles && Array.isArray(viewingChapterText.subtitles) && viewingChapterText.subtitles.length > 0) {
      return viewingChapterText.subtitles;
    }
    var targetCount = viewingChapterText.subtitlesCount ? parseInt(viewingChapterText.subtitlesCount, 10) : 0;
    var durKey = viewingChapterText.audioDuration ? Math.round(viewingChapterText.audioDuration) : 0;
    var cacheKey = "counsel_cached_subtitles_v2_" + viewingChapterText.id + "_" + durKey;
    try {
      var cached = localStorage.getItem(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0 && (!targetCount || parsed.length === targetCount)) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });"""

content_norm = content.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')
replacement_norm = replacement.replace('\r\n', '\n')

assert target_norm in content_norm, "Target not found!"
new_content = content_norm.replace(target_norm, replacement_norm)
with open('src/components/books/ChapterTextViewerModal.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("SUCCESS: Patched useState asyncSubtitles in ChapterTextViewerModal.js!")
