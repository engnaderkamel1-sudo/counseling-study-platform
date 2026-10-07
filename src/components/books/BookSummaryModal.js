// مودال تحرير ملخص الكتاب المكتوب
window.BookSummaryModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var editSummaryContent = props.editSummaryContent;
  var setEditSummaryContent = props.setEditSummaryContent;
  var onSave = props.onSave;

  if (!isOpen) return null;

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: onClose
    },
    React.createElement(
      "div",
      {
        className: "bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col",
        onClick: function(e) { e.stopPropagation(); }
      },
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800" },
        React.createElement("h3", { className: "font-black text-base text-slate-800 dark:text-white flex items-center gap-2" }, "📖 تحرير ملخص الكتاب"),
        React.createElement("button", { type: "button", onClick: onClose, className: "text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg" }, "✕")
      ),
      React.createElement(
        "div",
        { className: "flex-1 overflow-y-auto space-y-2 text-xs" },
        React.createElement("label", { className: "block font-bold text-slate-600 dark:text-slate-300" }, "نص ملخص الكتاب الكامل (المقدمة، الفصول، الأفكار الجوهرية):"),
        React.createElement("textarea", {
          rows: 14,
          value: editSummaryContent,
          onChange: function(e) { setEditSummaryContent(e.target.value); },
          placeholder: "اكتب أو الصق ملخص الكتاب هنا...",
          className: "w-full p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-sans"
        })
      ),
      React.createElement(
        "div",
        { className: "flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0" },
        React.createElement("button", {
          type: "button",
          onClick: onClose,
          className: "px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        }, "إلغاء"),
        React.createElement("button", {
          type: "button",
          onClick: onSave,
          className: "px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95"
        }, "حفظ الملخص ✓")
      )
    )
  );
};
