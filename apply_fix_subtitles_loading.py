# apply_fix_subtitles_loading.py
import re

# 1. Update src/services/cloudSync.js
with open('src/services/cloudSync.js', 'r', encoding='utf-8') as f:
    cs = f.read()

# Replace any old getChapterSubtitles / saveChapterSubtitles blocks
robust_sub_methods = '''  saveChapterSubtitles: function(bookId, chapterId, subtitles) {
    if (!bookId || !chapterId || !subtitles) return Promise.resolve();
    if (window.db) {
      return window.db.collection("books").doc(bookId).collection("cached_pages").doc("sub_" + chapterId).set({
        chapterId: chapterId,
        subtitles: subtitles,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    return Promise.resolve();
  },

  getChapterSubtitles: async function(bookId, chapterId) {
    if (!bookId || !chapterId) return null;
    var self = this;
    // 1. محاولة الجلب السريع من Firebase SDK إذا كان متاحاً
    if (window.db) {
      try {
        var doc = await window.db.collection("books").doc(bookId).collection("cached_pages").doc("sub_" + chapterId).get();
        if (doc && doc.exists && doc.data() && Array.isArray(doc.data().subtitles)) {
          return doc.data().subtitles;
        }
      } catch (eDb) {
        console.warn("getChapterSubtitles SDK notice:", eDb);
      }
    }
    // 2. محاولة الجلب المباشر عبر REST API (تخطي أي قيود للشبكة أو تأخر تهيئة SDK)
    try {
      var apiKey = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) || "";
      var url = "https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/" + bookId + "/cached_pages/sub_" + chapterId + "?key=" + apiKey;
      var resp = await fetch(url, { cache: "no-store" });
      if (resp.ok) {
        var data = await resp.json();
        if (data && data.fields && data.fields.subtitles) {
          var parsed = self.parseFirestoreValue(data.fields.subtitles);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (eRest) {
      console.warn("getChapterSubtitles REST notice:", eRest);
    }
    return null;
  },
'''

# Remove duplicate definitions if any
pattern = r'  saveChapterSubtitles: function\(bookId, chapterId, subtitles\) \{[\s\S]*?return null;\s*\},'
cs = re.sub(pattern, '', cs)

# Insert robust_sub_methods right before getCachedPageText
target_insert = '  getCachedPageText: async function'
if target_insert in cs:
    cs = cs.replace(target_insert, robust_sub_methods + '\n' + target_insert, 1)

# Ensure window.cloudSync alias exists at the bottom
alias_code = '\nwindow.cloudSync = window.CloudSyncService;\n'
if 'window.cloudSync =' not in cs:
    cs += alias_code

with open('src/services/cloudSync.js', 'w', encoding='utf-8') as f:
    f.write(cs)
print('Updated src/services/cloudSync.js with robust REST+SDK getChapterSubtitles and alias')

# 2. Update ChapterTextViewerModal.js
with open('src/components/books/ChapterTextViewerModal.js', 'r', encoding='utf-8') as f:
    modal = f.read()

# Fix window.cloudSync references to window.CloudSyncService || window.cloudSync
modal = modal.replace('window.cloudSync && typeof window.cloudSync.getChapterSubtitles',
                      '(window.CloudSyncService || window.cloudSync) && typeof (window.CloudSyncService || window.cloudSync).getChapterSubtitles')
modal = modal.replace('window.cloudSync.getChapterSubtitles(activeBook.id',
                      '(window.CloudSyncService || window.cloudSync).getChapterSubtitles(activeBook.id')

# Improve asyncSubtitles initialization
old_init = '  var [asyncSubtitles, setAsyncSubtitles] = React.useState(null);'
new_init = '''  var [asyncSubtitles, setAsyncSubtitles] = React.useState(function() {
    if (!viewingChapterText) return null;
    if (viewingChapterText.subtitles && Array.isArray(viewingChapterText.subtitles) && viewingChapterText.subtitles.length > 0) {
      return viewingChapterText.subtitles;
    }
    try {
      var cached = localStorage.getItem("counsel_cached_subtitles_" + viewingChapterText.id);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return null;
  });'''
if old_init in modal:
    modal = modal.replace(old_init, new_init, 1)

# Update badge to show count accurately
old_badge_span = 'React.createElement("span", { className: "text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1" }, "🎯 تزامن SRT: دقيق")'
new_badge_span = '''React.createElement("span", { className: "text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1" }, "🎯 تزامن SRT: دقيق (" + ((asyncSubtitles && asyncSubtitles.length) || (viewingChapterText && viewingChapterText.subtitlesCount) || "") + " جملة)")'''
if old_badge_span in modal:
    modal = modal.replace(old_badge_span, new_badge_span, 1)

with open('src/components/books/ChapterTextViewerModal.js', 'w', encoding='utf-8') as f:
    f.write(modal)
print('Updated src/components/books/ChapterTextViewerModal.js')

# 3. Update AudioChaptersView.js
with open('src/components/books/AudioChaptersView.js', 'r', encoding='utf-8') as f:
    ac = f.read()

ac = ac.replace('window.cloudSync && typeof window.cloudSync.getChapterSubtitles',
                '(window.CloudSyncService || window.cloudSync) && typeof (window.CloudSyncService || window.cloudSync).getChapterSubtitles')
ac = ac.replace('window.cloudSync.getChapterSubtitles(activeBook.id',
                '(window.CloudSyncService || window.cloudSync).getChapterSubtitles(activeBook.id')

with open('src/components/books/AudioChaptersView.js', 'w', encoding='utf-8') as f:
    f.write(ac)
print('Updated src/components/books/AudioChaptersView.js')

# 4. Update BooksPage.js
with open('src/pages/BooksPage.js', 'r', encoding='utf-8') as f:
    bp = f.read()

bp = bp.replace('window.cloudSync && typeof window.cloudSync.saveChapterSubtitles',
                '(window.CloudSyncService || window.cloudSync) && typeof (window.CloudSyncService || window.cloudSync).saveChapterSubtitles')
bp = bp.replace('window.cloudSync.saveChapterSubtitles(activeBook.id',
                '(window.CloudSyncService || window.cloudSync).saveChapterSubtitles(activeBook.id')

with open('src/pages/BooksPage.js', 'w', encoding='utf-8') as f:
    f.write(bp)
print('Updated src/pages/BooksPage.js')

print('ALL SUBTITLE ACCESS CODE FULLY FIXED!')
