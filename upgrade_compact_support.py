# Update ChapterTextViewerModal.js and AudioChaptersView.js to support both string ("start|end|text") and object ({start, end, text})

# 1. ChapterTextViewerModal.js
with open('src/components/books/ChapterTextViewerModal.js', 'r', encoding='utf-8') as f:
    modal_code = f.read()

old_segments_map = '''      return viewingChapterText.subtitles.map(function(sub, idx) {
        var sStart = typeof sub.start === "number" ? sub.start : (parseFloat(sub.start) || 0);
        var sEnd = typeof sub.end === "number" ? sub.end : (parseFloat(sub.end) || 0);
        return {
          id: idx,
          text: sub.text,
          startTime: sStart,
          endTime: sEnd,
          startRatio: (localDuration > 0) ? (sStart / localDuration) : 0,
          endRatio: (localDuration > 0) ? (sEnd / localDuration) : 0
        };
      });'''

new_segments_map = '''      return viewingChapterText.subtitles.map(function(sub, idx) {
        var sStart = 0, sEnd = 0, sText = "";
        if (typeof sub === "string") {
          var p = sub.split("|");
          sStart = parseFloat(p[0]) || 0;
          sEnd = parseFloat(p[1]) || 0;
          sText = p.slice(2).join("|").trim();
        } else if (sub && typeof sub === "object") {
          sStart = typeof sub.start === "number" ? sub.start : (parseFloat(sub.start) || 0);
          sEnd = typeof sub.end === "number" ? sub.end : (parseFloat(sub.end) || 0);
          sText = (sub.text || "").trim();
        }
        return {
          id: idx,
          text: sText,
          startTime: sStart,
          endTime: sEnd,
          startRatio: (localDuration > 0) ? (sStart / localDuration) : 0,
          endRatio: (localDuration > 0) ? (sEnd / localDuration) : 0
        };
      });'''

if old_segments_map in modal_code:
    modal_code = modal_code.replace(old_segments_map, new_segments_map, 1)
    print('Updated segments mapping in ChapterTextViewerModal.js')
else:
    # Try CRLF
    old_crlf = old_segments_map.replace('\n', '\r\n')
    if old_crlf in modal_code:
        modal_code = modal_code.replace(old_crlf, new_segments_map.replace('\n', '\r\n'), 1)
        print('Updated segments mapping (CRLF) in ChapterTextViewerModal.js')

old_export_map = '''    var content = subs.map(function(item, idx) {
      return (idx + 1) + "\\n" +
        formatSrtTime(item.start) + " --> " + formatSrtTime(item.end) + "\\n" +
        item.text.trim() + "\\n";
    }).join("\\n");'''

new_export_map = '''    var content = subs.map(function(item, idx) {
      var sStart = 0, sEnd = 0, sText = "";
      if (typeof item === "string") {
        var p = item.split("|");
        sStart = parseFloat(p[0]) || 0;
        sEnd = parseFloat(p[1]) || 0;
        sText = p.slice(2).join("|").trim();
      } else if (item && typeof item === "object") {
        sStart = typeof item.start === "number" ? item.start : (parseFloat(item.start) || 0);
        sEnd = typeof item.end === "number" ? item.end : (parseFloat(item.end) || 0);
        sText = (item.text || "").trim();
      }
      return (idx + 1) + "\\n" +
        formatSrtTime(sStart) + " --> " + formatSrtTime(sEnd) + "\\n" +
        sText + "\\n";
    }).join("\\n");'''

if old_export_map in modal_code:
    modal_code = modal_code.replace(old_export_map, new_export_map, 1)
    print('Updated export mapping in ChapterTextViewerModal.js')
else:
    old_crlf_exp = old_export_map.replace('\n', '\r\n')
    if old_crlf_exp in modal_code:
        modal_code = modal_code.replace(old_crlf_exp, new_export_map.replace('\n', '\r\n'), 1)
        print('Updated export mapping (CRLF) in ChapterTextViewerModal.js')

with open('src/components/books/ChapterTextViewerModal.js', 'w', encoding='utf-8') as f:
    f.write(modal_code)

# 2. AudioChaptersView.js
with open('src/components/books/AudioChaptersView.js', 'r', encoding='utf-8') as f:
    view_code = f.read()

old_view_export = '''      var content = subsList.map(function(item, idx) {
        return (idx + 1) + "\\n" +
          formatSrtTime(item.start) + " --> " + formatSrtTime(item.end) + "\\n" +
          item.text.trim() + "\\n";
      }).join("\\n");'''

new_view_export = '''      var content = subsList.map(function(item, idx) {
        var sStart = 0, sEnd = 0, sText = "";
        if (typeof item === "string") {
          var p = item.split("|");
          sStart = parseFloat(p[0]) || 0;
          sEnd = parseFloat(p[1]) || 0;
          sText = p.slice(2).join("|").trim();
        } else if (item && typeof item === "object") {
          sStart = typeof item.start === "number" ? item.start : (parseFloat(item.start) || 0);
          sEnd = typeof item.end === "number" ? item.end : (parseFloat(item.end) || 0);
          sText = (item.text || "").trim();
        }
        return (idx + 1) + "\\n" +
          formatSrtTime(sStart) + " --> " + formatSrtTime(sEnd) + "\\n" +
          sText + "\\n";
      }).join("\\n");'''

if old_view_export in view_code:
    view_code = view_code.replace(old_view_export, new_view_export, 1)
    print('Updated export mapping in AudioChaptersView.js')
else:
    old_crlf_view = old_view_export.replace('\n', '\r\n')
    if old_crlf_view in view_code:
        view_code = view_code.replace(old_crlf_view, new_view_export.replace('\n', '\r\n'), 1)
        print('Updated export mapping (CRLF) in AudioChaptersView.js')

with open('src/components/books/AudioChaptersView.js', 'w', encoding='utf-8') as f:
    f.write(view_code)

print('FRONTEND SUBTITLE SUPPORT COMPACT FORMAT UPDATED SUCCESSFULLY!')
