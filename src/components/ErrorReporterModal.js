// زر ونافذة الإبلاغ الفوري عن أي مشكلة برمجية أو خطأ
window.ErrorReporterModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var currentUser = props.currentUser;
  var activeTab = props.activeTab;

  var [userDescription, setUserDescription] = React.useState("");
  var [capturedErrorCode, setCapturedErrorCode] = React.useState("");
  var [isSending, setIsSending] = React.useState(false);
  var [successNotice, setSuccessNotice] = React.useState(false);

  React.useEffect(function() {
    if (isOpen) {
      var last = window.ErrorReportService.lastError;
      if (last) {
        setCapturedErrorCode(
          "الرسالة: " + last.message + "\n" +
          "الملف: " + (last.source || "غير محدد") + " (سطر: " + (last.line || "-") + ")\n" +
          "التتبع: " + (last.stack || "")
        );
      } else {
        setCapturedErrorCode("لم يتم تسجيل انهيار تلقائي؛ تم فتح التقرير يدوياً من الشاشة: " + activeTab);
      }
      setUserDescription("");
      setSuccessNotice(false);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  var handleSubmit = async function(e) {
    e.preventDefault();
    setIsSending(true);

    try {
      await window.ErrorReportService.sendReport({
        page: activeTab,
        userDescription: userDescription.trim() || "لم يكتب المستخدم وصفاً",
        errorDetails: capturedErrorCode,
        senderName: currentUser.fullName || "دارس غير مسجل",
        senderPhone: currentUser.phone || "-",
        senderEmail: currentUser.email || "-",
        deviceInfo: navigator.userAgent
      });
      setSuccessNotice(true);
      setTimeout(function() {
        onClose();
      }, 2000);
    } catch (err) {
      alert("خطأ أثناء إرسال التقرير: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" },
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" },

      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b pb-3" },
        React.createElement("div", null,
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white flex items-center gap-2" },
            React.createElement("span", null, "🚨"),
            "إبلاغ عن عطل أو مشكلة بالصفحة"
          ),
          React.createElement("p", { className: "text-xs text-slate-400 mt-0.5" }, "سيتم إرسال كود الخطأ وتفاصيله مباشرة للأدمن لمراجعته وإصلاحه")
        ),
        React.createElement("button", { onClick: onClose, className: "text-slate-400" }, "✕")
      ),

      successNotice ? React.createElement(
        "div",
        { className: "p-6 text-center space-y-2" },
        React.createElement("div", { className: "text-3xl" }, "✅"),
        React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, "تم إرسال تقرير الخطأ بنجاح!"),
        React.createElement("p", { className: "text-xs text-slate-500" }, "شكراً لك. سيقوم الأدمن بمراجعة الكود وحل المشكلة فوراً.")
      ) : React.createElement(
        "form",
        { onSubmit: handleSubmit, className: "space-y-3" },

        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "صفحة المشكلة الحالية"),
          React.createElement("input", {
            type: "text",
            disabled: true,
            value: "قسم: " + activeTab,
            className: "w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300"
          })
        ),

        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "ماذا حدث معك؟ (وصف المشكلة)"),
          React.createElement("textarea", {
            rows: 3,
            required: true,
            value: userDescription,
            onChange: function(e) { setUserDescription(e.target.value); },
            placeholder: "مثال: الصفحة علقت عند تشغيل الصوت، أو الزر لا يستجيب...",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
          })
        ),

        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-semibold text-slate-500 mb-1" }, "كود وتتبع الخطأ التقني (المحفوظ تلقائياً)"),
          React.createElement("textarea", {
            rows: 4,
            disabled: true,
            value: capturedErrorCode,
            className: "w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800/80 font-mono text-[11px] text-rose-600 dark:text-rose-400"
          })
        ),

        React.createElement(
          "div",
          { className: "flex justify-end gap-2 pt-2" },
          React.createElement("button", { type: "button", onClick: onClose, className: "px-4 py-2 text-xs" }, "إلغاء"),
          React.createElement("button", {
            type: "submit",
            disabled: isSending,
            className: "px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5"
          }, isSending ? "جاري الإرسال..." : "إرسال التقرير للأدمن")
        )
      )
    )
  );
};
