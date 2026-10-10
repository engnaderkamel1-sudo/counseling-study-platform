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

  // تحويل كائنات Firestore REST إلى كائنات JavaScript عادية
  parseFirestoreValue: function(val) {
    if (!val || typeof val !== "object") return val;
    if ("stringValue" in val) return val.stringValue;
    if ("booleanValue" in val) return val.booleanValue;
    if ("integerValue" in val) return parseInt(val.integerValue, 10);
    if ("doubleValue" in val) return parseFloat(val.doubleValue);
    if ("nullValue" in val) return null;
    if ("arrayValue" in val) {
      var arr = (val.arrayValue && val.arrayValue.values) || [];
      var self = this;
      return arr.map(function(item) { return self.parseFirestoreValue(item); });
    }
    if ("mapValue" in val) {
      var res = {};
      var fields = (val.mapValue && val.mapValue.fields) || {};
      var self = this;
      Object.keys(fields).forEach(function(k) {
        res[k] = self.parseFirestoreValue(fields[k]);
      });
      return res;
    }
    return val;
  },

  parseFirestoreDoc: function(doc) {
    var fields = doc.fields || {};
    var res = {};
    var self = this;
    Object.keys(fields).forEach(function(k) {
      res[k] = self.parseFirestoreValue(fields[k]);
    });
    if (!res.id && doc.name) {
      var parts = doc.name.split("/");
      res.id = parts[parts.length - 1];
    }
    return res;
  },

  // الاشتراك اللحظي في الكتب مع جلب مباشر فوري ومضمون (Direct REST Fetch + Realtime Listener)
  subscribeBooks: function(onUpdate) {
    var self = this;
    // 1. جلب فوري ومباشر وسريع جداً عبر REST API لتخطي أي قيود لشبكات المحمول أو تعليق الـ WebSockets
    fetch("https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books?nocache=" + Date.now())
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.documents && Array.isArray(data.documents)) {
          var restList = data.documents.map(function(d) { return self.parseFirestoreDoc(d); });
          if (restList.length > 0 && typeof onUpdate === "function") {
            onUpdate(restList);
          }
        }
      })
      .catch(function(errRest) {
        console.warn("Direct REST books fetch notice:", errRest);
      });

    if (!window.db) return function() {};
    try {
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
      // مزامنة حالة النشر بدقة لمنع إخفاء الكتاب عن الطلبة بالخطأ
      if (cleanBook.publishStatus === "published") {
        cleanBook.isPublished = true;
      } else if (cleanBook.publishStatus === "draft") {
        cleanBook.isPublished = false;
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
