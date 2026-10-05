// نافذة ومكون تنصيب التطبيق وتفعيل الإشعارات
window.InstallPromptModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var deferredPrompt = props.deferredPrompt;
  var onInstalled = props.onInstalled;

  if (!isOpen) return null;

  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  var handleInstallClick = async function() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      var choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        if (onInstalled) onInstalled();
      }
      onClose();
    }
  };

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    },
    React.createElement(
      "div",
      {
        className: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-right font-cairo"
      },
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3" },
        React.createElement(
          "div",
          { className: "flex items-center gap-2" },
          React.createElement("span", { className: "text-2xl" }, "📲"),
          React.createElement("h3", { className: "text-lg font-bold text-slate-900 dark:text-white" }, "تثبيت تطبيق المشورة")
        ),
        React.createElement(
          "button",
          {
            onClick: onClose,
            className: "w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center text-sm font-bold"
          },
          "✕"
        )
      ),

      React.createElement(
        "div",
        { className: "text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3" },
        React.createElement(
          "p",
          null,
          "يمكنك تثبيت المنصة كتطبيق أصيل على هاتفك أو حاسوبك للوصول السريع، وتشغيل المحاضرات وقراءة المراجع دون الحاجة لفتح المتصفح في كل مرة."
        ),

        isIOS ? React.createElement(
          "div",
          { className: "p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 space-y-2 text-xs" },
          React.createElement("div", { className: "font-bold text-sm" }, "خطوات التثبيت على هواتف آبل (iPhone / iPad):"),
          React.createElement("div", null, "1. اضغط على زر المشاركة (Share) أسفل متصفح سفاري ⎋."),
          React.createElement("div", null, "2. اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen) ➕."),
          React.createElement("div", null, "3. اضغط «إضافة» (Add) في الزاوية العلوية.")
        ) : React.createElement(
          "div",
          { className: "p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs text-slate-700 dark:text-slate-300" },
          React.createElement("div", { className: "font-bold text-sm text-slate-900 dark:text-white" }, "مميزات تثبيت التطبيق:"),
          React.createElement("div", null, "• فتح المنصة بلمسة واحدة كأي تطبيق هاتف رسمي."),
          React.createElement("div", null, "• استقبال إشعارات فورية عند نزول أي محاضرة جديدة."),
          React.createElement("div", null, "• شاشة كاملة وتجربة تصفح سريعة ومريحة.")
        )
      ),

      React.createElement(
        "div",
        { className: "flex items-center gap-3 pt-2" },
        deferredPrompt ? React.createElement(
          "button",
          {
            onClick: handleInstallClick,
            className: "flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all text-center"
          },
          "تثبيت التطبيق الآن 📲"
        ) : null,
        React.createElement(
          "button",
          {
            onClick: onClose,
            className: "flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition-all text-center"
          },
          "تم، فهمت ذلك"
        )
      )
    )
  );
};
