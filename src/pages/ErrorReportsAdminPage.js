// شاشة تقارير الأعطال والأخطاء الفنية (للمسؤول نادر كمال فقط)
window.ErrorReportsAdminPage = function(props) {
  var currentUser = props.currentUser || { role: "admin" };
  var [reports, setReports] = React.useState([]);
  var [isLoading, setIsLoading] = React.useState(true);

  var fetchReports = async function() {
    if (!window.db) return;
    try {
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

  if (!currentUser || currentUser.role !== "admin") return null;

  var openReports = reports.filter(function(r) { return r.status !== "resolved"; });
  var resolvedReports = reports.filter(function(r) { return r.status === "resolved"; });

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
          React.createElement("span", null, "🛠️"),
          "سجل بلاغات الأعطال من المستخدمين"
        ),
        React.createElement("p", { className: "text-xs text-slate-500 mt-1" }, "تقارير الأخطاء البرمجية وأكواد الـ Stack Trace المرسلة من الزملاء للتشخيص والإصلاح")
      ),
      React.createElement("button", {
        onClick: fetchReports,
        className: "text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 font-semibold"
      }, "تحديث البلاغات 🔄")
    ),

    // البلاغات المفتوحة
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
      React.createElement("div", { className: "flex items-center justify-between border-b pb-3" },
        React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "بلاغات بحاجة للإصلاح (" + openReports.length + ")"),
        React.createElement("span", { className: "text-xs bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full font-bold" }, "مفتوحة")
      ),

      openReports.length > 0 ? React.createElement(
        "div",
        { className: "space-y-4" },
        openReports.map(function(r) {
          return React.createElement(
            "div",
            {
              key: r.id,
              className: "p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 space-y-3"
            },
            React.createElement(
              "div",
              { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2" },
              React.createElement("div", null,
                React.createElement("span", { className: "text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded-md ml-2" }, "الصفحة: " + r.page),
                React.createElement("span", { className: "text-xs font-semibold text-slate-700 dark:text-slate-300" }, "المرسل: " + r.senderName + " (" + r.senderPhone + ")")
              ),
              React.createElement("button", {
                onClick: function() { handleResolve(r.id); },
                className: "px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
              }, "تم الإصلاح بنجاح ✓")
            ),
            React.createElement("div", { className: "p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 text-xs text-slate-800 dark:text-slate-200" },
              React.createElement("span", { className: "font-bold text-slate-400 block mb-0.5" }, "وصف المستخدم:"),
              r.userDescription
            ),
            React.createElement("div", { className: "p-3 bg-slate-900 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-40" },
              r.errorDetails
            )
          );
        })
      ) : React.createElement(
        "div",
        { className: "p-6 text-center text-xs text-slate-400" },
        "ممتاز! لا توجد أي بلاغات أعطال معلقة حالياً."
      )
    )
  );
};
