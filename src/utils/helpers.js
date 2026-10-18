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

  // تحويل رابط جوجل درايف إلى رابط صورة مباشر وسريع لعرض الأغلفة (يدعم lh3 المباشر و thumbnail)
  getDriveImageUrl: function(driveIdOrUrl) {
    if (!driveIdOrUrl) return "";
    var str = String(driveIdOrUrl).trim();
    if (!str || str.startsWith("data:") || str.startsWith("blob:")) return str;
    var id = window.APP_UTILS.extractDriveId(str);
    if (id && id.length >= 15 && !id.startsWith("http")) {
      return "https://lh3.googleusercontent.com/d/" + id;
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

  removeLocal: function(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  },

  // استرجاع آخر تراك صوتي مسجل أو اكتشافه بذكاء من سجل الاستماع السابق
  resolveLastAudioRecord: function() {
    try {
      var raw = localStorage.getItem("counsel_last_audio_track");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.bookId) return parsed;
      }
    } catch (e) {}

    // فحص ذكي للذاكرة السابقة إذا كان المستخدم قد استمع لكتاب قبل التحديث
    try {
      var booksRaw = localStorage.getItem("counsel_books_data") || localStorage.getItem("counsel_books");
      var booksList = booksRaw ? JSON.parse(booksRaw) : [];
      if (!Array.isArray(booksList) || booksList.length === 0) return null;

      var activeBookId = localStorage.getItem("counsel_active_book_id");
      var candidateBook = null;

      if (activeBookId) {
        candidateBook = booksList.find(function(b) { return b && b.id === activeBookId; });
      }

      // إذا لم يكن الكتاب النشط يحتوي على فصول صوتية، نبحث عن أول كتاب به فصول واستماع
      if (!candidateBook || !candidateBook.audioChapters || candidateBook.audioChapters.length === 0) {
        for (var i = 0; i < booksList.length; i++) {
          var b = booksList[i];
          if (!b || !b.id) continue;
          var lastChap = localStorage.getItem("counsel_audio_last_chap_" + b.id);
          if (lastChap) {
            candidateBook = b;
            break;
          }
        }
      }

      // إذا ما زال غير موجود، نأخذ أول كتاب به فصول صوتية جاهزة
      if (!candidateBook) {
        candidateBook = booksList.find(function(b) {
          return b && b.audioChapters && b.audioChapters.some(function(c) { return c && c.audioUrl && c.audioUrl.trim(); });
        });
      }

      if (candidateBook) {
        var chaps = candidateBook.audioChapters || [];
        var audioChaps = chaps.filter(function(c) { return c && c.audioUrl && c.audioUrl.trim(); });
        if (audioChaps.length > 0) {
          var lastChId = localStorage.getItem("counsel_audio_last_chap_" + candidateBook.id);
          var targetChap = audioChaps.find(function(c) { return c.id === lastChId; }) || audioChaps[0];
          var posStr = localStorage.getItem("counsel_audio_pos_" + candidateBook.id + "_" + targetChap.id);
          var pos = (posStr && !isNaN(parseFloat(posStr))) ? parseFloat(posStr) : 0;
          return {
            type: "chapter",
            bookId: candidateBook.id,
            bookTitle: candidateBook.title || "مرجع دراسي",
            bookCoverUrl: candidateBook.coverUrl || "",
            chapterId: targetChap.id,
            chapterTitle: targetChap.title || "فصل صوتي",
            chapterAudioUrl: targetChap.audioUrl || "",
            position: pos,
            duration: targetChap.audioDuration || 0,
            updatedAt: Date.now()
          };
        }
      }
    } catch (err) {}
    return null;
  },

  // تخزين الملفات الكبيرة (PDFs) بدون إنترنت عبر IndexedDB
  openOfflineDb: function() {
    return new Promise(function(resolve, reject) {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB غير مدعوم"));
        return;
      }
      var req = indexedDB.open("counsel_offline_storage", 3);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains("books_pdf")) {
          db.createObjectStore("books_pdf", { keyPath: "bookId" });
        }
        if (!db.objectStoreNames.contains("pages_cache")) {
          db.createObjectStore("pages_cache", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("lectures_audio")) {
          db.createObjectStore("lectures_audio", { keyPath: "lecId" });
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

  // حفظ واسترجاع الصوت في الذاكرة للتشغيل بدون إنترنت (Offline Mode)
  saveOfflineAudio: async function(lecId, blobData) {
    try {
      var db = await window.APP_UTILS.openOfflineDb();
      return new Promise(function(resolve, reject) {
        var tx = db.transaction("lectures_audio", "readwrite");
        var store = tx.objectStore("lectures_audio");
        var req = store.put({ lecId: lecId, data: blobData, savedAt: Date.now() });
        req.onsuccess = function() { resolve(true); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    } catch (e) {
      console.warn("saveOfflineAudio error:", e);
      return false;
    }
  },

  getOfflineAudio: async function(lecId) {
    try {
      var db = await window.APP_UTILS.openOfflineDb();
      return new Promise(function(resolve, reject) {
        var tx = db.transaction("lectures_audio", "readonly");
        var store = tx.objectStore("lectures_audio");
        var req = store.get(lecId);
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

  removeOfflineAudio: async function(lecId) {
    try {
      var db = await window.APP_UTILS.openOfflineDb();
      return new Promise(function(resolve, reject) {
        var tx = db.transaction("lectures_audio", "readwrite");
        var store = tx.objectStore("lectures_audio");
        var req = store.delete(lecId);
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
    var key = "counsel_ocr_p_" + bookId + "_" + pageNum;

    // 1. حفظ في المستودع الموسع IndexedDB غير المحدود بـ 5MB
    if ("indexedDB" in window && window.APP_UTILS.openOfflineDb) {
      window.APP_UTILS.openOfflineDb().then(function(db) {
        if (db && db.objectStoreNames.contains("pages_cache")) {
          var tx = db.transaction("pages_cache", "readwrite");
          tx.objectStore("pages_cache").put({ key: key, text: text, time: Date.now() });
        }
      }).catch(function() {});
    }

    // 2. حفظ احتياطي سريع في localStorage مع حماية من انهيار الحصة QuotaExceeded
    try {
      localStorage.setItem(key, text);
    } catch (eQuota) {
      try {
        var toRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf("counsel_ocr_p_") === 0) toRemove.push(k);
        }
        toRemove.slice(0, 15).forEach(function(k) { localStorage.removeItem(k); });
        localStorage.setItem(key, text);
      } catch (eFinal) {}
    }
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
    var readyCount = 0;
    var publishedCount = 0;
    var overrideCount = 0;
    var chaptersAudit = [];
    var globalIssues = [];
    var totalPagesInBook = 0;
    var totalExtractedPages = 0;
    var bookIsPublished = !!(book.publishStatus === "published" || book.isPublished === true);

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

      var adminOverride = !!c.adminOverride;
      if (adminOverride) overrideCount++;

      var isReady = (isComplete && hasAudio) || adminOverride;
      if (isReady) readyCount++;

      var isChapPublished = (c.isPublished === true) || (bookIsPublished && c.isPublished !== false);
      if (isChapPublished) publishedCount++;

      var chapIssues = [];
      if (!adminOverride) {
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
        adminOverride: adminOverride,
        isReady: isReady,
        isPublished: isChapPublished,
        issues: chapIssues
      });
    }

    if (completedCount < totalChapters) {
      globalIssues.push("يوجد " + (totalChapters - completedCount) + " فصول غير مكتملة النص.");
    }
    if (audioReadyCount < totalChapters) {
      globalIssues.push("يوجد " + (totalChapters - audioReadyCount) + " فصول ينقصها التسجيل الصوتي.");
    }

    var isPublishable = (readyCount === totalChapters) && (totalChapters > 0);
    var isPartiallyPublishable = (readyCount > 0);
    var overallPercent = Math.round((totalExtractedPages / Math.max(1, totalPagesInBook)) * 100);

    return {
      isPublishable: isPublishable,
      isPartiallyPublishable: isPartiallyPublishable,
      totalChapters: totalChapters,
      completedCount: completedCount,
      audioReadyCount: audioReadyCount,
      readyCount: readyCount,
      publishedCount: publishedCount,
      overrideCount: overrideCount,
      totalPagesInBook: totalPagesInBook,
      totalExtractedPages: totalExtractedPages,
      overallPercent: overallPercent,
      globalIssues: globalIssues,
      chaptersAudit: chaptersAudit
    };
  },

  // دالة رفع الملفات إلى درايف مع حساب دقيق لنسبة التحميل المئوية وشريط التقدم
  uploadToDriveWithProgress: function(endpoint, file, onProgress, customFileName) {
    return new Promise(function(resolve, reject) {
      if (!file) return reject(new Error("No file provided"));
      var fileName = customFileName || file.name;
      var totalFileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

      if (onProgress) {
        onProgress({
          percent: 5,
          loadedMB: "0.0",
          totalMB: totalFileSizeMB,
          stage: "reading",
          message: "⏳ جاري قراءة وتجهيز الملف (" + totalFileSizeMB + " MB)..."
        });
      }

      var reader = new FileReader();
      reader.onprogress = function(e) {
        if (e.lengthComputable && onProgress) {
          var rPct = Math.min(15, Math.max(5, Math.round((e.loaded / e.total) * 15)));
          onProgress({
            percent: rPct,
            loadedMB: (e.loaded / (1024 * 1024)).toFixed(1),
            totalMB: totalFileSizeMB,
            stage: "reading",
            message: "⏳ جاري قراءة الملف وتجهيزه: " + Math.round((e.loaded / e.total) * 100) + "%"
          });
        }
      };

      reader.onerror = function(err) {
        reject(err);
      };

      reader.onload = function() {
        var result = reader.result;
        var base64 = typeof result === "string" && result.includes(",") ? result.split(",")[1] : result;

        if (onProgress) {
          onProgress({
            percent: 15,
            loadedMB: "0.0",
            totalMB: totalFileSizeMB,
            stage: "uploading",
            message: "🚀 بدء الرفع السحابي (0%)..."
          });
        }

        var payload = JSON.stringify({
          fileName: fileName,
          mimeType: file.type || "application/pdf",
          base64Data: base64
        });

        if (onProgress) {
          onProgress({
            percent: 30,
            loadedMB: (totalFileSizeMB * 0.3).toFixed(1),
            totalMB: totalFileSizeMB,
            stage: "uploading",
            message: "🚀 جاري الرفع السحابي إلى Google Drive..."
          });
        }

        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: payload
        })
        .then(function(res) {
          if (!res.ok) throw new Error("Server returned status " + res.status);
          return res.json();
        })
        .then(function(data) {
          if (onProgress) {
            onProgress({
              percent: 100,
              loadedMB: totalFileSizeMB,
              totalMB: totalFileSizeMB,
              stage: "done",
              message: "🎉 اكتمل الرفع والحفظ بنجاح!"
            });
          }
          resolve(data);
        })
        .catch(function(err) {
          reject(new Error("Network error during file upload: " + (err && err.message ? err.message : String(err))));
        });
      };

      reader.readAsDataURL(file);
    });
  },

  // رفع ملف صوتي من رابط URL مؤقت إلى Google Drive تلقائياً لحفظه دائماً وملكاً للمستخدم
  // رفع ملف صوتي من رابط URL مؤقت إلى Google Drive تلقائياً لحفظه دائماً وملكاً للمستخدم
  uploadAudioUrlToDrive: async function(audioUrl, customFileName, onStatus) {
    if (!audioUrl || typeof audioUrl !== "string") return audioUrl;
    if (audioUrl.indexOf("drive.google.com") !== -1 || audioUrl.indexOf("lh3.googleusercontent.com") !== -1 || audioUrl.indexOf("docs.google.com") !== -1) {
      return audioUrl;
    }
    try {
      if (typeof onStatus === "function") {
        onStatus("جاري نقل وحفظ الصوت تلقائياً إلى Google Drive الخاص بك...");
      }

      var resp = null;
      if (audioUrl.indexOf("blob:") === 0 || audioUrl.indexOf("data:") === 0) {
        resp = await fetch(audioUrl);
      } else {
        // جلب الملف الصوتي عبر بروكسي السيرفر لتخطي قيود CORS للمتصفحات والموبايل وفحص الحزم
        var b64Param = "";
        try {
          b64Param = (typeof btoa === "function") ? btoa(audioUrl) : "";
        } catch (eB) {}
        var proxyUrl = b64Param ? ("/api/download-audio?b64=" + encodeURIComponent(b64Param)) : ("/api/download-audio?url=" + encodeURIComponent(audioUrl));
        try {
          resp = await fetch(proxyUrl);
        } catch (eProxy) {
          console.warn("Proxy download attempt error, falling back to direct fetch:", eProxy);
        }

        if (!resp || !resp.ok) {
          resp = await fetch(audioUrl);
        }
      }

      if (!resp.ok) {
        throw new Error("تعذر تحميل الملف الصوتي من السيرفر المصدر (" + resp.status + ")");
      }

      var blob = await resp.blob();
      var rawName = customFileName || ("audio_" + Date.now());
      var isWav = (blob.type && blob.type.indexOf("wav") !== -1) || (audioUrl && audioUrl.indexOf(".wav") !== -1);
      var ext = isWav ? ".wav" : ".mp3";
      var mimeType = isWav ? "audio/wav" : "audio/mpeg";
      var cleanFileName = rawName.replace(new RegExp("[\\\\/:*?\"<>|]", "g"), "_") + ext;
      var audioFile = new File([blob], cleanFileName, { type: mimeType });

      var endpoint = window.APP_CONFIG && window.APP_CONFIG.driveUploadEndpoint;
      if (!endpoint) {
        throw new Error("رابط رفع جوجل درايف غير معرف في إعدادات التطبيق.");
      }

      var resData = await window.APP_UTILS.uploadToDriveWithProgress(endpoint, audioFile, null, cleanFileName);
      if (resData && (resData.fileUrl || resData.fileId)) {
        var finalDriveUrl = resData.fileUrl || ("https://drive.google.com/file/d/" + resData.fileId + "/view");
        console.log("Successfully auto-uploaded audio to Google Drive permanently:", finalDriveUrl);
        return finalDriveUrl;
      } else {
        throw new Error("لم يتم استلام رابط تأكيد الحفظ من Google Drive.");
      }
    } catch (err) {
      console.error("Critical: Failed to upload audio to Google Drive:", err);
      // حظر قاطع لحفظ أي روابط مؤقتة لتجنب موتها بعد ساعات
      throw new Error("فشل تأمين الملف الصوتي بشكل دائم على Google Drive: " + (err.message || err));
    }
  },

  // ضغط وتصغير صور الأغلفة تلقائياً لمنع أي تضخم أو بطء في قاعدة البيانات
  compressImageFile: function(file, maxWidth, maxHeight, quality) {
    maxWidth = maxWidth || 450;
    maxHeight = maxHeight || 650;
    quality = quality || 0.75;

    return new Promise(function(resolve, reject) {
      if (!file || !file.type || file.type.indexOf("image/") === -1) {
        resolve(null);
        return;
      }

      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var width = img.width;
          var height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          var canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // تصدير كـ JPEG خفيف ومضغوط جداً بحجم مثالي لا يتجاوز 25-30 كيلوبايت
          var compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        };
        img.onerror = function() {
          resolve(e.target.result);
        };
        img.src = e.target.result;
      };
      reader.onerror = function(err) {
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  },

  // استخراج وتفكيك بيانات دعوة زوم الذكية من نص رسالة الواتساب
  parseZoomInvitation: function(rawText) {
    if (!rawText || typeof rawText !== "string") {
      return { zoomUrl: "", meetingId: "", passcode: "", topic: "", timeStr: "" };
    }
    var text = rawText.trim();

    // 1. استخراج رابط زوم (الرابط الأساسي Join Zoom Meeting)
    var zoomUrl = "";
    var urlMatch = text.match(/https?:\/\/[a-zA-Z0-9_\.-]*zoom\.us\/j\/[^\s\<\>"\']+/i);
    if (urlMatch && urlMatch[0]) {
      zoomUrl = urlMatch[0].trim();
      // تنظيف أي نقطة أو فاصلة في نهاية الرابط بالخطأ ما لم تكن جزءاً من رمز pwd
      if (zoomUrl.endsWith(".") && !zoomUrl.includes("pwd=")) {
        zoomUrl = zoomUrl.slice(0, -1);
      }
    }

    // 2. استخراج Meeting ID
    var meetingId = "";
    var idMatch = text.match(/Meeting\s*ID[:\s]*([0-9\s]{9,15})/i) ||
                  text.match(/معرف\s*(الاجتماع|اللقاء)[:\s]*([0-9\s]{9,15})/i) ||
                  text.match(/\/j\/([0-9]{9,12})/i);
    if (idMatch) {
      meetingId = (idMatch[1] || idMatch[2] || "").trim();
    }

    // 3. استخراج Passcode
    var passcode = "";
    var passMatch = text.match(/Passcode[:\s]*([a-zA-Z0-9]+)/i) ||
                    text.match(/كلمة\s*(المرور|السر)[:\s]*([a-zA-Z0-9]+)/i) ||
                    text.match(/رمز\s*(المرور|الدخول)[:\s]*([a-zA-Z0-9]+)/i);
    if (passMatch) {
      passcode = (passMatch[1] || "").trim();
    }

    // 4. استخراج Topic (الموضوع)
    var topic = "";
    var topicMatch = text.match(/Topic[:\s]*([^\r\n]+)/i) ||
                     text.match(/الموضوع[:\s]*([^\r\n]+)/i);
    if (topicMatch && topicMatch[1]) {
      topic = topicMatch[1].trim();
    }

    // 5. استخراج التوقيت المكتوب إن وُجد
    var timeStr = "";
    var timeMatch = text.match(/(?:Time|الموعد|التوقيت|الساعة|الوقت|تاريخ|موعد)[:\s]*([^\r\n]+)/i);
    if (timeMatch && timeMatch[1]) {
      timeStr = timeMatch[1].trim();
    }

    return {
      zoomUrl: zoomUrl,
      meetingId: meetingId,
      passcode: passcode,
      topic: topic,
      timeStr: timeStr
    };
  },

  // تحويل الأرقام العربية والمشرقية (٠-٩) إلى أرقام قياسية (0-9)
  normalizeArabicDigits: function(str) {
    if (!str) return "";
    return String(str).replace(/[٠-٩]/g, function(d) {
      return "٠١٢٣٤٥٦٧٨٩".indexOf(d);
    });
  },

  // استخراج وتحديد التوقيت الدقيق للمحاضرة وتاريخها بدقة تدعم العربية والتوقيت المسائي
  parseLectureDateTime: function(dateStr, timeStr, notesStr) {
    if (!dateStr) return null;
    var normDate = this.normalizeArabicDigits(String(dateStr).trim());
    var p = normDate.split(/[-/]/);
    var year = 0, month = 0, day = 0;
    if (p.length === 3) {
      if (p[0].length === 4) {
        year = parseInt(p[0], 10);
        month = parseInt(p[1], 10) - 1;
        day = parseInt(p[2], 10);
      } else if (p[2].length === 4) {
        day = parseInt(p[0], 10);
        month = parseInt(p[1], 10) - 1;
        year = parseInt(p[2], 10);
      }
    }
    if (!year || isNaN(year)) return null;

    var textToScan = this.normalizeArabicDigits((timeStr || "") + " " + (notesStr || ""));
    // التوقيت الافتراضي لمحاضرات المعهد (السادسة مساءً 18:00)
    var hours = 18;
    var mins = 0;
    var isPm = false;
    var isAm = false;

    if (/مساء|مساءً|م\b|م\.|pm/i.test(textToScan)) isPm = true;
    if (/صباح|صباحا|صباحاً|ص\b|ص\.|am/i.test(textToScan)) isAm = true;

    // محاولة التقاط الوقت بصيغة رقمية
    var tMatch = textToScan.match(/(?:من|الساعة|توقيت|موعد)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|ص|م|صباحا|صباحاً|مساء|مساءً)?/i);
    if (tMatch && tMatch[1]) {
      var rawH = parseInt(tMatch[1], 10);
      var rawM = tMatch[2] ? parseInt(tMatch[2], 10) : 0;
      var suffix = (tMatch[3] || "").toLowerCase();
      if (/مساء|مساءً|م|pm/.test(suffix)) isPm = true;
      if (/صباح|صباحا|صباحاً|ص|am/.test(suffix)) isAm = true;

      if (rawH >= 0 && rawH <= 23) {
        hours = rawH;
        mins = rawM;
        if (hours < 12 && isPm) hours += 12;
        else if (hours === 12 && isAm) hours = 0;
        else if (hours < 12 && !isAm && hours >= 4 && hours <= 11) hours += 12; // محاضرات معهد المشورة تعقد دائماً مساءً
      }
    }

    var targetDate = new Date(year, month, day, hours, mins, 0);
    var timeStr24 = (hours < 10 ? "0" + hours : hours) + ":" + (mins < 10 ? "0" + mins : mins);
    var displayH = hours % 12 || 12;
    var displayAmPm = hours >= 12 ? "مساءً" : "صباحاً";
    var formattedTime = (displayH < 10 ? "0" + displayH : displayH) + ":" + (mins < 10 ? "0" + mins : mins) + " " + displayAmPm;

    return {
      targetDate: targetDate,
      year: year,
      month: month,
      day: day,
      hours: hours,
      mins: mins,
      timeStr: timeStr24,
      formattedTime: formattedTime,
      isValid: !isNaN(targetDate.getTime())
    };
  },

  // حساب العد التنازلي التفاعلي المتبقي للمحاضرة أو لقاء الزوم
  getCountdownInfo: function(dateStr, timeStr, notesStr) {
    if (!dateStr) return null;
    var now = new Date();
    var parsed = this.parseLectureDateTime(dateStr, timeStr, notesStr);
    if (!parsed || !parsed.isValid) return null;

    var targetDate = parsed.targetDate;
    var diffMs = targetDate.getTime() - now.getTime();

    // اللقاء جاري الآن (من قبل الموعد بـ 15 دقيقة حتى بعد الموعد بـ 180 دقيقة)
    if (diffMs <= (15 * 60 * 1000) && diffMs >= (-180 * 60 * 1000)) {
      return {
        status: "live",
        label: "🔴 جارية الآن عبر زوم",
        shortBadge: "🔴 جارية الآن",
        diffMs: diffMs,
        formattedTime: parsed.formattedTime
      };
    }

    // اللقاء انتهى
    if (diffMs < (-180 * 60 * 1000)) {
      return {
        status: "past",
        label: "انتهت المحاضرة",
        shortBadge: "انتهت",
        diffMs: diffMs,
        formattedTime: parsed.formattedTime
      };
    }

    // اللقاء قادم: حساب الأيام والساعات والدقائق
    var totalSecs = Math.floor(diffMs / 1000);
    var days = Math.floor(totalSecs / 86400);
    var hours = Math.floor((totalSecs % 86400) / 3600);
    var mins = Math.floor((totalSecs % 3600) / 60);

    var fullLabel = "متبقي ";
    var shortBadge = "⏳ بعد ";

    if (days > 0) {
      fullLabel += days + (days === 1 ? " يوم و " : " أيام و ") + hours + " ساعة";
      shortBadge += days + (days === 1 ? " يوم" : " أيام");
    } else if (hours > 0) {
      fullLabel += hours + " ساعة و " + mins + " دقيقة";
      shortBadge += hours + " س و " + mins + " د";
    } else {
      fullLabel += mins + " دقيقة";
      shortBadge += mins + " دقيقة";
    }

    return {
      status: "upcoming",
      label: fullLabel,
      shortBadge: shortBadge,
      days: days,
      hours: hours,
      mins: mins,
      diffMs: diffMs,
      formattedTime: parsed.formattedTime
    };
  },

  // إنشاء رابط تقويم Google Calendar مع تنبيهات تلقائية
  getGoogleCalendarUrl: function(lecture) {
    if (!lecture) return "";
    var parsed = this.parseLectureDateTime(lecture.date, lecture.zoomTimeStr || lecture.startTime, lecture.notes);
    if (!parsed || !parsed.isValid) return "";

    var start = parsed.targetDate;
    var end = new Date(start.getTime() + (2.5 * 60 * 60 * 1000)); // مدة المحاضرة ساعتان ونصف

    function toIsoUtc(d) {
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    }

    var title = encodeURIComponent("محاضرة: " + (lecture.title || "معهد المشورة") + (lecture.speaker ? " - " + lecture.speaker : ""));
    var details = encodeURIComponent(
      "محاضرة معهد المشورة عبر تطبيق زوم.\n" +
      (lecture.zoomUrl ? "رابط زوم المباشر: " + lecture.zoomUrl + "\n" : "") +
      (lecture.meetingId ? "Meeting ID: " + lecture.meetingId + "\n" : "") +
      (lecture.passcode ? "Passcode: " + lecture.passcode + "\n" : "") +
      (lecture.notes ? "\nملاحظات: " + lecture.notes + "\n" : "") +
      "\nتمت الإضافة عبر تطبيق الرفيق الذكي لدارسي معهد المشورة"
    );
    var location = encodeURIComponent(lecture.zoomUrl || "Zoom Meeting");
    var dates = toIsoUtc(start) + "/" + toIsoUtc(end);

    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + title + "&dates=" + dates + "&details=" + details + "&location=" + location;
  },

  // تنزيل ملف التقويم iCalendar (.ics) لضبط منبهات الموبايل القياسية (تنبيه قبلها بيوم وقبلها بـ 15 دقيقة)
  downloadCalendarIcs: function(lecture) {
    if (!lecture) return;
    var parsed = this.parseLectureDateTime(lecture.date, lecture.zoomTimeStr || lecture.startTime, lecture.notes);
    if (!parsed || !parsed.isValid) {
      alert("تعذر تحديد موعد المحاضرة بدقة لإضافتها للتقويم.");
      return;
    }

    var start = parsed.targetDate;
    var end = new Date(start.getTime() + (2.5 * 60 * 60 * 1000));

    function toIsoUtc(d) {
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    }

    var startUtc = toIsoUtc(start);
    var endUtc = toIsoUtc(end);
    var stampUtc = toIsoUtc(new Date());

    var summary = (lecture.title || "محاضرة المشورة") + (lecture.speaker ? " - " + lecture.speaker : "");
    var desc = "محاضرة معهد المشورة عبر زووم\\n" +
      (lecture.zoomUrl ? "الرابط: " + lecture.zoomUrl + "\\n" : "") +
      (lecture.meetingId ? "Meeting ID: " + lecture.meetingId + "\\n" : "") +
      (lecture.passcode ? "Passcode: " + lecture.passcode + "\\n" : "");

    var icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Counseling Platform//AR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:counsel-" + (lecture.id || Date.now()) + "@counseling-platform.org",
      "DTSTAMP:" + stampUtc,
      "DTSTART:" + startUtc,
      "DTEND:" + endUtc,
      "SUMMARY:" + summary,
      "DESCRIPTION:" + desc,
      "LOCATION:" + (lecture.zoomUrl || "Zoom Meeting"),
      // منبه الموبايل الأول: قبل المحاضرة بيوم كامل (24 ساعة)
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:تذكير: غداً موعد محاضرة " + summary + " عبر زووم",
      "TRIGGER:-P1D",
      "END:VALARM",
      // منبه الموبايل الثاني: قبل المحاضرة بساعة (60 دقيقة)
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:تذكير: بعد ساعة تبدأ محاضرة " + summary + " عبر زووم",
      "TRIGGER:-PT1H",
      "END:VALARM",
      // منبه الموبايل الثالث: قبل المحاضرة بـ 15 دقيقة للدخول السريع
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:تذكير عاجل: تبدأ قاعة زوم الآن لمحاضرة " + summary,
      "TRIGGER:-PT15M",
      "END:VALARM",
      // منبه الموبايل الرابع: عند موعد بدء المحاضرة بالدقيقة
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:بدأت محاضرة " + summary + " الآن عبر زووم - اضغط للدخول",
      "TRIGGER:PT0S",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR"
    ];

    var icsContent = icsLines.join("\r\n");
    var blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "zoom_lecture_" + (lecture.date || "session") + ".ics";
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  },

  // إظهار خيارات إضافة المحاضرة للتقويم (Google Calendar أو تقويم الموبايل الافتراضي)
  addToCalendarPrompt: function(lecture) {
    if (!lecture) return;
    var gUrl = this.getGoogleCalendarUrl(lecture);
    var choice = window.confirm(
      "📅 هل ترغب في فتح تقويم Google Calendar لضبط المنبه؟\n\n" +
      "• اضغط (موافق / OK) لفتح Google Calendar مباشرة على هاتفك أو حاسوبك.\n" +
      "• اضغط (إلغاء / Cancel) لتنزيل ملف التقويم (.ics) ليفتح مباشرة في تطبيق التقويم الافتراضي في الموبايل (Apple Calendar / Samsung) مع منبه قبلها بيوم وقبلها بـ 15 دقيقة."
    );
    if (choice && gUrl) {
      window.open(gUrl, "_blank");
    } else {
      this.downloadCalendarIcs(lecture);
    }
  }
};
