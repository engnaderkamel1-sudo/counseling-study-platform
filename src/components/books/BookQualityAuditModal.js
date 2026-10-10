// نافذة فحص الجودة الشامل واعتماد نشر الكتاب للدارسين (Quality Gate Modal)
window.BookQualityAuditModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var book = props.book;
  var onPublishToggle = props.onPublishToggle;
  var onStartBatchExtract = props.onStartBatchExtract;
  var onStartBatchAudio = props.onStartBatchAudio;

  if (!isOpen || !book) return null;

  var utils = window.APP_UTILS || {};
  var audit = utils.auditBookQuality(book);
  var isPublished = (book.publishStatus === "published");

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in",
      onClick: onClose
    },
    React.createElement(
      "div",
      {
        className: "bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] sm:max-h-[88vh] flex flex-col",
        onClick: function(e) { e.stopPropagation(); }
      },
      // ترويسة نافذة الفحص
      React.createElement(
        "div",
        { className: "flex items-start justify-between border-b pb-3 border-slate-100 dark:border-slate-800 shrink-0 gap-3" },
        React.createElement("div", { className: "min-w-0" },
          React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
            React.createElement("h3", { className: "font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2" },
              "🛡️ فحص الجودة وبوابة النشر للدارسين"
            ),
            isPublished ? React.createElement("span", {
              className: "text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm flex items-center gap-1"
            }, "🌟 منشور للدارسين") : React.createElement("span", {
              className: "text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1"
            }, "🔒 مسودة قيد التجهيز (مخفي عن الدارسين)")
          ),
          React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1" },
            "كتاب: «" + book.title + "» • " + audit.totalChapters + " فصول • " + audit.totalPagesInBook + " صفحة إجمالية"
          )
        ),
        React.createElement("button", {
          type: "button",
          onClick: onClose,
          className: "w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center text-sm shrink-0"
        }, "✕")
      ),

      // عدادات الجودة ونسب الإنجاز
      React.createElement(
        "div",
        { className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0" },
        React.createElement("div", { className: "p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center" },
          React.createElement("span", { className: "text-[10px] text-slate-500 dark:text-slate-400 block" }, "نسبة استخراج الصفحات"),
          React.createElement("span", { className: "font-black text-sm sm:text-base " + (audit.overallPercent === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400") },
            audit.overallPercent + "%"
          ),
          React.createElement("span", { className: "text-[10px] text-slate-400 block" }, audit.totalExtractedPages + " من " + audit.totalPagesInBook + " صفحة")
        ),
        React.createElement("div", { className: "p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center" },
          React.createElement("span", { className: "text-[10px] text-slate-500 dark:text-slate-400 block" }, "اكتمال النصوص"),
          React.createElement("span", { className: "font-black text-sm sm:text-base " + (audit.completedCount === audit.totalChapters ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400") },
            audit.completedCount + " / " + audit.totalChapters
          ),
          React.createElement("span", { className: "text-[10px] text-slate-400 block" }, "فصول تامة 100%")
        ),
        React.createElement("div", { className: "p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center" },
          React.createElement("span", { className: "text-[10px] text-slate-500 dark:text-slate-400 block" }, "التسجيلات الصوتية"),
          React.createElement("span", { className: "font-black text-sm sm:text-base " + (audit.audioReadyCount === audit.totalChapters ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400") },
            audit.audioReadyCount + " / " + audit.totalChapters
          ),
          React.createElement("span", { className: "text-[10px] text-slate-400 block" }, "تراكات جاهزة")
        ),
        React.createElement("div", { className: "p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center" },
          React.createElement("span", { className: "text-[10px] text-slate-500 dark:text-slate-400 block" }, "جاهزية النشر"),
          React.createElement("span", { className: "font-black text-xs sm:text-sm " + (audit.isPublishable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400") },
            audit.isPublishable ? "مؤهل 100% ✓" : "ممنوع النشر ⛔"
          ),
          React.createElement("span", { className: "text-[10px] text-slate-400 block" }, audit.isPublishable ? "معتمد" : "يلزم استكمال")
        )
      ),

      // بطاقة التنبيه والقرار
      React.createElement(
        "div",
        {
          className: "p-3 sm:p-4 rounded-2xl shrink-0 " +
            (audit.isPublishable
              ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200")
        },
        audit.isPublishable ? React.createElement(
          "div",
          { className: "flex items-start gap-3" },
          React.createElement("span", { className: "text-2xl shrink-0" }, "🎉"),
          React.createElement("div", null,
            React.createElement("h4", { className: "font-black text-sm" }, "الكتاب اجتاز كافة معايير الجودة بنجاح تام!"),
            React.createElement("p", { className: "text-xs mt-0.5 leading-relaxed" },
              "كافة صفحات الكتاب تم استخراج نصوصها بالكامل، وحجم الكلمات طبيعي، وجميع الملفات الصوتية متوفرة. يمكنك اعتماده ونشره الآن ليكون متاحاً لجميع الدارسين."
            )
          )
        ) : React.createElement(
          "div",
          { className: "space-y-2" },
          React.createElement("div", { className: "flex items-start gap-2.5" },
            React.createElement("span", { className: "text-xl shrink-0" }, "⛔"),
            React.createElement("div", null,
              React.createElement("h4", { className: "font-black text-sm" }, "تم حظر النشر تلقائياً: الكتاب يحتوي على نواقص!"),
              React.createElement("p", { className: "text-xs mt-0.5 leading-relaxed" },
                "لحماية سمعة المنصة وجودة المادة للدارسين، يشترط النظام استكمال كافة نصوص وأصوات الفصول قبل السماح بالنشر."
              )
            )
          ),
          React.createElement("div", { className: "flex items-center gap-2 pt-1 flex-wrap" },
            audit.completedCount < audit.totalChapters && typeof onStartBatchExtract === "function" ? React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { onClose(); onStartBatchExtract(); },
                className: "px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95 transition-all flex items-center gap-1"
              },
              "📦 استكمال استخراج باقي الفصول الآن"
            ) : null,
            audit.audioReadyCount < audit.totalChapters && typeof onStartBatchAudio === "function" ? React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { onClose(); onStartBatchAudio(); },
                className: "px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs active:scale-95 transition-all flex items-center gap-1"
              },
              "🎙️ توليد التسجيلات الصوتية المتبقية"
            ) : null
          )
        )
      ),

      // قائمة الفصول التفصيلية مع حالة كل فصل
      React.createElement(
        "div",
        { className: "overflow-y-auto flex-1 space-y-2 pr-1" },
        audit.chaptersAudit.map(function(ch) {
          return React.createElement(
            "div",
            {
              key: ch.id,
              className: "p-3 rounded-2xl border transition-all " +
                (ch.isComplete && ch.hasAudio
                  ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                  : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60")
            },
            React.createElement(
              "div",
              { className: "flex items-center justify-between gap-2 flex-wrap" },
              React.createElement("div", { className: "flex items-center gap-2 min-w-0 flex-1" },
                React.createElement("span", {
                  className: "w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 " +
                    (ch.isComplete ? "bg-emerald-600 text-white" : "bg-amber-600 text-white")
                }, ch.index),
                React.createElement("h5", { className: "font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate" }, ch.title)
              ),
              React.createElement(
                "div",
                { className: "flex items-center gap-2 text-xs shrink-0" },
                ch.isComplete
                  ? React.createElement("span", { className: "text-emerald-600 dark:text-emerald-400 font-bold" }, "✅ نص كامل")
                  : React.createElement("span", { className: "text-rose-600 dark:text-rose-400 font-bold" }, "❌ " + ch.percent + "% فقط"),
                ch.hasAudio
                  ? React.createElement("span", { className: "text-emerald-600 dark:text-emerald-400 font-bold" }, "🎧 صوت جاهز")
                  : React.createElement("span", { className: "text-amber-600 dark:text-amber-400 font-bold" }, "⚠️ بلا صوت")
              )
            ),
            React.createElement(
              "div",
              { className: "flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap gap-1" },
              React.createElement("span", null, "صفحة " + ch.startPage + " إلى " + ch.endPage + " (" + ch.totalPages + " صفحة) • " + ch.textLen + " حرف"),
              React.createElement("span", { className: "font-mono" }, "المنجز: " + ch.pagesDone + " / " + ch.totalPages + " صفحة")
            ),
            // عرض المشكلات الخاصة بهذا الفصل إن وجدت
            ch.issues && ch.issues.length > 0 ? React.createElement(
              "div",
              { className: "mt-1.5 pt-1.5 border-t border-amber-200 dark:border-amber-900/40 text-[10px] text-amber-700 dark:text-amber-300 space-y-0.5" },
              ch.issues.map(function(iss, iIdx) {
                return React.createElement("div", { key: iIdx, className: "flex items-center gap-1 font-bold" },
                  React.createElement("span", null, "•"),
                  React.createElement("span", null, iss)
                );
              })
            ) : null
          );
        })
      ),

      // أزرار التحكم السفلية وقرار النشر
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2 shrink-0" },
        React.createElement("button", {
          type: "button",
          onClick: onClose,
          className: "w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 active:scale-95 transition-all"
        }, "إغلاق النافذة"),
        React.createElement(
          "div",
          { className: "w-full sm:w-auto flex items-center gap-2 justify-end" },
          isPublished ? React.createElement(
            "button",
            {
              type: "button",
              onClick: function() {
                if (window.confirm("هل تريد إلغاء نشر الكتاب وإعادته إلى مسودة؟ لن يظهر للدارسين حتى تعيد نشره.")) {
                  onPublishToggle("draft");
                  onClose();
                }
              },
              className: "w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            },
            "🔒 إلغاء النشر مؤقتاً (إخفاء عن الدارسين)"
          ) : React.createElement(
            "button",
            {
              type: "button",
              disabled: !audit.isPublishable,
              onClick: function() {
                if (audit.isPublishable) {
                  onPublishToggle("published");
                  onClose();
                }
              },
              className: "w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 " +
                (audit.isPublishable
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60"),
              title: audit.isPublishable ? "اعتماد ونشر الكتاب رسمياً للدارسين" : "لا يمكن النشر قبل استكمال كافة الفصول"
            },
            React.createElement("span", null, audit.isPublishable ? "🚀" : "🔒"),
            React.createElement("span", null, "اعتماد ونشر الكتاب للدارسين")
          )
        )
      )
    )
  );
};
