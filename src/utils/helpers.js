// دوال مساعدة عامة للتعامل مع التخزين المحلي، روابط جوجل درايف، وتنسيق الوقت
window.APP_UTILS = {
  // استخراج المعرف المباشر من رابط جوجل درايف
  extractDriveId: function(url) {
    if (!url) return "";
    var str = String(url).trim();
    var match = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    match = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    // إذا كان الرابط رابط ويب كامل وليس درايف (مثل Hugging Face, Firebase, أو رابط MP3 خارجي)، ليس درايف
    if (str.indexOf("http://") === 0 || str.indexOf("https://") === 0 || str.indexOf("blob:") === 0 || str.indexOf("data:") === 0) {
      return "";
    }
    // إذا كان معرف خام (Drive ID) بدون بروتوكول
    if (str.length >= 15 && str.length <= 60 && !/\s/.test(str)) {
      return str;
    }
    return "";
  },

  // تحويل رابط جوجل درايف إلى رابط تشغيل وتضمين مباشر
  getDrivePreviewUrl: function(driveIdOrUrl) {
    var id = window.APP_UTILS.extractDriveId(driveIdOrUrl);
    if (!id) return "";
    return "https://drive.google.com/file/d/" + id + "/preview";
  },

  // تحويل رابط جوجل درايف إلى رابط صورة مباشر لعرض الأغلفة
  getDriveImageUrl: function(driveIdOrUrl) {
    if (!driveIdOrUrl) return "";
    var str = String(driveIdOrUrl).trim();
    if (!str || str.startsWith("data:") || str.startsWith("blob:")) return str;
    var id = window.APP_UTILS.extractDriveId(str);
    if (id && id.length >= 15 && !id.startsWith("http")) {
      return "https://drive.google.com/thumbnail?id=" + id + "&sz=w800";
    }
    return str;
  },

  // تنسيق الثواني إلى دقائق وثوانٍ
  formatDuration: function(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  },

  // حفظ واسترجاع من التخزين المحلي
  getLocal: function(key, defaultValue) {
    try {
      var item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  setLocal: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  },

  // تخزين الملفات الكبيرة (PDFs) بدون إنترنت عبر IndexedDB
  openOfflineDb: function() {
    return new Promise(function(resolve, reject) {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB غير مدعوم"));
        return;
      }
      var req = indexedDB.open("counsel_offline_storage", 1);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains("books_pdf")) {
          db.createObjectStore("books_pdf", { keyPath: "bookId" });
        }
      };
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  },

  saveOfflinePdf: async function(bookId, blobData) {
    try {
      var db = await window.APP_UTILS.openOfflineDb();
      return new Promise(function(resolve, reject) {
        var tx = db.transaction("books_pdf", "readwrite");
        var store = tx.objectStore("books_pdf");
        var req = store.put({ bookId: bookId, data: blobData, savedAt: Date.now() });
        req.onsuccess = function() { resolve(true); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    } catch (e) {
      console.warn("Offline save failed:", e);
      return false;
    }
  },

  getOfflinePdf: async function(bookId) {
    try {
      var db = await window.APP_UTILS.openOfflineDb();
      return new Promise(function(resolve, reject) {
        var tx = db.transaction("books_pdf", "readonly");
        var store = tx.objectStore("books_pdf");
        var req = store.get(bookId);
        req.onsuccess = function(e) {
          if (e.target.result && e.target.result.data) {
            resolve(e.target.result.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = function() { resolve(null); };
      });
    } catch (e) {
      return null;
    }
  },

  removeOfflinePdf: async function(bookId) {
    try {
      var db = await window.APP_UTILS.openOfflineDb();
      return new Promise(function(resolve, reject) {
        var tx = db.transaction("books_pdf", "readwrite");
        var store = tx.objectStore("books_pdf");
        var req = store.delete(bookId);
        req.onsuccess = function() { resolve(true); };
        req.onerror = function() { resolve(false); };
      });
    } catch (e) {
      return false;
    }
  },

  // التحقق مما إذا كان الفصل مكتملاً استخراجه بالكامل
  isChapterComplete: function(c, nextChap) {
    if (!c || !c.text || c.text.trim().length < 30) return false;
    if (c.isComplete) return true;
    var sP = Number(c.startPage) || 1;
    var eP = Number(c.endPage) || 0;
    if (!eP && nextChap && nextChap.startPage) {
      eP = Math.max(sP, Number(nextChap.startPage) - 1);
    }
    if (!eP) eP = sP;
    var lastP = Number(c.lastExtractedPage);
    if (lastP && eP && lastP < eP) return false;
    return true;
  },

  // كاش النصوص المستخرجة لكل صفحة لتوفير الـ Quota وتسريع الاستئناف الفوري
  getCachedPageText: function(bookId, pageNum) {
    if (!bookId || !pageNum) return null;
    try {
      var key = "counsel_ocr_p_" + bookId + "_" + pageNum;
      var cached = localStorage.getItem(key);
      if (cached && cached.trim()) return cached;
    } catch (e) {}
    return null;
  },

  setCachedPageText: function(bookId, pageNum, text) {
    if (!bookId || !pageNum || !text) return;
    try {
      var key = "counsel_ocr_p_" + bookId + "_" + pageNum;
      localStorage.setItem(key, text);
    } catch (e) {}
  }
};
