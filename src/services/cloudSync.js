// خدمة المزامنة السحابية اللحظية مع فايربيز
window.CloudSyncService = {
  // الاشتراك اللحظي في المحاضرات
  subscribeLectures: function(onUpdate) {
    if (!window.db) return function() {};
    try {
      return window.db.collection("lectures").orderBy("date", "desc").onSnapshot(function(snapshot) {
        var list = [];
        snapshot.forEach(function(doc) {
          list.push(Object.assign({ id: doc.id }, doc.data()));
        });
        onUpdate(list);
      }, function(err) {
        console.warn("Firestore lectures read fallback to local:", err);
      });
    } catch (e) {
      return function() {};
    }
  },

  // حفظ أو تعديل محاضرة سحابياً
  saveLecture: function(lecture) {
    if (!window.db) return Promise.resolve();
    var docId = lecture.id || ("lec-" + Date.now());
    var data = Object.assign({}, lecture, {
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return window.db.collection("lectures").doc(docId).set(data, { merge: true });
  },

  // حفظ موضع الاستماع فقط (ثانية التوقف) لتوفير الباندويث
  updatePlaybackPosition: function(lectureId, seconds) {
    if (!window.db || !lectureId) return Promise.resolve();
    return window.db.collection("lectures").doc(lectureId).set({
      lastPosition: seconds,
      lastPlayedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  },

  // الاشتراك اللحظي في الكتب
  subscribeBooks: function(onUpdate) {
    if (!window.db) return function() {};
    try {
      return window.db.collection("books").onSnapshot(function(snapshot) {
        var list = [];
        snapshot.forEach(function(doc) {
          list.push(Object.assign({ id: doc.id }, doc.data()));
        });
        onUpdate(list);
      });
    } catch (e) {
      return function() {};
    }
  },

  // حفظ أو تعديل كتاب
  saveBook: function(book) {
    if (!window.db) return Promise.resolve();
    var docId = book.id || ("book-" + Date.now());
    return window.db.collection("books").doc(docId).set(book, { merge: true });
  },

  // حفظ موضع الصفحة فقط في الكتاب
  updateBookPage: function(bookId, page) {
    if (!window.db || !bookId) return Promise.resolve();
    return window.db.collection("books").doc(bookId).set({
      currentPage: page
    }, { merge: true });
  },

  // حفظ واسترجاع نصوص الصفحات المستخرجة بالذكاء الاصطناعي (Cloud Cache لتوفير الـ Quota)
  saveCachedPageText: function(bookId, pageNum, text) {
    if (!window.db || !bookId || !pageNum || !text) return Promise.resolve();
    return window.db.collection("books").doc(bookId).collection("cached_pages").doc("p_" + pageNum).set({
      page: pageNum,
      text: text,
      cachedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  },

  getCachedPageText: async function(bookId, pageNum) {
    if (!window.db || !bookId || !pageNum) return null;
    try {
      var doc = await window.db.collection("books").doc(bookId).collection("cached_pages").doc("p_" + pageNum).get();
      if (doc.exists && doc.data() && doc.data().text) {
        return doc.data().text;
      }
    } catch (e) {
      console.warn("getCachedPageText error:", e);
    }
    return null;
  },

  // الاشتراك في الملاحظات الدراسية
  subscribeNotes: function(onUpdate) {
    if (!window.db) return function() {};
    try {
      return window.db.collection("personal_notes").orderBy("date", "desc").onSnapshot(function(snapshot) {
        var list = [];
        snapshot.forEach(function(doc) {
          list.push(Object.assign({ id: doc.id }, doc.data()));
        });
        onUpdate(list);
      });
    } catch (e) {
      return function() {};
    }
  },

  saveNote: function(note) {
    if (!window.db) return Promise.resolve();
    var docId = note.id || ("note-" + Date.now());
    return window.db.collection("personal_notes").doc(docId).set(note, { merge: true });
  }
};
