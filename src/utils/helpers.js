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

  // تنسيق المدة الزمنية بنص عربي واضح ومريح للموبايل
  formatArabicDuration: function(seconds) {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "0 ثانية";
    var totalSec = Math.round(seconds);
    var hours = Math.floor(totalSec / 3600);
    var mins = Math.floor((totalSec % 3600) / 60);
    var secs = totalSec % 60;
    if (hours > 0) {
      if (mins > 0) return hours + " ساعة و " + mins + " دقيقة";
      return hours + " ساعة";
    }
    if (mins > 0) {
      if (secs > 0) return mins + " دقيقة و " + secs + " ثانية";
      return mins + " دقيقة";
    }
    return secs + " ثانية";
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
    // السماح بنقص صفحة واحدة في النهاية إذا كان الفصل يحتوي على نص كبير (نظراً لأن الصفحة الأخيرة غالباً ما تكون بيضاء أو بها فاصل)
    if (lastP && eP && lastP < (eP - 1)) return false;
    if (eP > sP) {
      if (lastP && lastP >= (eP - 1)) return true;
      var totalPages = eP - sP + 1;
      if (c.text.trim().length < Math.min(1000, totalPages * 50)) return false;
    }
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
  },

  // تدقيق وفحص سلامة الكتاب وفصوله إلزامياً قبل النشر للدارسين (Quality Gate)
  auditBookQuality: function(book) {
    if (!book) return { isPublishable: false, score: 0, issues: ["الكتاب غير محدد"], chaptersAudit: [] };
    var chaps = book.audioChapters || [];
    if (chaps.length === 0) {
      return { isPublishable: false, score: 0, issues: ["لا توجد فصول مضافة في هذا الكتاب"], chaptersAudit: [] };
    }

    var totalChapters = chaps.length;
    var completedCount = 0;
    var audioReadyCount = 0;
    var chaptersAudit = [];
    var globalIssues = [];
    var totalPagesInBook = 0;
    var totalExtractedPages = 0;

    for (var i = 0; i < chaps.length; i++) {
      var c = chaps[i];
      var sP = Number(c.startPage) || 1;
      var eP = Number(c.endPage) || sP;
      var totalPages = Math.max(1, eP - sP + 1);
      totalPagesInBook += totalPages;

      var lastP = Number(c.lastExtractedPage) || (c.isComplete ? eP : 0);
      var textLen = (c.text || "").trim().length;
      var hasAudio = !!(c.audioUrl && c.audioUrl.trim());
      if (hasAudio) audioReadyCount++;

      var pagesDone = 0;
      if (c.isComplete || lastP >= eP) {
        pagesDone = totalPages;
      } else if (lastP >= sP) {
        pagesDone = Math.min(totalPages, lastP - sP + 1);
      }
      totalExtractedPages += pagesDone;

      var isDenseEnough = textLen >= (totalPages * 400);
      var isComplete = (pagesDone >= totalPages) && (textLen > 100);
      if (isComplete) completedCount++;

      var chapIssues = [];
      if (pagesDone === 0) {
        chapIssues.push("لم يتم استخراج نصوص هذا الفصل نهائياً");
      } else if (pagesDone < totalPages) {
        chapIssues.push("مستخرج جزئياً فقط (" + pagesDone + " من " + totalPages + " صفحة - متبقي " + (totalPages - pagesDone) + " صفحة)");
      } else if (!isDenseEnough && totalPages > 1) {
        chapIssues.push("حجم النص قليل جداً مقارنة بعدد صفحات الفصل (" + textLen + " حرف لـ " + totalPages + " صفحة)");
      }

      if (!hasAudio) {
        chapIssues.push("لا يوجد تسجيل صوتي (MP3) لهذا الفصل بعد");
      }

      chaptersAudit.push({
        id: c.id,
        index: i + 1,
        title: c.title,
        startPage: sP,
        endPage: eP,
        totalPages: totalPages,
        pagesDone: pagesDone,
        percent: Math.round((pagesDone / totalPages) * 100),
        textLen: textLen,
        hasAudio: hasAudio,
        audioDuration: c.audioDuration || 0,
        isComplete: isComplete,
        issues: chapIssues
      });
    }

    if (completedCount < totalChapters) {
      globalIssues.push("يوجد " + (totalChapters - completedCount) + " فصول غير مكتملة النص.");
    }
    if (audioReadyCount < totalChapters) {
      globalIssues.push("يوجد " + (totalChapters - audioReadyCount) + " فصول ينقصها التسجيل الصوتي.");
    }

    var isPublishable = (completedCount === totalChapters) && (audioReadyCount === totalChapters) && (totalChapters > 0);
    var overallPercent = Math.round((totalExtractedPages / Math.max(1, totalPagesInBook)) * 100);

    return {
      isPublishable: isPublishable,
      totalChapters: totalChapters,
      completedCount: completedCount,
      audioReadyCount: audioReadyCount,
      totalPagesInBook: totalPagesInBook,
      totalExtractedPages: totalExtractedPages,
      overallPercent: overallPercent,
      globalIssues: globalIssues,
      chaptersAudit: chaptersAudit
    };
  }
};
