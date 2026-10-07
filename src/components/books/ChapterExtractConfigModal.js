// نافذة تأكيد وضبط نطاق استخراج نص الفصل بالـ AI مع استثناء الصفحات
window.ChapterExtractConfigModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var chap = props.chap;
  var onConfirm = props.onConfirm;
  var totalPages = props.totalPages || 500;

  if (!isOpen || !chap) return null;

  var [startPage, setStartPage] = React.useState(chap.startPage || 1);
  var [endPage, setEndPage] = React.useState(chap.endPage || chap.startPage || 1);
  var [excludePagesStr, setExcludePagesStr] = React.useState(chap.excludePages || "");
  var [cleanHeadersFooters, setCleanHeadersFooters] = React.useState(true);

  React.useEffect(function() {
    if (chap) {
      setStartPage(chap.startPage || 1);
      setEndPage(chap.endPage || chap.startPage || 1);
      setExcludePagesStr(chap.excludePages || "");
    }
  }, [chap]);

  var handleSubmit = function(e) {
    e.preventDefault();
    var s = Math.max(1, parseInt(startPage) || 1);
    var endVal = Math.max(s, parseInt(endPage) || s);
    onConfirm({
      chapterId: chap.id,
      startPage: s,
      endPage: endVal,
      excludePagesStr: excludePagesStr.trim(),
      cleanHeadersFooters: cleanHeadersFooters
    });
  };

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: onClose
    },
    React.createElement(
      "form",
      {
        onSubmit: handleSubmit,
        className: "bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-scale-up",
        onClick: function(e) { e.stopPropagation(); }
      },
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800" },
        React.createElement("div", null,
          React.createElement("h3", { className: "font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2" },
            "⚡ استخراج نص الفصل بالذكاء الاصطناعي"
          ),
          React.createElement("p", { className: "text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5 truncate max-w-xs" },
            chap.title
          )
        ),
        React.createElement("button", { type: "button", onClick: onClose, className: "text-slate-400 hover:text-slate-600 text-lg" }, "✕")
      ),

      // نطاق الصفحات
      React.createElement(
        "div",
        { className: "grid grid-cols-2 gap-3" },
        React.createElement(
          "div",
          { className: "space-y-1" },
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "من صفحة PDF:"),
          React.createElement("input", {
            type: "number",
            min: 1,
            max: totalPages,
            required: true,
            value: startPage,
            onChange: function(e) { setStartPage(e.target.value); },
            className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
          })
        ),
        React.createElement(
          "div",
          { className: "space-y-1" },
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "إلى صفحة PDF:"),
          React.createElement("input", {
            type: "number",
            min: 1,
            max: totalPages,
            required: true,
            value: endPage,
            onChange: function(e) { setEndPage(e.target.value); },
            className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
          })
        )
      ),

      // حقل استثناء الصفحات
      React.createElement(
        "div",
        { className: "space-y-1.5 p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50" },
        React.createElement("label", { className: "block text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center justify-between" },
          React.createElement("span", null, "🚫 صفحات للاستثناء والتخطي (Exclude):"),
          React.createElement("span", { className: "text-[10px] font-normal text-amber-700 dark:text-amber-400" }, "اختياري")
        ),
        React.createElement("input", {
          type: "text",
          value: excludePagesStr,
          onChange: function(e) { setExcludePagesStr(e.target.value); },
          placeholder: "مثال: 1, 2, 6, 7 (أو نطاق: 1-3, 6)",
          className: "w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400"
        }),
        React.createElement("p", { className: "text-[11px] text-amber-800 dark:text-amber-300/80 leading-relaxed" },
          "💡 مفيد جداً للمقدمة: اكتب أرقام صفحات الغلاف الداخلي أو الفهرس أو الإهداء ليتم تخطيها ولا تُحسب في النص المستخرج."
        )
      ),

      // خيار تنقية الترويسة وأرقام الصفحات
      React.createElement(
        "label",
        { className: "flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs" },
        React.createElement("input", {
          type: "checkbox",
          checked: cleanHeadersFooters,
          onChange: function(e) { setCleanHeadersFooters(e.target.checked); },
          className: "rounded text-blue-600 focus:ring-blue-500 mt-0.5"
        }),
        React.createElement("div", null,
          React.createElement("span", { className: "font-bold text-slate-900 dark:text-white block" }, "✨ تنقية ذكية للهوامش (Header / Footer / Page Numbers)"),
          React.createElement("span", { className: "text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5" }, "حذف العناوين العلوية المكررة في كل صفحة وأرقام الصفحات السفلية ليخرج النص سردياً نقياً 100% للصوت.")
        )
      ),

      // أزرار التحكم
      React.createElement(
        "div",
        { className: "flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" },
        React.createElement("button", {
          type: "button",
          onClick: onClose,
          className: "px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
        }, "إلغاء"),
        React.createElement("button", {
          type: "submit",
          className: "px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 active:scale-95 transition-all flex items-center gap-1.5"
        },
        React.createElement("span", null, "⚡"),
        React.createElement("span", null, "بدء استخراج النص بالـ AI")
        )
      )
    )
  );
};
