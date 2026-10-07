// مودال إضافة أو تعديل الفصل الصوتي والنص المفرغ
window.ChapterEditModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var editingChapter = props.editingChapter;
  var chapTitle = props.chapTitle;
  var setChapTitle = props.setChapTitle;
  var chapStartPage = props.chapStartPage;
  var setChapStartPage = props.setChapStartPage;
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
          editingChapter ? "✏️ تعديل بيانات الفصل الصوتي" : "➕ إضافة فصل صوتي جديد للكتاب"
        ),
        !isSavingChapter ? React.createElement("button", { type: "button", onClick: onClose, className: "text-slate-400 hover:text-slate-600 text-lg" }, "✕") : null
      ),

      // اسم الفصل
      React.createElement(
        "div",
        { className: "space-y-1" },
        React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "اسم الفصل أو الجزء * :"),
        React.createElement("input", {
          type: "text",
          required: true,
          value: chapTitle,
          onChange: function(e) { setChapTitle(e.target.value); },
          placeholder: "مثال: المقدمة: مدخل لدراسة المشورة، أو الفصل الأول...",
          className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        })
      ),

      // صفحة البداية
      React.createElement(
        "div",
        { className: "space-y-1" },
        React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "رقم صفحة بداية الفصل في ملف الـ PDF:"),
        React.createElement("input", {
          type: "number",
          min: 1,
          value: chapStartPage,
          onChange: function(e) { setChapStartPage(e.target.value); },
          className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        })
      ),

      // ملف الصوت
      React.createElement(
        "div",
        { className: "space-y-1 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700" },
        React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5" },
          "🎵 ملف الصوت للفصل (MP3):"
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
          placeholder: "أو الصق رابط الصوت المباشر / جوجل درايف إذا كان مرفوعاً",
          className: "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
        }),
        React.createElement("p", { className: "text-[11px] text-slate-400 mt-1" }, "💡 اختر ملف الصوت الذي حملته من Edge-TTS وسيتم رفعه لجوجل درايف تلقائياً.")
      ),

      // ملف النص
      React.createElement(
        "div",
        { className: "space-y-1 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700" },
        React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5" },
          "📄 النص المفرغ للفصل (اختياري للقراءة والنسخ):"
        ),
        React.createElement("input", {
          type: "file",
          accept: ".txt",
          onChange: handleChapterTextFileChange,
          className: "block w-full text-xs text-slate-500 mb-2"
        }),
        React.createElement("textarea", {
          rows: 4,
          value: chapText,
          onChange: function(e) { setChapText(e.target.value); },
          placeholder: "أو الصق النص المفرغ هنا...",
          className: "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-sans"
        }),
        React.createElement("p", { className: "text-[11px] text-slate-400 mt-1" }, "💡 يمكنك اختيار ملف الـ .txt الذي قمت بتحميله من أداة الاستخراج وسيتم قراءته تلقائياً!")
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
        }, isSavingChapter ? "جاري الرفع والحفظ..." : "حفظ الفصل ✓")
      )
    )
  );
};
