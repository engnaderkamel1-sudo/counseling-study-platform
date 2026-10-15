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
  },

  _recordingLoginLocks: {},

  // تسجيل وتتبع دخول الدارس (IP والموقع الجغرافي ونوع الجهاز)
  recordLoginLog: async function(userData) {
    if (!userData || !userData.email) return;
    var userEmail = (userData.email || "user").toLowerCase().trim();
    try {
      // 1. قفل متزامن فوري في الذاكرة لمنع أي نداءين في نفس اللحظة
      if (window.CloudSyncService._recordingLoginLocks[userEmail]) {
        return;
      }
      window.CloudSyncService._recordingLoginLocks[userEmail] = true;

      // 2. فحص الجلسة في localStorage (مدة الجلسة 30 دقيقة لمنع تكرار التسجيل لنفس التصفح)
      var sessionKey = "last_log_record_" + userEmail;
      var lastRecorded = 0;
      try {
        lastRecorded = parseInt(localStorage.getItem(sessionKey) || "0", 10);
      } catch (eStorage) {}
      var now = Date.now();
      var sessionCooldown = 30 * 60 * 1000; // 30 دقيقة
      if (now - lastRecorded < sessionCooldown) {
        window.CloudSyncService._recordingLoginLocks[userEmail] = false;
        return; // مسجل بالفعل مؤخراً في نفس الجلسة
      }

      // حفظ التوقيت فوراً قبل بدء الاتصال الخارجي لحجز القفل عبر كافة التبويبات
      try {
        localStorage.setItem(sessionKey, String(now));
      } catch (eSet) {}

      // جلب بيانات الموقع الجغرافي (الدولة، المحافظة، المدينة) والـ IP بدقة وموثوقية عالية
      var geoData = { ip: "غير متوفر", country: "غير محدد", region: "", city: "غير محدد", countryCode: "" };
      try {
        // المحاولة 1: خدمة ipwho.is (سريعة جداً وترجع المحافظة والمدينة والدولة بدقة)
        var controller1 = new AbortController();
        var timeout1 = setTimeout(function() { controller1.abort(); }, 3500);
        var resp1 = await fetch("https://ipwho.is/", { signal: controller1.signal });
        clearTimeout(timeout1);
        if (resp1.ok) {
          var j1 = await resp1.json();
          if (j1.success) {
            geoData = {
              ip: j1.ip || "غير متوفر",
              country: j1.country || "غير محدد",
              region: j1.region || "",
              city: j1.city || "غير محدد",
              countryCode: (j1.country_code || "").toUpperCase()
            };
          }
        }
      } catch (e1) {
        // المحاولة 2 (احتياطية): خدمة freeipapi.com
        try {
          var controller2 = new AbortController();
          var timeout2 = setTimeout(function() { controller2.abort(); }, 3500);
          var resp2 = await fetch("https://freeipapi.com/api/json", { signal: controller2.signal });
          clearTimeout(timeout2);
          if (resp2.ok) {
            var j2 = await resp2.json();
            geoData = {
              ip: j2.ipAddress || "غير متوفر",
              country: j2.countryName || "غير محدد",
              region: j2.regionName || "",
              city: j2.cityName || "غير محدد",
              countryCode: (j2.countryCode || "").toUpperCase()
            };
          }
        } catch (e2) {
          // المحاولة 3 (احتياطية ثالثة): جلب الـ IP فقط عبر ipify
          try {
            var resp3 = await fetch("https://api.ipify.org?format=json");
            if (resp3.ok) {
              var j3 = await resp3.json();
              geoData.ip = j3.ip || geoData.ip;
            }
          } catch (e3) {}
        }
      }

      // تحديد نوع جهاز الدارس
      var ua = navigator.userAgent || "";
      var deviceType = "كمبيوتر 💻";
      if (/android/i.test(ua)) deviceType = "هاتف أندرويد 📱";
      else if (/iphone|ipad|ipod/i.test(ua)) deviceType = "آيفون / آيباد 🍏";
      else if (/mobile/i.test(ua)) deviceType = "هاتف ذكي 📱";
      else if (/macintosh|mac os x/i.test(ua)) deviceType = "ماك 💻";
      else if (/windows/i.test(ua)) deviceType = "ويندوز 💻";

      var logPayload = {
        userId: userData.id || userData.email,
        fullName: userData.fullName || "دارس غير معروف",
        email: userData.email,
        role: userData.role || "student",
        church: userData.church || "غير محدد",
        diocese: userData.diocese || "غير محدد",
        governorate: userData.governorate || "غير محدد",
        ip: geoData.ip,
        country: geoData.country,
        region: geoData.region || "",
        city: geoData.city,
        countryCode: geoData.countryCode,
        device: deviceType,
        userAgent: ua.substring(0, 150),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        createdAtClient: new Date().toISOString()
      };

      if (window.db) {
        await window.db.collection("login_logs").add(logPayload);

        // تحديث آخر دخول في وثيقة الدارس نفسه أيضاً كمرجع إضافي
        if (userData.id) {
          try {
            var locSummary = geoData.country;
            if (geoData.region) locSummary += " (" + geoData.region + (geoData.city && geoData.city !== geoData.region ? " - " + geoData.city : "") + ")";
            else if (geoData.city && geoData.city !== "غير محدد") locSummary += " (" + geoData.city + ")";

            await window.db.collection("users").doc(userData.id).set({
              lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
              lastLoginCountry: locSummary,
              lastLoginIp: geoData.ip,
              lastDevice: deviceType,
              loginCount: firebase.firestore.FieldValue.increment(1),
              lastSessionMinutes: 0
            }, { merge: true });
          } catch (uErr) {}
        }
      }
    } catch (err) {
      console.warn("recordLoginLog warning:", err);
    } finally {
      window.CloudSyncService._recordingLoginLocks[userEmail] = false;
    }
  },

  // جلب سجلات الدخول (بحد أقصى محدد لمنع استهلاك الذاكرة وفايربيز)
  getLoginLogs: async function(limitCount) {
    if (!window.db) return [];
    var limitNum = limitCount || 200;
    try {
      var snap = await window.db.collection("login_logs")
        .orderBy("timestamp", "desc")
        .limit(limitNum)
        .get();
      var list = [];
      snap.forEach(function(doc) {
        list.push(Object.assign({ id: doc.id }, doc.data()));
      });
      return list;
    } catch (err) {
      // في حال عدم وجود فهرس مركب timestamp، نحاول الجلب المباشر
      try {
        var snapFallback = await window.db.collection("login_logs").limit(limitNum).get();
        var listFallback = [];
        snapFallback.forEach(function(doc) {
          listFallback.push(Object.assign({ id: doc.id }, doc.data()));
        });
        listFallback.sort(function(a, b) {
          var tA = a.timestamp && a.timestamp.seconds ? a.timestamp.seconds : (new Date(a.createdAtClient || 0).getTime() / 1000);
          var tB = b.timestamp && b.timestamp.seconds ? b.timestamp.seconds : (new Date(b.createdAtClient || 0).getTime() / 1000);
          return tB - tA;
        });
        return listFallback;
      } catch (err2) {
        console.warn("getLoginLogs error:", err2);
        return [];
      }
    }
  },

  // تفريغ السجل (يدوياً أو تلقائياً للحفاظ على المساحة وخفة السحابة)
  clearLoginLogs: async function() {
    if (!window.db) return true;
    try {
      var snap = await window.db.collection("login_logs").limit(300).get();
      var batch = window.db.batch();
      snap.forEach(function(doc) {
        batch.delete(doc.ref);
      });
      await batch.commit();
      return true;
    } catch (e) {
      console.warn("clearLoginLogs error:", e);
      throw e;
    }
  },

  // إرسال نبض التواجد السحابي (Heartbeat) وتحديث مدة المذاكرة بدقة وخفة تامة
  sendPresenceHeartbeat: async function(currentUser) {
    if (!currentUser || !currentUser.id || !window.db) return;
    try {
      // حماية من الإرسال المفرط المتتالي (بحد أقصى مرة كل دقيقتين ونصف)
      var key = "last_presence_beat_" + currentUser.id;
      var lastBeat = parseInt(sessionStorage.getItem(key) || "0", 10);
      var now = Date.now();
      var minIntervalMs = 140 * 1000; // 2.3 دقيقة
      if (lastBeat > 0 && (now - lastBeat < minIntervalMs)) {
        return;
      }
      sessionStorage.setItem(key, String(now));

      var updatePayload = {
        lastActiveAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActiveClient: new Date().toISOString()
      };

      // حساب وقت المكوث والمذاكرة الفعلي وتراكم الدقائق
      if (lastBeat > 0) {
        var elapsedMs = now - lastBeat;
        // إذا كان الفارق بين دقيقتين و 10 دقائق (لتفادي حساب أوقات السكون الطويل)
        if (elapsedMs >= 90 * 1000 && elapsedMs <= 10 * 60 * 1000) {
          var isAudioPlaying = false;
          try {
            if (window.__ACTIVE_PLAYING_AUDIO) isAudioPlaying = true;
            else if (document.querySelector("audio:not([paused])")) isAudioPlaying = true;
          } catch (eAud) {}

          var isTabVisible = (typeof document.visibilityState === "undefined" || document.visibilityState !== "hidden");
          // احتساب الوقت إذا كان المستخدم نشطاً على الصفحة أو كان يستمع للمحاضرة/الكتاب في الخلفية
          if (isTabVisible || isAudioPlaying) {
            var elapsedMins = Math.round(elapsedMs / 60000);
            if (elapsedMins > 0 && elapsedMins <= 10) {
              updatePayload.totalMinutes = firebase.firestore.FieldValue.increment(elapsedMins);
              updatePayload.lastSessionMinutes = firebase.firestore.FieldValue.increment(elapsedMins);
            }
          }
        }
      }

      await window.db.collection("users").doc(currentUser.id).set(updatePayload, { merge: true });
    } catch(err) {
      // تجاهل هادئ لأخطاء الشبكة أثناء النبض
    }
  }
};
