// شاشة تقارير الأعطال والاقتراحات الفنية (للمسؤول نادر كمال فقط) مع دعم الاستماع للتسجيل الصوتي والحذف التلقائي
window.ErrorReportsAdminPage = function(props) {
  var currentUser = props.currentUser || { role: "student" };
  var [reports, setReports] = React.useState([]);
  var [filterTab, setFilterTab] = React.useState("all"); // "all", "bugs", "suggestions"
  var [isLoading, setIsLoading] = React.useState(true);

  var fetchReports = function() {
    if (!window.db || !currentUser || currentUser.role !== "admin") {
      setIsLoading(false);
      return function() {};
    }
    try {
      // تنظيف تلقائي للبلاغات القديمة التي تم حلها ومضى عليها 14 يوماً
      if (window.ErrorReportService && window.ErrorReportService.cleanupOldReports) {
        window.ErrorReportService.cleanupOldReports();
      }

      return window.db.collection("error_reports")
        .orderBy("createdAt", "desc")
        .onSnapshot(function(snap) {
          var list = [];
          snap.forEach(function(doc) {
            list.push(Object.assign({ id: doc.id }, doc.data()));
          });
          setReports(list);
          setIsLoading(false);
        }, async function(err) {
          console.warn("Error reports onSnapshot failed, attempting fallback:", err);
          try {
            var rawSnap = await window.db.collection("error_reports").get();
            var fallbackList = [];
            rawSnap.forEach(function(doc) {
              fallbackList.push(Object.assign({ id: doc.id }, doc.data()));
            });
            fallbackList.sort(function(a, b) {
              var tA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
              var tB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
              return tB - tA;
            });
            setReports(fallbackList);
          } catch(fallbackErr) {
            console.error("Fallback error reports fetch failed:", fallbackErr);
          } finally {
            setIsLoading(false);
          }
        });
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      return function() {};
    }
  };

  React.useEffect(function() {
    var unsubscribe = fetchReports();
    return function() {
      if (typeof unsubscribe === "function") unsubscribe();
    };
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

  var [replyingReportId, setReplyingReportId] = React.useState(null);
  var [replyInputText, setReplyInputText] = React.useState("");
  var [isSendingReply, setIsSendingReply] = React.useState(false);

  var filteredList = reports.filter(function(r) {
    if (filterTab === "bugs") return r.type !== "suggestion" && r.type !== "feature_request";
    if (filterTab === "features") return r.type === "feature_request";
    if (filterTab === "suggestions") return r.type === "suggestion";
    return true;
  });

  var openReports = filteredList.filter(function(r) { return r.status !== "resolved" && r.status !== "implemented" && r.status !== "not_applicable"; });
  var resolvedReports = filteredList.filter(function(r) { return r.status === "resolved" || r.status === "implemented" || r.status === "not_applicable"; });

  var handleUpdateStatus = async function(reportId, newStatus) {
    if (!window.db) return;
    try {
      var isDone = (newStatus === "implemented" || newStatus === "resolved" || newStatus === "not_applicable");
      var updatePayload = {
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (isDone) {
        updatePayload.resolvedAt = firebase.firestore.FieldValue.serverTimestamp();
      }
      await window.db.collection("error_reports").doc(reportId).set(updatePayload, { merge: true });
    } catch(e) {
      alert("خطأ أثناء تحديث الحالة: " + e.message);
    }
  };

  var handleSendReply = async function(report, customText, forcedStatus) {
    var text = (customText || replyInputText).trim();
    if (!text) {
      alert("يرجى كتابة نص الرد للدارس.");
      return;
    }
    setIsSendingReply(true);
    try {
      var statusToSet = forcedStatus || report.status || "under_review";
      if (!forcedStatus && report.status === "pending") statusToSet = "under_review";

      await window.db.collection("error_reports").doc(report.id).set({
        adminReply: text,
        status: statusToSet,
        repliedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      if (window.NotificationService && typeof window.NotificationService.notifyStudentFeatureReply === "function") {
        await window.NotificationService.notifyStudentFeatureReply(
          report.senderEmail,
          report.senderId,
          report.featureTitle || report.page || "اقتراحك",
          text,
          statusToSet
        );
      }

      setReplyingReportId(null);
      setReplyInputText("");
      alert("تم إرسال الرد بنجاح وإشعار الدارس في حسابه ✓");
    } catch(err) {
      alert("خطأ أثناء إرسال الرد: " + err.message);
    } finally {
      setIsSendingReply(false);
    }
  };

  var renderReportCard = function(r, isResolved) {
    var isFeature = r.type === "feature_request";
    var isSuggestion = r.type === "suggestion";
    var dateStr = "-";
    if (r.createdAt && typeof r.createdAt.toDate === "function") {
      dateStr = r.createdAt.toDate().toLocaleString("ar-EG");
    }

    var badgeText = isFeature ? "💡 ميزة جديدة مطلوبة" : (isSuggestion ? "💡 اقتراح تطوير" : "🚨 عطل فني");
    var badgeClass = isFeature ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300" : (isSuggestion ? "bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300" : "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300");

    var isReplying = replyingReportId === r.id;

    return React.createElement(
      "div",
      {
        key: r.id,
        className: "p-4 sm:p-5 rounded-2xl border " + (
          isResolved ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-80" : 
          (isFeature ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs" : 
          (isSuggestion ? "border-sky-200 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/20" : "border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20"))
        ) + " space-y-3"
      },
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2" },
        React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
          React.createElement("span", { className: "text-xs font-bold px-2.5 py-0.5 rounded-lg " + badgeClass }, badgeText),
          isFeature && r.featureTitle ? React.createElement("span", { className: "text-xs font-black text-slate-900 dark:text-white px-2 py-0.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" }, r.featureTitle) : null,
          React.createElement("span", { className: "text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2.5 py-0.5 rounded-lg" }, "القسم: " + (r.category || r.page || "عام")),
          React.createElement("span", { className: "text-xs font-bold text-slate-700 dark:text-slate-300" }, "👤 " + (r.senderName || "دارس") + (r.senderPhone && r.senderPhone !== "-" ? " (" + r.senderPhone + ")" : "")),
          React.createElement("span", { className: "text-[11px] text-slate-400" }, "🕒 " + dateStr)
        ),
        React.createElement("div", { className: "flex items-center gap-2 shrink-0" },
          isFeature && React.createElement("button", {
            type: "button",
            onClick: function() {
              if (isReplying) {
                setReplyingReportId(null);
              } else {
                setReplyingReportId(r.id);
                setReplyInputText(r.adminReply || "");
              }
            },
            className: "px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1 active:scale-95"
          }, "💬 " + (r.adminReply ? "تعديل الرد" : "رد على الدارس")),
          !isResolved && !isFeature && React.createElement("button", {
            onClick: function() { handleResolve(r.id); },
            className: "px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1"
          }, isSuggestion ? "تم الاطلاع والاعتماد ✓" : "تم الإصلاح بنجاح ✓"),
          isResolved && !isFeature && React.createElement("span", { className: "text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg" }, "منتهي ✓"),
          React.createElement("button", {
            onClick: function() { handleDelete(r); },
            title: "حذف نهائي للملف والسجل لتوفير المساحة",
            className: "px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all"
          }, "🗑️")
        )
      ),

      // تسجيل صوتي إن وجد
      r.audioUrl ? React.createElement(
        "div",
        { className: "p-3 " + (isFeature ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500/20" : (isSuggestion ? "bg-sky-50 dark:bg-sky-950/30 border-sky-500/20" : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/20")) + " rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" },
        React.createElement("div", { className: "flex items-center gap-2 text-xs font-bold " + (isFeature ? "text-amber-800 dark:text-amber-300" : (isSuggestion ? "text-sky-800 dark:text-sky-300" : "text-emerald-800 dark:text-emerald-300")) },
          React.createElement("span", { className: "text-lg" }, "🎙️"),
          isFeature ? "استمع لشرح فكرة الميزة بصوت الدارس:" : (isSuggestion ? "استمع لشرح الاقتراح بصوت الدارس:" : "استمع لشرح المشكلة بصوت الدارس:")
        ),
        React.createElement("audio", {
          src: r.audioUrl,
          controls: true,
          className: "w-full sm:w-64 h-9"
        })
      ) : null,

      // الوصف المكتوب
      React.createElement("div", { className: "p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200" },
        React.createElement("span", { className: "font-bold text-slate-400 block mb-0.5" }, isFeature ? "شرح وتفاصيل الميزة المطلوبة:" : (isSuggestion ? "تفاصيل الاقتراح:" : "وصف المشكلة:")),
        r.userDescription || "لا يوجد وصف كتابي"
      ),

      // أزرار الحالة السريعة لطلبات الميزات
      isFeature && React.createElement(
        "div",
        { className: "flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800" },
        React.createElement("span", { className: "text-xs font-bold text-slate-500" }, "حالة الفكرة:"),
        React.createElement("button", {
          type: "button",
          onClick: function() { handleUpdateStatus(r.id, "under_review"); },
          className: "px-2.5 py-1 rounded-xl text-xs font-bold transition-all " +
            (r.status === "under_review" || !r.status ? "bg-amber-500 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
        }, "⏳ قيد الدراسة"),
        React.createElement("button", {
          type: "button",
          onClick: function() { handleUpdateStatus(r.id, "in_progress"); },
          className: "px-2.5 py-1 rounded-xl text-xs font-bold transition-all " +
            (r.status === "in_progress" ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
        }, "🛠️ جاري البرمجة"),
        React.createElement("button", {
          type: "button",
          onClick: function() { handleUpdateStatus(r.id, "implemented"); },
          className: "px-2.5 py-1 rounded-xl text-xs font-bold transition-all " +
            (r.status === "implemented" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
        }, "🎉 تم التنفيذ والإطلاق!"),
        React.createElement("button", {
          type: "button",
          onClick: function() { handleUpdateStatus(r.id, "not_applicable"); },
          className: "px-2.5 py-1 rounded-xl text-xs font-bold transition-all " +
            (r.status === "not_applicable" ? "bg-slate-700 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
        }, "🛑 غير متاح حالياً")
      ),

      // صندوق الرد السابق إذا كان موجوداً
      r.adminReply && !isReplying && React.createElement(
        "div",
        { className: "p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-1 text-xs" },
        React.createElement("div", { className: "flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300" },
          React.createElement("span", null, "💬 ردك المرسل للدارس:"),
          React.createElement("span", { className: "text-[10px] text-emerald-600 dark:text-emerald-400" }, "تم تسليمه لحسابه ✓")
        ),
        React.createElement("p", { className: "text-slate-800 dark:text-slate-200 leading-relaxed font-medium" }, r.adminReply)
      ),

      // صندوق كتابة وإرسال الرد
      isReplying && React.createElement(
        "div",
        { className: "p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-3 animate-in fade-in" },
        React.createElement("div", { className: "flex items-center justify-between" },
          React.createElement("label", { className: "text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5" },
            React.createElement("span", null, "✍️"),
            "كتابة رد شخصي للدارس (" + (r.senderName || "الدارس") + "):"
          ),
          React.createElement("button", {
            type: "button",
            onClick: function() { setReplyingReportId(null); },
            className: "text-xs text-slate-400 hover:text-slate-600"
          }, "إغلاق")
        ),

        // قوالب ردود سريعة بنقرة واحدة
        React.createElement(
          "div",
          { className: "flex flex-wrap gap-1.5" },
          React.createElement("button", {
            type: "button",
            onClick: function() { setReplyInputText("فكرة ممتازة جداً ومفيدة! تم اعتمادها وإضافتها لخطة التحديثات القادمة 👏"); },
            className: "px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-all"
          }, "⚡ فكرة ممتازة ومعتمدة"),
          React.createElement("button", {
            type: "button",
            onClick: function() { setReplyInputText("مبروك! تم الانتهاء من برمجة هذه الميزة وإطلاقها في المنصة بنجاح. جربها الآن 🎉"); },
            className: "px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-all"
          }, "🎉 تم التنفيذ والإطلاق"),
          React.createElement("button", {
            type: "button",
            onClick: function() { setReplyInputText("شكراً لمشاركتك واهتمامك! سيتم دراسة إمكانية تنفيذ الفكرة في التحديثات اللاحقة."); },
            className: "px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all"
          }, "⏳ شكراً وسيتم دراستها"),
          React.createElement("button", {
            type: "button",
            onClick: function() { setReplyInputText("شكراً جزيلاً لاهتمامك واقتراحك! تمت دراسة الفكرة ولكنها غير قابلة للتطبيق في الوقت الحالي بسبب طبيعة المنهج ونظام الدراسة. نقدّر جداً حرصك ومشاركتك 🌹"); },
            className: "px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all"
          }, "🛑 اعتذار وتوضيح مهذب")
        ),

        React.createElement("textarea", {
          rows: 2,
          value: replyInputText,
          onChange: function(e) { setReplyInputText(e.target.value); },
          placeholder: "اكتب رسالتك للدارس هنا، ستصله فوراً في مركز الإشعارات...",
          className: "w-full p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
        }),

        React.createElement(
          "div",
          { className: "flex justify-end gap-2" },
          React.createElement("button", {
            type: "button",
            onClick: function() { setReplyingReportId(null); },
            className: "px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-xl"
          }, "إلغاء"),
          React.createElement("button", {
            type: "button",
            disabled: isSendingReply,
            onClick: function() { handleSendReply(r, replyInputText); },
            className: "px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 disabled:opacity-50"
          }, isSendingReply ? "جاري الإرسال..." : "إرسال الرد وإشعار الدارس ✉️")
        )
      ),

      // التفاصيل التقنية للأعطال فقط
      (!isSuggestion && !isFeature && r.errorDetails) ? React.createElement("div", { className: "p-3 bg-slate-900 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-36 ltr", dir: "ltr" },
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
          "سجل بلاغات الأعطال وطلبات الميزات والاقتراحات"
        ),
        React.createElement("p", { className: "text-xs text-slate-500 mt-1" }, "استمع لفويسات الدارسين واقتراحاتهم وقم بالرد المباشر عليهم بضغطة زر واحدة")
      ),
      React.createElement("div", { className: "flex items-center gap-2" },
        React.createElement("button", {
          onClick: fetchReports,
          className: "text-xs px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center gap-1.5 transition-all"
        }, "تحديث 🔄")
      )
    ),

    // تبويبات التصفية: الكل / الأعطال / طلبات الميزات / الاقتراحات
    React.createElement(
      "div",
      { className: "flex flex-wrap items-center gap-2" },
      React.createElement("button", {
        onClick: function() { setFilterTab("all"); },
        className: "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (filterTab === "all" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
      }, "الكل (" + reports.length + ")"),
      React.createElement("button", {
        onClick: function() { setFilterTab("features"); },
        className: "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (filterTab === "features" ? "bg-amber-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
      }, "💡 طلبات الميزات (" + reports.filter(function(r) { return r.type === "feature_request"; }).length + ")"),
      React.createElement("button", {
        onClick: function() { setFilterTab("bugs"); },
        className: "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (filterTab === "bugs" ? "bg-rose-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
      }, "🚨 الأعطال (" + reports.filter(function(r) { return r.type !== "suggestion" && r.type !== "feature_request"; }).length + ")"),
      React.createElement("button", {
        onClick: function() { setFilterTab("suggestions"); },
        className: "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (filterTab === "suggestions" ? "bg-sky-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
      }, "📝 الاقتراحات العامة (" + reports.filter(function(r) { return r.type === "suggestion"; }).length + ")")
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
