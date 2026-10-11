// شاشة تقارير الأعطال والاقتراحات الفنية (للمسؤول نادر كمال فقط) مع دعم الاستماع للتسجيل الصوتي والحذف التلقائي
window.ErrorReportsAdminPage = function(props) {
  var currentUser = props.currentUser || { role: "student" };
  var [reports, setReports] = React.useState([]);
  var [filterTab, setFilterTab] = React.useState("all"); // "all", "bugs", "suggestions"
  var [isLoading, setIsLoading] = React.useState(true);

  var fetchReports = async function() {
    if (!window.db || !currentUser || currentUser.role !== "admin") return;
    try {
      // تنظيف تلقائي للبلاغات القديمة التي تم حلها ومضى عليها 14 يوماً
      if (window.ErrorReportService && window.ErrorReportService.cleanupOldReports) {
        window.ErrorReportService.cleanupOldReports();
      }

      var snap = await window.db.collection("error_reports").orderBy("createdAt", "desc").get();
      var list = [];
      snap.forEach(function(doc) {
        list.push(Object.assign({ id: doc.id }, doc.data()));
      });
      setReports(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(function() {
    fetchReports();
  }, []);

  var handleResolve = async function(reportId) {
    if (!window.db) return;
    try {
      await window.db.collection("error_reports").doc(reportId).set({
        status: "resolved",
        resolvedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      setReports(reports.map(function(r) {
        if (r.id === reportId) return Object.assign({}, r, { status: "resolved" });
        return r;
      }));
    } catch (e) {
      alert("خطأ: " + e.message);
    }
  };

  var handleDelete = async function(report) {
    if (!confirm("هل أنت متأكد من حذف هذا السجل وملفه الصوتي نهائياً لتوفير المساحة؟")) return;
    try {
      await window.ErrorReportService.deleteReport(report.id, report.audioStoragePath);
      setReports(reports.filter(function(r) { return r.id !== report.id; }));
    } catch (err) {
      alert("فشل الحذف: " + err.message);
    }
  };

  if (!currentUser || currentUser.role !== "admin") return null;

  var filteredList = reports.filter(function(r) {
    if (filterTab === "bugs") return r.type !== "suggestion";
    if (filterTab === "suggestions") return r.type === "suggestion";
    return true;
  });

  var openReports = filteredList.filter(function(r) { return r.status !== "resolved"; });
  var resolvedReports = filteredList.filter(function(r) { return r.status === "resolved"; });

  var renderReportCard = function(r, isResolved) {
    var isSuggestion = r.type === "suggestion";
    var dateStr = "-";
    if (r.createdAt && typeof r.createdAt.toDate === "function") {
      dateStr = r.createdAt.toDate().toLocaleString("ar-EG");
    }

    return React.createElement(
      "div",
      {
        key: r.id,
        className: "p-4 sm:p-5 rounded-2xl border " + (
          isResolved ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-80" : 
          (isSuggestion ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20" : "border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20")
        ) + " space-y-3"
      },
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2" },
        React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
          React.createElement("span", { className: "text-xs font-bold px-2.5 py-0.5 rounded-lg " + (isSuggestion ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300" : "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300") }, 
            isSuggestion ? "💡 اقتراح تطوير" : "🚨 عطل فني"
          ),
          React.createElement("span", { className: "text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2.5 py-0.5 rounded-lg" }, "القسم: " + r.page),
          React.createElement("span", { className: "text-xs font-bold text-slate-700 dark:text-slate-300" }, "👤 " + r.senderName + " (" + r.senderPhone + ")"),
          React.createElement("span", { className: "text-[11px] text-slate-400" }, "🕒 " + dateStr)
        ),
        React.createElement("div", { className: "flex items-center gap-2" },
          !isResolved ? React.createElement("button", {
            onClick: function() { handleResolve(r.id); },
            className: "px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1"
          }, isSuggestion ? "تم الاطلاع والاعتماد ✓" : "تم الإصلاح بنجاح ✓") : React.createElement("span", { className: "text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg" }, "منتهي ✓"),
          React.createElement("button", {
            onClick: function() { handleDelete(r); },
            title: "حذف نهائي للملف والسجل لتوفير المساحة",
            className: "px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all"
          }, "🗑️")
        )
      ),

      // تسجيل صوتي
      r.audioUrl ? React.createElement(
        "div",
        { className: "p-3 " + (isSuggestion ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500/20" : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/20") + " rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" },
        React.createElement("div", { className: "flex items-center gap-2 text-xs font-bold " + (isSuggestion ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300") },
          React.createElement("span", { className: "text-lg" }, "🎙️"),
          isSuggestion ? "استمع لشرح الاقتراح بصوت الدارس:" : "استمع لشرح المشكلة بصوت الدارس:"
        ),
        React.createElement("audio", {
          src: r.audioUrl,
          controls: true,
          className: "w-full sm:w-64 h-9"
        })
      ) : null,

      // الوصف المكتوب
      React.createElement("div", { className: "p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200" },
        React.createElement("span", { className: "font-bold text-slate-400 block mb-0.5" }, isSuggestion ? "تفاصيل الاقتراح:" : "وصف المشكلة:"),
        r.userDescription || "لا يوجد وصف كتابي"
      ),

      // التفاصيل التقنية للأعطال فقط
      (!isSuggestion && r.errorDetails) ? React.createElement("div", { className: "p-3 bg-slate-900 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-36 ltr", dir: "ltr" },
        r.errorDetails
      ) : null
    );
  };

  return React.createElement(
    "div",
    { className: "space-y-6 pb-12" },

    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" },
      React.createElement(
        "div",
        null,
        React.createElement("h2", { className: "text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2" },
          React.createElement("span", null, "💡"),
          "سجل بلاغات الأعطال والاقتراحات الصوتية"
        ),
        React.createElement("p", { className: "text-xs text-slate-500 mt-1" }, "استمع لفويسات الدارسين واقتراحاتهم وتفاصيل الأعطال دون الحاجة لإزعاج الواتساب (تنظيف أوتوماتيكي بعد 14 يوم)")
      ),
      React.createElement("div", { className: "flex items-center gap-2" },
        React.createElement("button", {
          onClick: fetchReports,
          className: "text-xs px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center gap-1.5 transition-all"
        }, "تحديث 🔄")
      )
    ),

    // تبويبات التصفية: الكل / الأعطال / الاقتراحات
    React.createElement(
      "div",
      { className: "flex items-center gap-2" },
      React.createElement("button", {
        onClick: function() { setFilterTab("all"); },
        className: "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (filterTab === "all" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
      }, "الكل (" + reports.length + ")"),
      React.createElement("button", {
        onClick: function() { setFilterTab("bugs"); },
        className: "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (filterTab === "bugs" ? "bg-rose-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
      }, "🚨 الأعطال (" + reports.filter(function(r) { return r.type !== "suggestion"; }).length + ")"),
      React.createElement("button", {
        onClick: function() { setFilterTab("suggestions"); },
        className: "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (filterTab === "suggestions" ? "bg-amber-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
      }, "💡 الاقتراحات (" + reports.filter(function(r) { return r.type === "suggestion"; }).length + ")")
    ),

    // السجلات المفتوحة
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
      React.createElement("div", { className: "flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3" },
        React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "رسائل وبلاغات معلقة (" + openReports.length + ")"),
        React.createElement("span", { className: "text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 px-2.5 py-0.5 rounded-full font-bold" }, "جديدة / مفتوحة")
      ),

      openReports.length > 0 ? React.createElement(
        "div",
        { className: "space-y-4" },
        openReports.map(function(r) { return renderReportCard(r, false); })
      ) : React.createElement(
        "div",
        { className: "p-6 text-center text-xs text-slate-400" },
        "رائع جداً! لا توجد أي بلاغات أو اقتراحات معلقة حالياً 🎉"
      )
    ),

    // السجلات المنتهية
    resolvedReports.length > 0 ? React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
      React.createElement("div", { className: "flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3" },
        React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "سجلات تم التعامل معها سابقاً (" + resolvedReports.length + ")"),
        React.createElement("span", { className: "text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold" }, "منتهية")
      ),
      React.createElement(
        "div",
        { className: "space-y-4" },
        resolvedReports.map(function(r) { return renderReportCard(r, true); })
      )
    ) : null
  );
};
