// مودال تعديل صورة غلاف الكتاب
window.BookCoverModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var selectedCoverFile = props.selectedCoverFile;
  var setSelectedCoverFile = props.setSelectedCoverFile;
  var editingCoverUrl = props.editingCoverUrl;
  var setEditingCoverUrl = props.setEditingCoverUrl;
  var isUploadingCover = props.isUploadingCover;
  var onSave = props.onSave;

  var utils = window.APP_UTILS;

  if (!isOpen) return null;

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4", onClick: onClose },
    React.createElement(
      "div",
      {
        className: "bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4",
        onClick: function(e) { e.stopPropagation(); }
      },
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3" },
        React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "🖼️ تغيير صورة غلاف الكتاب"),
        React.createElement("button", { onClick: onClose, className: "text-slate-400 hover:text-slate-600 dark:hover:text-white" }, "✕")
      ),
      React.createElement(
        "div",
        { className: "space-y-4" },
        // معاينة الغلاف
        React.createElement(
          "div",
          { className: "w-32 h-44 mx-auto rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 bg-slate-900 shadow-md flex items-center justify-center" },
          (selectedCoverFile || editingCoverUrl) ? React.createElement("img", {
            src: selectedCoverFile ? URL.createObjectURL(selectedCoverFile) : utils.getDriveImageUrl(editingCoverUrl),
            alt: "Cover",
            className: "w-full h-full object-cover",
            onError: function(e) {
              var rawId = utils.extractDriveId(editingCoverUrl);
              if (rawId && !e.target._triedLh3) {
                e.target._triedLh3 = true;
                e.target.src = "https://lh3.googleusercontent.com/d/" + rawId;
              }
            }
          }) : React.createElement("div", { className: "text-4xl text-slate-500" }, "📖")
        ),
        // زر رفع ملف صورة من الجهاز
        React.createElement(
          "div",
          { className: "text-center" },
          React.createElement(
            "label",
            { className: "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer shadow-xs transition-all active:scale-95" },
            React.createElement("span", null, "📁"),
            React.createElement("span", null, selectedCoverFile ? ("تم اختيار: " + selectedCoverFile.name) : "اختر صورة جديدة من جهازك"),
            React.createElement("input", {
              type: "file",
              accept: "image/*",
              onChange: function(e) {
                if (e.target.files && e.target.files[0]) {
                  setSelectedCoverFile(e.target.files[0]);
                }
              },
              className: "hidden"
            })
          ),
          selectedCoverFile && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setSelectedCoverFile(null); },
              className: "block mx-auto mt-1.5 text-[11px] text-rose-500 hover:underline"
            },
            "إلغاء اختيار الملف"
          )
        ),
        // رابط صورة بديل
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "أو ضع رابط صورة الغلاف مباشرة (يدعم Google Drive والروابط المباشرة)"),
          React.createElement("input", {
            type: "url",
            value: editingCoverUrl,
            onChange: function(e) { setEditingCoverUrl(e.target.value); },
            onBlur: function(e) {
              if (e.target.value) {
                var c = utils.getDriveImageUrl(e.target.value);
                if (c !== e.target.value) setEditingCoverUrl(c);
              }
            },
            placeholder: "الصق رابط صورة من جوجل درايف أو أي موقع (https://...)",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          })
        ),
        // أزرار الحفظ والإلغاء
        React.createElement(
          "div",
          { className: "flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" },
          React.createElement("button", {
            type: "button",
            onClick: onClose,
            disabled: isUploadingCover,
            className: "px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          }, "إلغاء"),
          React.createElement("button", {
            type: "button",
            disabled: isUploadingCover,
            onClick: onSave,
            className: "px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white shadow-md active:scale-95 disabled:opacity-50"
          }, isUploadingCover ? "جاري الحفظ..." : "حفظ الغلاف الجديد ✓")
        )
      )
    )
  );
};
