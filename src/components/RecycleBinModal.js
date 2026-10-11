// نافذة سلة المحذوفات والأرشيف المؤقت مع استرجاع وحذف تلقائي بعد 7 أيام
window.RecycleBinModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var cloud = window.CloudSyncService;
  var utils = window.APP_UTILS;

  var [items, setItems] = React.useState(function() {
    return utils ? utils.getLocal("counsel_recycle_bin", []) : [];
  });
  var [filterTab, setFilterTab] = React.useState("all"); // "all" | "book" | "lecture"
  var [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(function() {
    if (!isOpen || !cloud) return;
    var unsub = cloud.subscribeRecycleBin(function(list) {
      setItems(list || []);
      if (utils) utils.setLocal("counsel_recycle_bin", list || []);
    });
    return function() {
      if (typeof unsub === "function") unsub();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  var filteredItems = items.filter(function(item) {
    if (filterTab === "all") return true;
    return item.originalType === filterTab;
  });

  var booksCount = items.filter(function(i) { return i.originalType === "book"; }).length;
  var lecturesCount = items.filter(function(i) { return i.originalType === "lecture"; }).length;

  var getRemainingDays = function(deletedAt) {
    if (!deletedAt) return 7;
    var diffMs = (7 * 24 * 60 * 60 * 1000) - (Date.now() - deletedAt);
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  };

  var handleRestore = async function(item) {
    if (!window.confirm("هل ترغب في استرجاع «" + (item.title || "هذا العنصر") + "» إلى مكانه الأصلي؟")) return;
    setActionLoading(true);
    try {
      await cloud.restoreFromRecycleBin(item);
      alert("✅ تم استرجاع «" + item.title + "» بنجاح!");
    } catch (err) {
      alert("حدث خطأ أثناء الاسترجاع: " + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  var handlePermanentDelete = async function(item) {
    if (!window.confirm("⚠️ تحذير: هل أنت متأكد من الحذف النهائي لـ «" + (item.title || "هذا العنصر") + "»؟\nلا يمكن التراجع عن هذا الإجراء وسيتم حذفه من السيرفر نهائياً.")) return;
    setActionLoading(true);
    try {
      await cloud.permanentDeleteFromRecycleBin(item.id);
    } catch (err) {
      alert("حدث خطأ أثناء الحذف: " + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  var handleEmptyAll = async function() {
    if (!window.confirm("⚠️ تحذير نهائي:\nهل أنت متأكد من رغبتك في تفريغ سلة المحذوفات بالكامل وحذف جميع العناصر نهائياً؟")) return;
    setActionLoading(true);
    try {
      await cloud.emptyRecycleBin();
      alert("🧹 تم تفريغ سلة المحذوفات بالكامل.");
    } catch (err) {
      alert("حدث خطأ أثناء التفريغ: " + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in" },
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" },

      // الترويسة
      React.createElement(
        "div",
        { className: "p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/30" },
        React.createElement(
          "div",
          { className: "flex items-center gap-2.5" },
          React.createElement("span", { className: "text-2xl p-2 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400" }, "🗑️"),
          React.createElement(
            "div",
            null,
            React.createElement("h3", { className: "text-base sm:text-lg font-bold text-slate-900 dark:text-white" }, "سلة المحذوفات والأرشيف المؤقت"),
            React.createElement("p", { className: "text-xs text-slate-500 mt-0.5" }, "تحفظ العناصر لمدة 7 أيام مع إمكانية استرجاعها بضغطة زر واحدة")
          )
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-sm font-bold transition-all"
          },
          "✕"
        )
      ),

      // شريط التصفية السريع
      React.createElement(
        "div",
        { className: "px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap bg-white dark:bg-slate-900" },
        React.createElement(
          "div",
          { className: "flex items-center gap-1.5" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setFilterTab("all"); },
              className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " +
                (filterTab === "all"
                  ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
            },
            "الكل (" + items.length + ")"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setFilterTab("book"); },
              className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " +
                (filterTab === "book"
                  ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
            },
            "📚 الكتب (" + booksCount + ")"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setFilterTab("lecture"); },
              className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " +
                (filterTab === "lecture"
                  ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200")
            },
            "🎙️ المحاضرات (" + lecturesCount + ")"
          )
        ),
        items.length > 0 && React.createElement(
          "button",
          {
            type: "button",
            onClick: handleEmptyAll,
            disabled: actionLoading,
            className: "text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
          },
          React.createElement("span", null, "🧹"),
          React.createElement("span", null, "تفريغ السلة")
        )
      ),

      // قائمة العناصر المحذوفة
      React.createElement(
        "div",
        { className: "p-4 sm:p-5 flex-1 overflow-y-auto space-y-3" },
        filteredItems.length === 0 ? React.createElement(
          "div",
          { className: "py-12 text-center text-slate-400 space-y-2" },
          React.createElement("div", { className: "text-4xl" }, "🌿"),
          React.createElement("p", { className: "font-bold text-sm text-slate-700 dark:text-slate-300" }, "سلة المحذوفات فارغة تماماً"),
          React.createElement("p", { className: "text-xs text-slate-400" }, "أي كتاب أو محاضرة تقوم بحذفها مستقبلاً ستظهر هنا لمدة أسبوع قبل حذفها نهائياً.")
        ) : filteredItems.map(function(item) {
          var isBook = item.originalType === "book";
          var daysLeft = getRemainingDays(item.deletedAt);
          var dateStr = "";
          if (item.deletedAt) {
            try {
              dateStr = new Date(item.deletedAt).toLocaleDateString("ar-EG", {
                year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
              });
            } catch (e) {}
          }

          return React.createElement(
            "div",
            {
              key: item.id,
              className: "p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            },
            React.createElement(
              "div",
              { className: "flex items-start gap-3 min-w-0" },
              React.createElement(
                "span",
                { className: "text-2xl shrink-0 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs" },
                isBook ? "📕" : "🎙️"
              ),
              React.createElement(
                "div",
                { className: "min-w-0" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2 flex-wrap" },
                  React.createElement("h4", { className: "font-bold text-sm text-slate-900 dark:text-white truncate" }, item.title),
                  React.createElement(
                    "span",
                    {
                      className: "text-[10px] px-2 py-0.5 rounded-full font-bold " +
                        (daysLeft <= 2
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300")
                    },
                    "⏳ متبقي " + daysLeft + " أيام"
                  )
                ),
                React.createElement(
                  "div",
                  { className: "text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap" },
                  item.author ? React.createElement("span", null, (isBook ? "المؤلف: " : "المحاضر: ") + item.author) : null,
                  dateStr ? React.createElement("span", null, "• حُذف في: " + dateStr) : null,
                  item.deletedBy ? React.createElement("span", null, "• بواسطة: " + item.deletedBy) : null
                )
              )
            ),

            // أزرار التحكم: استرجاع أو حذف نهائي
            React.createElement(
              "div",
              { className: "flex items-center gap-2 shrink-0 self-end sm:self-auto" },
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { handleRestore(item); },
                  disabled: actionLoading,
                  title: "استرجاع إلى مكانه الأصلي",
                  className: "px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1 disabled:opacity-50"
                },
                React.createElement("span", null, "🔄"),
                React.createElement("span", null, "استرجاع")
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { handlePermanentDelete(item); },
                  disabled: actionLoading,
                  title: "حذف نهائي بدون انتظار الأسبوع",
                  className: "px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                },
                React.createElement("span", null, "❌"),
                React.createElement("span", null, "نهائي")
              )
            )
          );
        })
      ),

      // الفوتر
      React.createElement(
        "div",
        { className: "p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between text-xs text-slate-500" },
        React.createElement("span", null, "💡 تذكير: العناصر تُحذف تلقائياً فور مرور 7 أيام لتوفير الذاكرة."),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-all"
          },
          "إغلاق"
        )
      )
    )
  );
};
