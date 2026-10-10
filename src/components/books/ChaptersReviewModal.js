// نافذة مراجعة واعتماد الفهرس المستخرج بالذكاء الاصطناعي مع إمكانية التعديل والإزاحة الموحدة
window.ChaptersReviewModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var initialChapters = props.initialChapters || [];
  var onConfirm = props.onConfirm;
  var handlePageChange = props.handlePageChange;
  var totalPages = props.totalPages || 500;

  var [chapters, setChapters] = React.useState([]);

  React.useEffect(function() {
    if (isOpen && initialChapters && initialChapters.length > 0) {
      // نسخ عميق للفصول لتعديلها بحرية دون التأثير على الأصل
      setChapters(initialChapters.map(function(c, idx) {
        return {
          id: c.id || ("chap_rev_" + Date.now() + "_" + idx),
          title: c.title || "",
          startPage: Number(c.startPage) || 1,
          endPage: Number(c.endPage) || (Number(c.startPage) || 1)
        };
      }));
    }
  }, [isOpen, initialChapters]);

  if (!isOpen) return null;

  var handleChapterChange = function(index, field, value) {
    setChapters(function(prev) {
      var next = prev.slice();
      var item = Object.assign({}, next[index]);
      if (field === "startPage" || field === "endPage") {
        item[field] = Math.max(1, parseInt(value, 10) || 1);
      } else {
        item[field] = value;
      }
      next[index] = item;
      return next;
    });
  };

  var handleDeleteChapter = function(index) {
    setChapters(function(prev) {
      return prev.filter(function(_, idx) { return idx !== index; });
    });
  };

  var handleAddChapter = function() {
    setChapters(function(prev) {
      var last = prev[prev.length - 1];
      var newStart = last ? (last.endPage + 1) : 1;
      return prev.concat([{
        id: "chap_rev_" + Date.now() + "_" + prev.length,
        title: "فصل جديد",
        startPage: newStart,
        endPage: Math.min(newStart + 15, totalPages)
      }]);
    });
  };

  // تطبيق إزاحة موحدة على كافة الفصول دفعة واحدة (Bulk Offset Shift)
  var handleApplyOffset = function(shiftAmount) {
    if (!shiftAmount || isNaN(shiftAmount)) return;
    setChapters(function(prev) {
      return prev.map(function(c) {
        var newStart = Math.max(1, c.startPage + shiftAmount);
        var newEnd = Math.max(newStart, c.endPage + shiftAmount);
        return Object.assign({}, c, {
          startPage: newStart,
          endPage: newEnd
        });
      });
    });
  };

  var handleSaveConfirm = function() {
    if (chapters.length === 0) {
      alert("يرجى إضافة فصل واحد على الأقل قبل الحفظ.");
      return;
    }
    // التحقق من صحة الصفحات
    for (var i = 0; i < chapters.length; i++) {
      var ch = chapters[i];
      if (!ch.title.trim()) {
        alert("يرجى كتابة عنوان للفصل رقم " + (i + 1));
        return;
      }
      if (ch.endPage < ch.startPage) {
        alert("صفحة النهاية يجب أن تكون أكبر من أو تساوي صفحة البداية في: " + ch.title);
        return;
      }
    }
    if (onConfirm) {
      onConfirm(chapters);
    }
  };

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in",
      onClick: onClose
    },
    React.createElement(
      "div",
      {
        className: "bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] sm:max-h-[88vh] flex flex-col",
        onClick: function(e) { e.stopPropagation(); }
      },
      // ترويسة النافذة
      React.createElement(
        "div",
        { className: "flex items-start justify-between border-b pb-3 border-slate-100 dark:border-slate-800 shrink-0 gap-3" },
        React.createElement("div", { className: "min-w-0" },
          React.createElement("h3", { className: "font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2" },
            "📋 مراجعة واعتماد فهرس الكتاب بالذكاء الاصطناعي",
            React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" },
              chapters.length + " فصول"
            )
          ),
          React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1" },
            "استخرج الذكاء الاصطناعي الفصول التالية من الفهرس. راجع أسماء الفصول وأرقام الصفحات ويمكنك تعديلها وتطبيق إزاحة سريعة قبل الاعتماد."
          )
        ),
        React.createElement("button", {
          type: "button",
          onClick: onClose,
          className: "w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center text-sm shrink-0"
        }, "✕")
      ),

      // شريط الإزاحة الموحدة السريعة (Bulk Offset Shift)
      React.createElement(
        "div",
        { className: "p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0" },
        React.createElement("div", { className: "text-xs text-indigo-900 dark:text-indigo-200" },
          React.createElement("span", { className: "font-bold block" }, "⚡ إزاحة موحدة للصفحات (Offset Shift):"),
          React.createElement("span", { className: "text-[11px] text-indigo-700 dark:text-indigo-300" },
            "لو كان الفهرس المطبوع متأخراً أو متقدماً عن صفحات الـ PDF، اضغط لترحيل كل الفصول بضغطة واحدة:"
          )
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-1.5 flex-wrap self-end sm:self-auto shrink-0" },
          React.createElement("button", {
            type: "button",
            onClick: function() { handleApplyOffset(-2); },
            className: "px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all",
            title: "طرح صفحتين من كافة الفصول"
          }, "-2 صفحة"),
          React.createElement("button", {
            type: "button",
            onClick: function() { handleApplyOffset(-1); },
            className: "px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all",
            title: "طرح صفحة واحدة من كافة الفصول"
          }, "-1 صفحة"),
          React.createElement("button", {
            type: "button",
            onClick: function() { handleApplyOffset(1); },
            className: "px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all",
            title: "إضافة صفحة واحدة لكافة الفصول"
          }, "+1 صفحة"),
          React.createElement("button", {
            type: "button",
            onClick: function() { handleApplyOffset(2); },
            className: "px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all",
            title: "إضافة صفحتين لكافة الفصول"
          }, "+2 صفحة")
        )
      ),

      // قائمة الفصول التفاعلية للتعديل والمراجعة (قابلة للتمرير على الموبايل)
      React.createElement(
        "div",
        { className: "overflow-y-auto flex-1 space-y-2.5 pr-1" },
        chapters.map(function(ch, idx) {
          var pageCount = Math.max(1, ch.endPage - ch.startPage + 1);
          return React.createElement(
            "div",
            {
              key: ch.id || idx,
              className: "p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-blue-400 transition-all"
            },
            // الرقم والعنوان
            React.createElement(
              "div",
              { className: "flex items-center gap-2.5 w-full sm:flex-1 min-w-0" },
              React.createElement("span", {
                className: "w-7 h-7 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0"
              }, idx + 1),
              React.createElement("input", {
                type: "text",
                value: ch.title,
                onChange: function(e) { handleChapterChange(idx, "title", e.target.value); },
                placeholder: "اسم الفصل أو الجزء...",
                className: "flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              })
            ),
            // أرقام الصفحات والمعاينة والحذف
            React.createElement(
              "div",
              { className: "flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0" },
              React.createElement(
                "div",
                { className: "flex items-center gap-1.5 text-xs font-bold" },
                React.createElement("span", { className: "text-slate-500 text-[11px]" }, "من:"),
                React.createElement("input", {
                  type: "number",
                  min: 1,
                  max: totalPages,
                  value: ch.startPage,
                  onChange: function(e) { handleChapterChange(idx, "startPage", e.target.value); },
                  className: "w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center text-xs font-bold focus:ring-2 focus:ring-blue-500"
                }),
                React.createElement("span", { className: "text-slate-500 text-[11px]" }, "إلى:"),
                React.createElement("input", {
                  type: "number",
                  min: 1,
                  max: totalPages,
                  value: ch.endPage,
                  onChange: function(e) { handleChapterChange(idx, "endPage", e.target.value); },
                  className: "w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center text-xs font-bold focus:ring-2 focus:ring-blue-500"
                }),
                React.createElement("span", { className: "text-[10px] text-slate-400 font-mono hidden sm:inline" },
                  "(" + pageCount + " ص)"
                )
              ),
              React.createElement(
                "div",
                { className: "flex items-center gap-1" },
                handlePageChange ? React.createElement("button", {
                  type: "button",
                  onClick: function() { handlePageChange(ch.startPage); },
                  className: "p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-xs font-bold transition-all",
                  title: "معاينة صفحة البداية في قارئ الـ PDF"
                }, "👁️") : null,
                React.createElement("button", {
                  type: "button",
                  onClick: function() { handleDeleteChapter(idx); },
                  className: "p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 text-xs font-bold transition-all",
                  title: "حذف هذا الفصل"
                }, "🗑️")
              )
            )
          );
        })
      ),

      // أزرار التحكم السفلية
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2 shrink-0" },
        React.createElement("button", {
          type: "button",
          onClick: handleAddChapter,
          className: "w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        }, "+ إضافة فصل يدوي"),
        React.createElement(
          "div",
          { className: "flex items-center gap-2 w-full sm:w-auto justify-end" },
          React.createElement("button", {
            type: "button",
            onClick: onClose,
            className: "w-1/2 sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 active:scale-95 transition-all"
          }, "إلغاء"),
          React.createElement("button", {
            type: "button",
            onClick: handleSaveConfirm,
            className: "w-1/2 sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          }, "✓ اعتماد وحفظ الفهرس")
        )
      )
    )
  );
};
