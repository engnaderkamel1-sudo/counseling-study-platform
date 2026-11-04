import os

# 1. Update src/services/edgeTtsService.js
with open('src/services/edgeTtsService.js', 'r', encoding='utf-8') as f:
    edge_code = f.read()

accurate_sub_fn = '''  },

  // -------------------------------------------------------------
  // 7. توليد توقيتات دقيقة وحقيقية للجمل مع معايرة طول الصوت الفعلي
  // -------------------------------------------------------------
  generateAccurateSubtitles: async function(text, targetDuration, onProgress) {
    var self = this;
    try {
      var genRes = await self.generateAudioForText(text, null, onProgress);
      var subs = (genRes && Array.isArray(genRes.subtitles)) ? genRes.subtitles : [];
      if (!subs || subs.length === 0) {
        if (typeof self._buildSubtitlesForChunk === "function" && targetDuration > 0) {
          subs = self._buildSubtitlesForChunk(text, 0, targetDuration);
        }
      }
      if (subs && subs.length > 0 && targetDuration && targetDuration > 0) {
        var maxEnd = subs[subs.length - 1].end;
        if (maxEnd > 0 && Math.abs(targetDuration - maxEnd) > 0.5) {
          var scale = targetDuration / maxEnd;
          subs = subs.map(function(s) {
            return {
              start: Math.round(s.start * scale * 100) / 100,
              end: Math.round(s.end * scale * 100) / 100,
              text: s.text
            };
          });
        }
      }
      return subs;
    } catch (e) {
      console.warn("Failed generating accurate subtitles with EdgeTtsService, fallback needed:", e);
      return null;
    }
  }
};'''

if 'generateAccurateSubtitles:' not in edge_code:
    # Replace last closing of EdgeTtsService
    target = '    };\n  }\n};'
    if target in edge_code:
        edge_code = edge_code.replace(target, '    };\n  }' + accurate_sub_fn, 1)
    else:
        target_crlf = '    };\r\n  }\r\n};'
        if target_crlf in edge_code:
            edge_code = edge_code.replace(target_crlf, '    };\r\n  }' + accurate_sub_fn.replace('\n', '\r\n'), 1)
        else:
            print('Could not find target in edgeTtsService.js')
            
    with open('src/services/edgeTtsService.js', 'w', encoding='utf-8') as f:
        f.write(edge_code)
    print('Updated src/services/edgeTtsService.js')
else:
    print('generateAccurateSubtitles already in edgeTtsService.js')

# 2. Update src/components/books/AudioChaptersView.js
with open('src/components/books/AudioChaptersView.js', 'r', encoding='utf-8') as f:
    view_code = f.read()

old_single = 'var generatedSubs = generateSubtitlesFromDuration(targetChap.text, dur);'
new_single = '''var generatedSubs = null;
      if (window.EdgeTtsService && typeof window.EdgeTtsService.generateAccurateSubtitles === "function") {
        generatedSubs = await window.EdgeTtsService.generateAccurateSubtitles(targetChap.text, dur);
      }
      if (!generatedSubs || generatedSubs.length === 0) {
        generatedSubs = generateSubtitlesFromDuration(targetChap.text, dur);
      }'''

old_batch = 'var subs = generateSubtitlesFromDuration(curChap.text, dur);'
new_batch = '''var subs = null;
          if (window.EdgeTtsService && typeof window.EdgeTtsService.generateAccurateSubtitles === "function") {
            subs = await window.EdgeTtsService.generateAccurateSubtitles(curChap.text, dur);
          }
          if (!subs || subs.length === 0) {
            subs = generateSubtitlesFromDuration(curChap.text, dur);
          }'''

if old_single in view_code:
    view_code = view_code.replace(old_single, new_single, 1)
    print('Replaced single chapter SRT in AudioChaptersView.js')

if old_batch in view_code:
    view_code = view_code.replace(old_batch, new_batch, 1)
    print('Replaced batch SRT in AudioChaptersView.js')

with open('src/components/books/AudioChaptersView.js', 'w', encoding='utf-8') as f:
    f.write(view_code)

# 3. Update src/components/books/ChapterTextViewerModal.js
with open('src/components/books/ChapterTextViewerModal.js', 'r', encoding='utf-8') as f:
    modal_code = f.read()

old_modal = 'var subs = generateSubtitlesFromDuration(viewingChapterText.text, dur);'
new_modal = '''var subs = null;
      if (window.EdgeTtsService && typeof window.EdgeTtsService.generateAccurateSubtitles === "function") {
        subs = await window.EdgeTtsService.generateAccurateSubtitles(viewingChapterText.text, dur);
      }
      if (!subs || subs.length === 0) {
        subs = generateSubtitlesFromDuration(viewingChapterText.text, dur);
      }'''

if old_modal in modal_code:
    modal_code = modal_code.replace(old_modal, new_modal, 1)
    print('Replaced modal SRT in ChapterTextViewerModal.js')

with open('src/components/books/ChapterTextViewerModal.js', 'w', encoding='utf-8') as f:
    f.write(modal_code)

print('ALL CODE UPDATES COMPLETED SUCCESSFULLY!')
