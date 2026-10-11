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
    var hasDelivered = false;

    var handleUpdate = function(list) {
      if (!list || !Array.isArray(list)) return;
      hasDelivered = true;
      if (typeof onUpdate === "function") {
        onUpdate(list);
      }
    };

    // 1. جلب فوري ومباشر وسريع جداً عبر REST API لتخطي أي قيود لشبكات المحمول أو المتصفح الخفي (Incognito)
    var fetchRestBooks = function(retryCount) {
      var controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
      var timeoutId = controller ? setTimeout(function() { controller.abort(); }, 12000) : null;
      var fetchOpts = {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      };
      var apiKey = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) || "";
      var restUrl = "https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books?key=" + apiKey;
      if (controller) fetchOpts.signal = controller.signal;

      fetch(restUrl, fetchOpts)
        .then(function(res) {
          if (timeoutId) clearTimeout(timeoutId);
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function(data) {
          if (data && data.documents && Array.isArray(data.documents)) {
            var restList = data.documents.map(function(d) { return self.parseFirestoreDoc(d); });
            restList = restList.filter(function(b) { return !b.isDeleted; });
            if (restList.length > 0) {
              handleUpdate(restList);
            }
          }
        })
        .catch(function(errRest) {
          if (timeoutId) clearTimeout(timeoutId);
          console.warn("Direct REST books fetch notice:", errRest && errRest.message);
          // إعادة محاولة واحدة سريعة إذا لم يكن قد تم تسليم أي بيانات بعد
          if (!hasDelivered && (retryCount || 0) < 2) {
            setTimeout(function() { fetchRestBooks((retryCount || 0) + 1); }, 1500);
          }
        });
    };

    fetchRestBooks(0);

    if (!window.db) return function() {};
    try {
      // 2. الاستماع اللحظي المستمر لأي تحديث جديد
      return window.db.collection("books").onSnapshot(function(snapshot) {
        var list = [];
        snapshot.forEach(function(doc) {
          list.push(Object.assign({ id: doc.id }, doc.data()));
        });
        handleUpdate(list);
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
      // حماية الحجم: السماح بالغلاف إذا كان Base64 خفيف أو رابط، وحذف النصوص المفرطة الحجم فقط لمنع تخطي 1 ميجابايت
      if (typeof obj === "string" && obj.indexOf("data:image/") === 0 && obj.length > 200000) {
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
      // حفظ الغلاف في الكاش المحلي لضمان ظهوره الفوري دائماً على الجهاز
      if (book.coverUrl && typeof book.coverUrl === "string" && book.coverUrl.trim()) {
        try {
          if (window.APP_UTILS && window.APP_UTILS.setLocal) {
            window.APP_UTILS.setLocal("counsel_cover_thumb_" + docId, book.coverUrl);
          }
        } catch (eThumb) {}
      }

      var cleanBook = this.sanitizeForFirestore(book);
      // إذا كان الغلاف كود Base64 ضخم جداً (> 200KB)، لا نرفعه لسحابة فايربيز بل نكتفي بالكاش المحلي
      if (cleanBook.coverUrl && typeof cleanBook.coverUrl === "string" && cleanBook.coverUrl.indexOf("data:") === 0 && cleanBook.coverUrl.length > 200000) {
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

  // الاشتراك في الملاحظات الدراسية (مع فصل الملاحظات لكل مستخدم)
  subscribeNotes: function(currentUser, onUpdate) {
    if (!window.db) return function() {};
    if (typeof currentUser === "function") {
      onUpdate = currentUser;
      currentUser = null;
    }
    try {
      var query = window.db.collection("personal_notes");
      if (currentUser && (currentUser.id || currentUser.email)) {
        var userIdentifier = currentUser.id || currentUser.email;
        query = query.where("userId", "==", userIdentifier);
      }
      return query.onSnapshot(function(snapshot) {
        var list = [];
        snapshot.forEach(function(doc) {
          list.push(Object.assign({ id: doc.id }, doc.data()));
        });
        list.sort(function(a, b) {
          return String(b.date || "").localeCompare(String(a.date || ""));
        });
        onUpdate(list);
      });
    } catch (e) {
      return function() {};
    }
  },

  saveNote: function(note, currentUser) {
    if (!window.db) return Promise.resolve();
    var docId = note.id || ("note-" + Date.now());
    if (currentUser && (currentUser.id || currentUser.email) && !note.userId) {
      note.userId = currentUser.id || currentUser.email;
    }
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

  // حذف كتاب (نهائي)
  deleteBook: async function(bookId) {
    return this.deleteDocument("books", bookId);
  },

  // ==========================================
  // منظومة سلة المحذوفات والأرشيف المؤقت (7 أيام)
  // ==========================================
  RECYCLE_RETENTION_MS: 7 * 24 * 60 * 60 * 1000, // أسبوع كامل

  // الاشتراك في سلة المحذوفات مع التنظيف التلقائي للعناصر المنتهية صلاحيتها
  subscribeRecycleBin: function(onUpdate) {
    var self = this;
    if (!window.db) return function() {};
    try {
      return window.db.collection("recycle_bin").orderBy("deletedAt", "desc").onSnapshot(function(snapshot) {
        var list = [];
        var now = Date.now();
        snapshot.forEach(function(doc) {
          var data = Object.assign({ id: doc.id }, doc.data());
          // إذا مر أكثر من 7 أيام، نحذف العنصر نهائياً وتلقائياً
          if (data.deletedAt && (now - data.deletedAt > self.RECYCLE_RETENTION_MS)) {
            self.permanentDeleteFromRecycleBin(doc.id).catch(function() {});
          } else {
            list.push(data);
          }
        });
        if (typeof onUpdate === "function") onUpdate(list);
      }, function(err) {
        console.warn("Recycle bin realtime listener notice:", err);
      });
    } catch (e) {
      return function() {};
    }
  },

  // نقل كتاب أو محاضرة إلى سلة المحذوفات (Soft Delete)
  moveToRecycleBin: async function(item, type, user) {
    if (!item) return false;
    var self = this;
    var docId = type + "_" + (item.id || Date.now());
    var recycleRecord = {
      id: docId,
      originalId: item.id,
      originalType: type, // "book" أو "lecture"
      itemData: self.sanitizeForFirestore(item),
      title: item.title || "عنصر بدون عنوان",
      author: item.author || item.speaker || "",
      deletedAt: Date.now(),
      deletedBy: (user && user.fullName) || "الأدمن"
    };

    if (window.db) {
      try {
        await window.db.collection("recycle_bin").doc(docId).set(recycleRecord);
        // حذفه من المجموعة الأصلية النشطة
        var targetCollection = type === "book" ? "books" : "lectures";
        await window.db.collection(targetCollection).doc(item.id).delete();
      } catch (err) {
        console.error("moveToRecycleBin cloud error:", err);
      }
    }

    // تحديث التخزين المحلي
    try {
      var utils = window.APP_UTILS;
      if (utils) {
        var localBin = utils.getLocal("counsel_recycle_bin", []) || [];
        localBin.unshift(recycleRecord);
        utils.setLocal("counsel_recycle_bin", localBin);

        if (type === "book") {
          var allB = utils.getLocal(window.APP_CONFIG.storageKeys.books, []) || [];
          utils.setLocal(window.APP_CONFIG.storageKeys.books, allB.filter(function(b) { return b.id !== item.id; }));
          utils.removeLocal("counsel_book_data_" + item.id);
          utils.removeLocal("counsel_book_page_" + item.id);
        } else if (type === "lecture") {
          var allL = utils.getLocal(window.APP_CONFIG.storageKeys.lectures, []) || [];
          utils.setLocal(window.APP_CONFIG.storageKeys.lectures, allL.filter(function(l) { return l.id !== item.id; }));
        }
      }
    } catch (e) {}

    return true;
  },

  // استرجاع عنصر من سلة المحذوفات إلى مكانه الأصلي
  restoreFromRecycleBin: async function(recycleRecord) {
    if (!recycleRecord || !recycleRecord.itemData) return false;
    var self = this;
    var type = recycleRecord.originalType || "book";
    var item = recycleRecord.itemData;

    if (type === "book") {
      await self.saveBook(item);
    } else {
      await self.saveLecture(item);
    }

    // حذفه من سلة المحذوفات
    await self.permanentDeleteFromRecycleBin(recycleRecord.id);

    // تحديث التخزين المحلي
    try {
      var utils = window.APP_UTILS;
      if (utils) {
        if (type === "book") {
          var allB = utils.getLocal(window.APP_CONFIG.storageKeys.books, []) || [];
          if (!allB.some(function(b) { return b.id === item.id; })) {
            allB.push(item);
            utils.setLocal(window.APP_CONFIG.storageKeys.books, allB);
          }
        } else if (type === "lecture") {
          var allL = utils.getLocal(window.APP_CONFIG.storageKeys.lectures, []) || [];
          if (!allL.some(function(l) { return l.id === item.id; })) {
            allL.unshift(item);
            utils.setLocal(window.APP_CONFIG.storageKeys.lectures, allL);
          }
        }
      }
    } catch (e) {}

    return true;
  },

  // حذف نهائي لا رجعة فيه لعنصر من السلة
  permanentDeleteFromRecycleBin: async function(recycleDocId) {
    if (!recycleDocId) return true;
    if (window.db) {
      try {
        await window.db.collection("recycle_bin").doc(recycleDocId).delete();
      } catch (err) {
        console.warn("permanentDeleteFromRecycleBin error:", err);
      }
    }
    try {
      var utils = window.APP_UTILS;
      if (utils) {
        var localBin = utils.getLocal("counsel_recycle_bin", []) || [];
        utils.setLocal("counsel_recycle_bin", localBin.filter(function(i) { return i.id !== recycleDocId; }));
      }
    } catch (e) {}
    return true;
  },

  // تفريغ سلة المحذوفات بالكامل
  emptyRecycleBin: async function() {
    var self = this;
    if (window.db) {
      try {
        var snap = await window.db.collection("recycle_bin").get();
        var batch = window.db.batch();
        snap.forEach(function(doc) {
          batch.delete(doc.ref);
        });
        await batch.commit();
      } catch (e) {
        console.warn("emptyRecycleBin batch error:", e);
      }
    }
    try {
      if (window.APP_UTILS) {
        window.APP_UTILS.setLocal("counsel_recycle_bin", []);
      }
    } catch (e) {}
    return true;
  }
};
