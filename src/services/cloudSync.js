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

  // الاشتراك اللحظي في الكتب مع جلب مباشر فوري (Direct HTTP Fetch + Realtime Listener)
  subscribeBooks: function(onUpdate) {
    if (!window.db) return function() {};
    try {
      // 1. جلب فوري ومباشر أولاً عبر HTTP لضمان التحميل على الموبايل والـ Incognito بدون انتظار
      window.db.collection("books").get().then(function(snapshot) {
        var list = [];
        snapshot.forEach(function(doc) {
          list.push(Object.assign({ id: doc.id }, doc.data()));
        });
        if (list.length > 0 && typeof onUpdate === "function") {
          onUpdate(list);
        }
      }).catch(function(err) {
        console.warn("Direct books HTTP get notice:", err);
      });

      // 2. الاستماع اللحظي المستمر لأي تحديث جديد
      return window.db.collection("books").onSnapshot(function(snapshot) {
        var list = [];
        snapshot.forEach(function(doc) {
          list.push(Object.assign({ id: doc.id }, doc.data()));
        });
        if (typeof onUpdate === "function") {
          onUpdate(list);
        }
      }, function(err) {
        console.warn("Firestore subscribeBooks realtime error:", err);
      });
    } catch (e) {
      return function() {};
    }
  },

  // تنقية الكائنات من أي قيم undefined أو دوال أو نصوص Base64 مفرطة الحجم لمنع رفض فايربيز الصامت
  sanitizeForFirestore: function(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== "object") {
      // حماية الحجم: إذا كان النص صورة Base64 ضخمة، نحذفه من المستند السحابي لمنع تخطي 1 ميجابايت
      if (typeof obj === "string" && obj.indexOf("data:image/") === 0 && obj.length > 5000) {
        return "";
      }
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(function(item) {
        return window.CloudSyncService.sanitizeForFirestore(item);
      });
    }
    var cleaned = {};
    Object.keys(obj).forEach(function(key) {
      var val = obj[key];
      if (val !== undefined && typeof val !== "function") {
        cleaned[key] = window.CloudSyncService.sanitizeForFirestore(val);
      }
    });
    return cleaned;
  },

  // حفظ أو تعديل كتاب مع تنقية سحابية آمنة وحماية المستند من تجاوز 1MB
  saveBook: function(book) {
    if (!window.db || !book) return Promise.resolve();
    var docId = book.id || ("book-" + Date.now());
    try {
      var cleanBook = this.sanitizeForFirestore(book);
      // التأكد الصارم من عدم وجود أي Base64 في الغلاف السحابي
      if (cleanBook.coverUrl && typeof cleanBook.coverUrl === "string" && cleanBook.coverUrl.indexOf("data:") === 0) {
        cleanBook.coverUrl = "";
      }
      return window.db.collection("books").doc(docId).set(cleanBook, { merge: true }).catch(function(err) {
        console.error("Firestore saveBook error for " + docId + ":", err);
        throw err;
      });
    } catch (e) {
      console.error("Error sanitizing book for Firestore:", e);
      return Promise.reject(e);
    }
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
  },

  // حذف مستند عام من أي مجموعة (Collection)
  deleteDocument: async function(collectionName, docId) {
    if (!window.db || !collectionName || !docId) return true;
    try {
      await window.db.collection(collectionName).doc(docId).delete();
      return true;
    } catch (e) {
      console.error("Firestore deleteDocument error:", e);
      throw e;
    }
  },

  // حذف كتاب
  deleteBook: async function(bookId) {
    return this.deleteDocument("books", bookId);
  }
};
