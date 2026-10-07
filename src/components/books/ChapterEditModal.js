// مودال إضافة أو تعديل الفصل الصوتي والنص المفرغ مع تحديد الموضع والترتيب
window.ChapterEditModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var editingChapter = props.editingChapter;
  var existingChapters = props.existingChapters || [];
  var chapTitle = props.chapTitle;
  var setChapTitle = props.setChapTitle;
  var chapStartPage = props.chapStartPage;
  var setChapStartPage = props.setChapStartPage;
  var chapEndPage = props.chapEndPage;
  var setChapEndPage = props.setChapEndPage;
  var chapInsertPos = props.chapInsertPos;
  var setChapInsertPos = props.setChapInsertPos;
  var chapAudioUrl = props.chapAudioUrl;
  var setChapAudioUrl = props.setChapAudioUrl;
  var setChapAudioFile = props.setChapAudioFile;
  var chapText = props.chapText;
  var setChapText = props.setChapText;
  var handleChapterTextFileChange = props.handleChapterTextFileChange;
  var isSavingChapter = props.isSavingChapter;
  var chapterSaveStatus = props.chapterSaveStatus;
  var onSubmit = props.onSubmit;

  if (!isOpen) return null;

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: function() { if (!isSavingChapter) onClose(); }
    },
    React.createElement(
      "form",
      {
        onSubmit: onSubmit,
        className: "bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto",
        onClick: function(e) { e.stopPropagation(); }
      },
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800" },
        React.createElement("h3", { className: "font-black text-base text-slate-900 dark:text-white flex items-center gap-2" },
          editingChapter ? "✏️ تعديل بيانات الفصل وصفحاته" : "➕ إضافة فصل أو جزء جديد للكتاب"
        ),
        !isSavingChapter ? React.createElement("button", { type: "button", onClick: onClose, className: "text-slate-400 hover:text-slate-600 text-lg" }, "✕") : null
      ),

      // اسم الفصل
      React.createElement(
        "div",
        { className: "space-y-1" },
        React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "اسم أو عنوان الفصل / الجزء * :"),
        React.createElement("input", {
          type: "text",
          required: true,
          value: chapTitle,
          onChange: function(e) { setChapTitle(e.target.value); },
          placeholder: "مثال: الجزء الثاني: الطريق إلى الروحانية... أو الفصل 4...",
          className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
        })
      ),

      // نطاق الصفحات في الـ PDF (بداية ونهاية)
      React.createElement(
        "div",
        { className: "grid grid-cols-2 gap-3" },
        React.createElement(
          "div",
          { className: "space-y-1" },
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "صفحة البداية في PDF * :"),
          React.createElement("input", {
            type: "number",
            min: 1,
            required: true,
            value: chapStartPage,
            onChange: function(e) { setChapStartPage(e.target.value); },
            className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold text-center"
          })
        ),
        React.createElement(
          "div",
          { className: "space-y-1" },
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "صفحة النهاية في PDF:"),
          React.createElement("input", {
            type: "number",
            min: 1,
            value: chapEndPage || "",
            onChange: function(e) { setChapEndPage(e.target.value); },
            placeholder: "تلقائي للفصل التالي",
            className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold text-center"
          })
        )
      ),

      // موضع الترتيب في القائمة (عند الإضافة الجديدة)
      !editingChapter && existingChapters.length > 0 ? React.createElement(
        "div",
        { className: "space-y-1" },
        React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "📌 موضع هذا الفصل في ترتيب القائمة:"),
        React.createElement("select", {
          value: chapInsertPos || "end",
          onChange: function(e) { setChapInsertPos(e.target.value); },
          className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
        },
          React.createElement("option", { value: "end" }, "في نهاية القائمة (الأخير)"),
          React.createElement("option", { value: "start" }, "في بداية القائمة (الأول)"),
          existingChapters.map(function(c, i) {
            return React.createElement("option", { key: c.id, value: String(i + 1) }, "بعد: " + (i + 1) + " - " + c.title);
          })
        )
      ) : null,

      // ملف الصوت (اختياري)
      React.createElement(
        "div",
        { className: "space-y-1 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700" },
        React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between" },
          React.createElement("span", { className: "flex items-center gap-1.5" }, "🎵 ملف الصوت للفصل (MP3):"),
          React.createElement("span", { className: "text-[11px] text-slate-400 font-normal" }, "(اختياري)")
        ),
        React.createElement("input", {
          type: "file",
          accept: "audio/*",
          onChange: function(e) { setChapAudioFile(e.target.files && e.target.files[0]); },
          className: "block w-full text-xs text-slate-500 mb-2"
        }),
        React.createElement("input", {
          type: "url",
          value: chapAudioUrl,
          onChange: function(e) { setChapAudioUrl(e.target.value); },
          placeholder: "أو الصق رابط الصوت المباشر / جوجل درايف إذا كان متاحاً",
          className: "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
        }),
        React.createElement("p", { className: "text-[11px] text-slate-400 mt-1" }, "💡 يمكنك ترك الصوت فارغاً والتركيز على ضبط الصفحات واستخراج النصوص أولاً.")
      ),

      // ملف النص (اختياري)
      React.createElement(
        "div",
        { className: "space-y-1 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700" },
        React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between" },
          React.createElement("span", { className: "flex items-center gap-1.5" }, "📄 النص المفرغ للفصل:"),
          React.createElement("span", { className: "text-[11px] text-slate-400 font-normal" }, "(اختياري - يتم تفريغه بالـ AI)")
        ),
        React.createElement("input", {
          type: "file",
          accept: ".txt",
          onChange: handleChapterTextFileChange,
          className: "block w-full text-xs text-slate-500 mb-2"
        }),
        React.createElement("textarea", {
          rows: 3,
          value: chapText,
          onChange: function(e) { setChapText(e.target.value); },
          placeholder: "النص المفرغ يظهر هنا ويمكنك تعديله يدوياً أو استخراجه بالذكاء الاصطناعي...",
          className: "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-sans"
        })
      ),

      // حالة الحفظ
      isSavingChapter ? React.createElement(
        "div",
        { className: "p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold animate-pulse text-center" },
        chapterSaveStatus
      ) : null,

      React.createElement(
        "div",
        { className: "flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" },
        !isSavingChapter ? React.createElement("button", {
          type: "button",
          onClick: onClose,
          className: "px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        }, "إلغاء") : null,
        React.createElement("button", {
          type: "submit",
          disabled: isSavingChapter,
          className: "px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 disabled:opacity-50"
        }, isSavingChapter ? "جاري الحفظ..." : "حفظ التعديلات ✓")
      )
    )
  );
};