// مودال عرض النص المفرغ للفصل مع التحكم بحجم الخط للقراءة المريحة على الموبايل
window.ChapterTextViewerModal = function(props) {
  var viewingChapterText = props.viewingChapterText;
  var onClose = props.onClose;
  var fontSize = props.fontSize || 15;
  var onFontSizeChange = props.onFontSizeChange;

  if (!viewingChapterText) return null;

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: onClose
    },
    React.createElement(
      "div",
      {
        className: "bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] flex flex-col",
        onClick: function(e) { e.stopPropagation(); }
      },
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800 shrink-0" },
        React.createElement("h3", { className: "font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2 truncate" },
          "📄 " + viewingChapterText.title
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2 shrink-0" },
          // أزرار تكبير وتصغير حجم خط القراءة على الموبايل
          React.createElement(
            "div",
            { className: "flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-bold" },
            React.createElement("button", {
              type: "button",
              onClick: function() { if (onFontSizeChange) onFontSizeChange(Math.max(13, fontSize - 1)); },
              title: "تصغير الخط",
              className: "w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 active:scale-90 transition-all text-slate-600 dark:text-slate-300"
            }, "A-"),
            React.createElement("span", { className: "px-1.5 font-mono text-[11px] text-slate-400" }, fontSize + "px"),
            React.createElement("button", {
              type: "button",
              onClick: function() { if (onFontSizeChange) onFontSizeChange(Math.min(22, fontSize + 1)); },
              title: "تكبير الخط",
              className: "w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 active:scale-90 transition-all text-slate-600 dark:text-slate-300"
            }, "A+")
          ),
          React.createElement("button", {
            type: "button",
            onClick: onClose,
            className: "w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center text-sm"
          }, "✕")
        )
      ),
      React.createElement(
        "div",
        {
          className: "overflow-y-auto flex-1 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-loose font-sans whitespace-pre-wrap select-text selection:bg-blue-600 selection:text-white",
          style: { fontSize: fontSize + "px" }
        },
        viewingChapterText.text
      ),
      React.createElement(
        "div",
        { className: "flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0" },
        React.createElement("button", {
          type: "button",
          onClick: function() {
            navigator.clipboard.writeText(viewingChapterText.text);
            alert("تم نسخ نص الفصل بالكامل ✓");
          },
          className: "px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center gap-1.5"
        }, "📋 نسخ النص كاملاً"),
        React.createElement("button", {
          type: "button",
          onClick: onClose,
          className: "px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95"
        }, "إغلاق")
      )
    )
  );
};
