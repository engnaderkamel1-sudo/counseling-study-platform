# Apply subcollection support across cloudSync.js, BooksPage.js, and ChapterTextViewerModal.js

# 1. cloudSync.js
with open('src/services/cloudSync.js', 'r', encoding='utf-8') as f:
    cs = f.read()

sub_methods = '''  saveChapterSubtitles: function(bookId, chapterId, subtitles) {
    if (!window.db || !bookId || !chapterId || !subtitles) return Promise.resolve();
    return window.db.collection("books").doc(bookId).collection("cached_pages").doc("sub_" + chapterId).set({
      chapterId: chapterId,
      subtitles: subtitles,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  },

  getChapterSubtitles: async function(bookId, chapterId) {
    if (!window.db || !bookId || !chapterId) return null;
    try {
      var doc = await window.db.collection("books").doc(bookId).collection("cached_pages").doc("sub_" + chapterId).get();
      if (doc.exists && doc.data() && Array.isArray(doc.data().subtitles)) {
        return doc.data().subtitles;
      }
    } catch (e) {
      console.warn("getChapterSubtitles error:", e);
    }
    return null;
  },
'''

if 'saveChapterSubtitles:' not in cs:
    target = '  getCachedPageText: async function'
    cs = cs.replace(target, sub_methods + '\n' + target, 1)
    with open('src/services/cloudSync.js', 'w', encoding='utf-8') as f:
        f.write(cs)
    print('Updated cloudSync.js with saveChapterSubtitles and getChapterSubtitles')

# 2. BooksPage.js - update handleSaveChapterSubtitles
with open('src/pages/BooksPage.js', 'r', encoding='utf-8') as f:
    bp = f.read()

old_b_save = '''    var updatedBook = Object.assign({}, activeBook, { audioChapters: chaps });

    await safeCloudSaveBook(updatedBook, { silent: false });'''

new_b_save = '''    var updatedBook = Object.assign({}, activeBook, { audioChapters: chaps });

    try {
      if (window.cloudSync && typeof window.cloudSync.saveChapterSubtitles === "function") {
        await window.cloudSync.saveChapterSubtitles(activeBook.id, chapterId, subtitles);
      }
    } catch (eSub) {
      console.warn("Subcollection save warning:", eSub);
    }

    await safeCloudSaveBook(updatedBook, { silent: false });'''

if old_b_save in bp:
    bp = bp.replace(old_b_save, new_b_save, 1)
    with open('src/pages/BooksPage.js', 'w', encoding='utf-8') as f:
        f.write(bp)
    print('Updated BooksPage.js with cloudSync subcollection save')

# 3. ChapterTextViewerModal.js - add asyncSubtitles loader
with open('src/components/books/ChapterTextViewerModal.js', 'r', encoding='utf-8') as f:
    modal = f.read()

old_state = '  var [srtNotice, setSrtNotice] = React.useState("");'
new_state = '''  var [srtNotice, setSrtNotice] = React.useState("");
  var [asyncSubtitles, setAsyncSubtitles] = React.useState(null);

  React.useEffect(function() {
    if (!viewingChapterText || !activeBook) return;
    var subs = viewingChapterText.subtitles;
    if (subs && Array.isArray(subs) && subs.length > 0) {
      setAsyncSubtitles(subs);
      return;
    }
    try {
      var cached = localStorage.getItem("counsel_cached_subtitles_" + viewingChapterText.id);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAsyncSubtitles(parsed);
          return;
        }
      }
    } catch (e) {}

    if (window.cloudSync && typeof window.cloudSync.getChapterSubtitles === "function") {
      window.cloudSync.getChapterSubtitles(activeBook.id, viewingChapterText.id).then(function(res) {
        if (res && Array.isArray(res) && res.length > 0) {
          setAsyncSubtitles(res);
          try {
            localStorage.setItem("counsel_cached_subtitles_" + viewingChapterText.id, JSON.stringify(res));
          } catch (e) {}
        }
      }).catch(function() {});
    }
  }, [viewingChapterText && viewingChapterText.id, activeBook && activeBook.id]);'''

if old_state in modal and 'asyncSubtitles' not in modal:
    modal = modal.replace(old_state, new_state, 1)
    
# Replace segments to use effectiveSubs
old_seg_check = '    if (viewingChapterText && Array.isArray(viewingChapterText.subtitles) && viewingChapterText.subtitles.length > 0) {\n      return viewingChapterText.subtitles.map(function(sub, idx) {'
new_seg_check = '''    var effectiveSubs = (asyncSubtitles && asyncSubtitles.length > 0)
      ? asyncSubtitles
      : ((viewingChapterText && Array.isArray(viewingChapterText.subtitles) && viewingChapterText.subtitles.length > 0) ? viewingChapterText.subtitles : null);

    if (effectiveSubs && effectiveSubs.length > 0) {
      return effectiveSubs.map(function(sub, idx) {'''

if old_seg_check in modal:
    modal = modal.replace(old_seg_check, new_seg_check, 1)
else:
    old_crlf_seg = old_seg_check.replace('\n', '\r\n')
    if old_crlf_seg in modal:
        modal = modal.replace(old_crlf_seg, new_seg_check.replace('\n', '\r\n'), 1)

# Update badge check
old_badge = '(viewingChapterText && viewingChapterText.subtitles && viewingChapterText.subtitles.length > 0)'
new_badge = '((viewingChapterText && viewingChapterText.subtitles && viewingChapterText.subtitles.length > 0) || (asyncSubtitles && asyncSubtitles.length > 0))'
if old_badge in modal:
    modal = modal.replace(old_badge, new_badge, 1)

with open('src/components/books/ChapterTextViewerModal.js', 'w', encoding='utf-8') as f:
    f.write(modal)
print('Updated ChapterTextViewerModal.js with asyncSubtitles loader')

print('ALL CODE UPDATED FOR PER-CHAPTER SUBCOLLECTION SUBTITLES!')
