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
  }
};

window.ErrorReportService.initGlobalErrorHandler();
