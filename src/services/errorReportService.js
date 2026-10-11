// خدمة التقاط أخطاء النظام السحابية
window.ErrorReportService = {
  lastError: null,

  initGlobalErrorHandler: function() {
    window.onerror = function(message, source, lineno, colno, error) {
      window.ErrorReportService.lastError = {
        message: message,
        source: source,
        line: lineno,
        col: colno,
        stack: error ? error.stack : "",
        time: new Date().toISOString()
      };
      console.warn("Global error captured:", window.ErrorReportService.lastError);
    };

    window.addEventListener("unhandledrejection", function(event) {
      window.ErrorReportService.lastError = {
        message: event.reason ? (event.reason.message || event.reason) : "Unhandled Promise Rejection",
        stack: event.reason && event.reason.stack ? event.reason.stack : "",
        time: new Date().toISOString()
      };
      console.warn("Unhandled promise rejection captured:", window.ErrorReportService.lastError);
    });
  },

  // إرسال تقرير الخطأ إلى فايربيز
  sendReport: async function(reportData) {
    if (!window.db) throw new Error("قاعدة البيانات غير متصلة");
    var docId = "err_" + Date.now();
    var payload = Object.assign({}, reportData, {
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "open" // 'open' or 'resolved'
    });
    return window.db.collection("error_reports").doc(docId).set(payload);
  },

  // رفع تسجيل صوتي للعطل إلى Firebase Storage
  uploadAudio: async function(audioBlob) {
    if (!window.storage) {
      console.warn("Storage not available, skipping audio upload");
      return null;
    }
    var ext = (audioBlob.type && audioBlob.type.indexOf("ogg") !== -1) ? "ogg" : "webm";
    var fileName = "error_audios/voice_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7) + "." + ext;
    var ref = window.storage.ref().child(fileName);
    var snapshot = await ref.put(audioBlob);
    var downloadUrl = await snapshot.ref.getDownloadURL();
    return {
      audioUrl: downloadUrl,
      storagePath: fileName
    };
  },

  // حذف تقرير والملف الصوتي المرتبط به
  deleteReport: async function(reportId, storagePath) {
    if (!window.db) return;
    try {
      if (storagePath && window.storage) {
        try {
          await window.storage.ref().child(storagePath).delete();
        } catch (e) {
          console.warn("Storage delete failed or file not found:", e);
        }
      }
      await window.db.collection("error_reports").doc(reportId).delete();
    } catch (err) {
      console.error("Delete report error:", err);
      throw err;
    }
  },

  // تنظيف تلقائي للبلاغات القديمة التي تم حلها ومر عليها 14 يوماً
  cleanupOldReports: async function() {
    if (!window.db) return;
    try {
      var twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      var snap = await window.db.collection("error_reports")
        .where("status", "==", "resolved")
        .get();
      
      var deletePromises = [];
      snap.forEach(function(doc) {
        var data = doc.data();
        var isOld = false;
        if (data.resolvedAt && typeof data.resolvedAt.toDate === "function") {
          isOld = data.resolvedAt.toDate() < twoWeeksAgo;
        } else if (data.createdAt && typeof data.createdAt.toDate === "function") {
          isOld = data.createdAt.toDate() < twoWeeksAgo;
        }
        if (isOld) {
          deletePromises.push(window.ErrorReportService.deleteReport(doc.id, data.audioStoragePath));
        }
      });
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log("Cleaned up " + deletePromises.length + " old resolved error reports.");
      }
    } catch (e) {
      console.warn("Auto cleanup reports error:", e);
    }
  }
};

window.ErrorReportService.initGlobalErrorHandler();
