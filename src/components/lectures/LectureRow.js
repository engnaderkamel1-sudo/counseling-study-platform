// مكون سطر المحاضرة المدمج والخفيف لجدول المحاضرات
window.LectureRow = function(props) {
  var lec = props.lec;
  var seq = props.seq;
  var st = props.st;
  var isCurrent = props.isCurrent;
  var currentUser = props.currentUser || {};
  var utils = props.utils || window.APP_UTILS;
  var onSelect = props.onSelect;
  var onEdit = props.onEdit;
  var onDelete = props.onDelete;

  return React.createElement(
    "div",
    {
      onClick: function() { if (onSelect) onSelect(lec); },
      className: "group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs " +
        (isCurrent
          ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
          : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700")
    },
    // قسم اليمين: الترتيب + التاريخ + العنوان والمادة والمحاضر
    React.createElement(
      "div",
      { className: "flex items-center gap-3 min-w-0 flex-1" },
      // الشارة
      seq.isExam ? React.createElement(
        "span",
        { className: "px-2.5 py-1 rounded-xl text-xs font-black bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0 shadow-2xs flex items-center gap-1" },
        "📝 امتحان"
      ) : React.createElement(
        "span",
        { className: "w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black flex items-center justify-center shrink-0 shadow-2xs" },
        "#" + seq.num
      ),
      // تاريخ المحاضرة
      React.createElement(
        "span",
        { className: "text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0 hidden md:inline-block bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50" },
        lec.date || "قريباً"
      ),
      // العنوان والمحاضر
      React.createElement(
        "div",
        { className: "min-w-0 flex-1" },
        React.createElement(
          "div",
          { className: "flex items-center gap-2 flex-wrap" },
          React.createElement("span", { className: "text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate" }, lec.title),
          lec.subject && React.createElement("span", { className: "text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 shrink-0" }, lec.subject),
          (lec.sessionOrder && lec.sessionOrder > 1) && React.createElement("span", { className: "text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md shrink-0" }, "جلسة " + lec.sessionOrder)
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap" },
          React.createElement("span", null, lec.speaker),
          React.createElement("span", { className: "md:hidden" }, "• " + (lec.date || "")),
          (lec.lastPosition > 0) && React.createElement("span", { className: "text-[10px] text-emerald-600 dark:text-emerald-400 font-medium" }, "• التوقف: " + utils.formatDuration(lec.lastPosition))
        )
      )
    ),
    // قسم اليسار: مؤشرات المحتوى + شارة الحالة + أزرار الإجراءات
    React.createElement(
      "div",
      { className: "flex items-center justify-between sm:justify-end gap-2.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800/80" },
      // الأيقونات والمؤشرات
      React.createElement(
        "div",
        { className: "flex items-center gap-1.5 text-[11px]" },
        lec.zoomUrl && React.createElement(
          "a",
          {
            href: lec.zoomUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            onClick: function(e) { e.stopPropagation(); },
            title: "انضم إلى زوم مباشرة: " + (lec.meetingId ? "ID: " + lec.meetingId : ""),
            className: "px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1 shadow-xs hover:shadow-sm active:scale-95 transition-all animate-pulse"
          },
          React.createElement("span", null, "🎥"),
          React.createElement("span", { className: "hidden xs:inline" }, "دخول زوم")
        ),
        lec.mediaUrl && React.createElement("span", { title: "فيديو متاح", className: "px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800/50" }, "فيديو"),
        ((Array.isArray(lec.handouts) && lec.handouts.length > 0) || lec.handoutUrl) && (function() {
          var count = Array.isArray(lec.handouts) && lec.handouts.length > 0 ? lec.handouts.length : 1;
          return React.createElement(
            "span",
            {
              title: count + " ملف متاح للمحاضرة",
              className: "px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800/50"
            },
            count + " ملف"
          );
        })(),
        (lec.audioSummaryUrl || lec.writtenSummary) && React.createElement("span", { title: "ملخص متاح", className: "px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800/50" }, "ملخص")
      ),
      // شارة الحالة
      React.createElement("span", { className: "text-[11px] font-bold px-2.5 py-0.5 rounded-md shrink-0 " + st.badgeClass }, st.label),
      // أزرار المسؤول (تعديل وحذف)
      currentUser.role === "admin" && React.createElement(
        "div",
        { className: "flex items-center gap-1" },
        lec.zoomUrl && React.createElement(
          "button",
          {
            type: "button",
            onClick: function(e) {
              e.stopPropagation();
              if (props.onClearZoom) props.onClearZoom(lec);
            },
            title: "إلغاء ومسح رابط الزوم لهذه المحاضرة",
            className: "p-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-600 hover:bg-rose-100 transition-colors"
          },
          "🚫"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function(e) {
              e.stopPropagation();
              if (onEdit) onEdit(lec);
            },
            title: "تعديل بيانات المحاضرة أو الروابط",
            className: "p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs transition-colors"
          },
          "✏️"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function(e) {
              e.stopPropagation();
              if (onDelete) onDelete(lec);
            },
            title: "نقل إلى المحذوفات",
            className: "p-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-600 hover:bg-rose-100 transition-colors"
          },
          "🗑️"
        )
      ),
      // مؤشر الفتح والتنقل (Chevron ناعم يعبر عن إمكانية فتح السطر)
      React.createElement(
        "span",
        {
          className: "hidden sm:flex w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 items-center justify-center text-xs font-black transition-all shrink-0"
        },
        "◀"
      )
    )
  );
};
