// مودال إضافة كتاب أو مرجع جديد مع إمكانية السحب والإفلات والاستخراج بالـ AI
window.AddBookModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var isUploading = props.isUploading;
  var uploadStatusText = props.uploadStatusText;
  var uploadProgress = props.uploadProgress;
  var isDraggingFile = props.isDraggingFile;
  var setIsDraggingFile = props.setIsDraggingFile;
  var selectedFile = props.selectedFile;
  var setSelectedFile = props.setSelectedFile;
  var handleFileSelect = props.handleFileSelect;
  var processSelectedFile = props.processSelectedFile;
  var handleAutoDetectBookWithAi = props.handleAutoDetectBookWithAi;
  var isAiAnalyzingBook = props.isAiAnalyzingBook;
  var newTitle = props.newTitle;
  var setNewTitle = props.setNewTitle;
  var newAuthor = props.newAuthor;
  var setNewAuthor = props.setNewAuthor;
  var newTranslator = props.newTranslator;
  var setNewTranslator = props.setNewTranslator;
  var newCoverUrl = props.newCoverUrl;
  var setNewCoverUrl = props.setNewCoverUrl;
  var selectedCoverFile = props.selectedCoverFile;
  var setSelectedCoverFile = props.setSelectedCoverFile;
  var newDriveUrl = props.newDriveUrl;
  var setNewDriveUrl = props.setNewDriveUrl;
  var setSelectedAudioFile = props.setSelectedAudioFile;
  var newTrack1Url = props.newTrack1Url;
  var setNewTrack1Url = props.setNewTrack1Url;
  var newIsPublished = props.newIsPublished;
  var setNewIsPublished = props.setNewIsPublished;
  var onSubmit = props.onSubmit;

  var isEditing = props.isEditing;

  var utils = window.APP_UTILS;

  if (!isOpen) return null;

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" },
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto" },
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800" },
        React.createElement(
          "div",
          { className: "flex items-center gap-2" },
          React.createElement("button", {
            type: "button",
            onClick: onClose,
            className: "p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all flex items-center gap-1 text-xs font-bold",
            title: "رجوع / إغلاق"
          }, React.createElement("span", { className: "text-base" }, "←"), React.createElement("span", null, "رجوع")),
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, isEditing ? "تعديل بيانات الكتاب" : "إضافة مرجع أو كتاب دراسي")
        ),
        React.createElement("button", {
          type: "button",
          onClick: onClose,
          className: "w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-bold",
          title: "إغلاق النافذة"
        }, "✕")
      ),
      React.createElement(
        "form",
        { onSubmit: onSubmit, className: "space-y-3" },
        React.createElement(
          "div",
          {
            onDragOver: function(e) {
              e.preventDefault();
              setIsDraggingFile(true);
            },
            onDragLeave: function(e) {
              e.preventDefault();
              setIsDraggingFile(false);
            },
            onDrop: function(e) {
              e.preventDefault();
              setIsDraggingFile(false);
              var droppedFile = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
              if (droppedFile) {
                processSelectedFile(droppedFile);
              }
            },
            className: "p-4 rounded-2xl border-2 border-dashed transition-all text-center space-y-2 " +
              (isDraggingFile ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]" : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20")
          },
          React.createElement("label", { className: "cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 block space-y-1.5" },
            React.createElement("div", { className: "text-2xl" }, isDraggingFile ? "📥" : (selectedFile ? "📕" : "📖")),
            React.createElement("div", { className: "text-xs font-semibold" },
              selectedFile ? "الملف المختار: " + selectedFile.name : (isDraggingFile ? "أفلت ملف الكتاب هنا للرفع مباشرة..." : "اسحب وأفلت ملف المرجع أو الكتاب (PDF) هنا")
            ),
            React.createElement("span", { className: "inline-block text-[11px] text-emerald-600 dark:text-emerald-400 underline font-medium" }, "أو اضغط لتصفح ملفات جهازك"),
            React.createElement("input", {
              type: "file",
              accept: "application/pdf",
              onChange: handleFileSelect,
              disabled: isUploading,
              className: "hidden"
            })
          ),
          selectedFile && React.createElement(
            "div",
            { className: "flex items-center justify-center gap-2 pt-1" },
            React.createElement("span", { className: "text-[11px] text-slate-400" }, (selectedFile.size ? (selectedFile.size / (1024 * 1024)).toFixed(1) + " MB" : "")),
            !isUploading && React.createElement("button", {
              type: "button",
              onClick: function() { setSelectedFile(null); },
              className: "text-[11px] text-rose-500 hover:underline"
            }, "إلغاء الملف")
          )
        ),
        (isUploading || uploadProgress) && React.createElement(
          "div",
          { className: "p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-700/80 shadow-xl space-y-2.5 animate-fade-in" },
          React.createElement(
            "div",
            { className: "flex items-center justify-between text-xs font-bold gap-2" },
            React.createElement(
              "div",
              { className: "flex items-center gap-2 truncate" },
              React.createElement("span", { className: "animate-spin text-sm shrink-0" }, "⏳"),
              React.createElement("span", { className: "truncate text-slate-200" }, 
                uploadProgress && uploadProgress.message ? uploadProgress.message : (uploadStatusText || "جاري حفظ ورفع الملف...")
              )
            ),
            uploadProgress && uploadProgress.percent !== undefined && React.createElement(
              "span",
              { className: "font-mono font-black text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-lg shrink-0 text-xs shadow-xs" },
              uploadProgress.percent + "%"
            )
          ),
          React.createElement(
            "div",
            { className: "w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700 p-0.5" },
            React.createElement("div", {
              className: "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-300 relative shadow-xs",
              style: { width: Math.max(5, (uploadProgress ? uploadProgress.percent : 40)) + "%" }
            })
          ),
          uploadProgress && uploadProgress.totalMB && React.createElement(
            "div",
            { className: "flex items-center justify-between text-[11px] text-slate-400 pt-0.5 font-mono" },
            React.createElement("span", null, "الحجم المنقول: " + (uploadProgress.loadedMB || "0") + " من " + uploadProgress.totalMB + " MB"),
            React.createElement("span", { className: "text-emerald-300 font-sans font-bold" }, 
              uploadProgress.percent >= 96 
                ? "جاري التأكيد في Google Drive..." 
                : ("متبقي " + Math.max(0, ((Number(uploadProgress.totalMB) || 0) - (Number(uploadProgress.loadedMB) || 0)).toFixed(1)) + " MB")
            )
          )
        ),

        // زر التحليل والاستخراج التلقائي بالذكاء الاصطناعي
        React.createElement(
          "div",
          { className: "pt-1" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleAutoDetectBookWithAi,
              disabled: isAiAnalyzingBook || isUploading,
              className: "w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            },
            React.createElement("span", { className: "text-base" }, isAiAnalyzingBook ? "⏳" : "✨"),
            React.createElement("span", null, isAiAnalyzingBook ? "جاري استخراج الغلاف والبيانات بالذكاء..." : "استخراج الغلاف والاسم والكاتب تلقائياً بالـ AI")
          )
        ),

        // بيانات الكتاب الأساسية (العنوان والمؤلف والغلاف فقط)
        React.createElement(
          "div",
          { className: "space-y-3 pt-1" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "اسم الكتاب / المرجع"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: newTitle,
              onChange: function(e) { setNewTitle(e.target.value); },
              placeholder: "أدخل عنوان الكتاب...",
              className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "اسم الكاتب / المؤلف"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: newAuthor,
              onChange: function(e) { setNewAuthor(e.target.value); },
              placeholder: "أدخل اسم الكاتب...",
              className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "اسم المترجم (إن وجد)"),
            React.createElement("input", {
              type: "text",
              value: newTranslator || "",
              onChange: function(e) { setNewTranslator && setNewTranslator(e.target.value); },
              placeholder: "أدخل اسم المترجم إن وجد...",
              className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            })
          ),
          React.createElement(
            "div",
            { className: "p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2" },
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "🖼️ صورة غلاف الكتاب (يتم استخراجها تلقائياً بالـ AI أو يمكنك رفعها)"),
            React.createElement(
              "div",
              { className: "flex items-center gap-3" },
              // معاينة مصغرة للغلاف
              (selectedCoverFile || newCoverUrl) ? React.createElement(
                "div",
                { className: "w-12 h-16 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-900 shrink-0 shadow-xs flex items-center justify-center p-0.5" },
                React.createElement("img", {
                  src: selectedCoverFile ? URL.createObjectURL(selectedCoverFile) : utils.getDriveImageUrl(newCoverUrl),
                  alt: "Cover Preview",
                  className: "w-full h-full object-contain rounded",
                  onError: function(e) {
                    var rawId = utils.extractDriveId(newCoverUrl);
                    if (rawId && !e.target._triedLh3) {
                      e.target._triedLh3 = true;
                      e.target.src = "https://lh3.googleusercontent.com/d/" + rawId;
                    }
                  }
                })
              ) : React.createElement(
                "div",
                { className: "w-12 h-16 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 shrink-0" },
                "غلاف"
              ),
              React.createElement(
                "div",
                { className: "flex-1 space-y-1.5" },
                React.createElement(
                  "label",
                  { className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer transition-all active:scale-95" },
                  React.createElement("span", null, "📁"),
                  React.createElement("span", null, selectedCoverFile ? ("تم اختيار: " + selectedCoverFile.name) : (newCoverUrl ? "تم استخراج الغلاف تلقائياً ✓" : "رفع صورة غلاف خاصة")),
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
                    className: "text-[11px] text-rose-500 hover:underline mr-2"
                  },
                  "إلغاء الصورة"
                ),
                React.createElement("input", {
                  type: "url",
                  value: newCoverUrl,
                  onChange: function(e) { setNewCoverUrl(e.target.value); },
                  placeholder: "أو رابط صورة الغلاف المباشر...",
                  className: "w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white"
                })
              )
            )
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "رابط ملف الـ PDF على Google Drive (بديل في حال عدم رفع ملف من الجهاز)"),
            React.createElement("input", {
              type: "url",
              value: newDriveUrl,
              onChange: function(e) { setNewDriveUrl(e.target.value); },
              placeholder: "https://drive.google.com/file/d/... رابط ملف الـ PDF",
              className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
            })
          ),
          // خيار حالة النشر (مسودة أم منشور)
          typeof setNewIsPublished === "function" ? React.createElement(
            "div",
            { className: "p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3" },
            React.createElement("div", { className: "space-y-0.5" },
              React.createElement("div", { className: "text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" },
                React.createElement("span", null, newIsPublished ? "🌍 منشور للدارسين" : "🔒 مسودة خاصة (قيد الإعداد)"),
                React.createElement("span", { className: "text-[10px] px-2 py-0.5 rounded-full font-bold " + (newIsPublished ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300") },
                  newIsPublished ? "مرئي للجميع" : "مخفي عن الطلاب"
                )
              ),
              React.createElement("div", { className: "text-[11px] text-slate-500 dark:text-slate-400" },
                newIsPublished ? "الكتاب سيظهر لجميع الطلاب في المكتبة فور حفظه." : "الكتاب سيكون مخفياً عن الطلاب حتى تنتهي من استخراج فصوله ونشره."
              )
            ),
            React.createElement("button", {
              type: "button",
              onClick: function() { setNewIsPublished(!newIsPublished); },
              className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 " +
                (newIsPublished ? "bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200" : "bg-emerald-600 hover:bg-emerald-500 text-white")
            }, newIsPublished ? "إخفاء كمسودة 🔒" : "نشر للجميع 🌍")
          ) : null
        ),
        React.createElement(
          "div",
          { className: "flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800" },
          React.createElement("button", {
            type: "button",
            onClick: onClose,
            className: "px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
          }, "رجوع / إلغاء"),
          React.createElement("button", {
            type: "submit",
            disabled: isUploading,
            className: "px-6 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md active:scale-95 disabled:opacity-50 transition-all"
          }, isUploading ? (uploadProgress && uploadProgress.percent !== undefined ? ("جاري الرفع (" + uploadProgress.percent + "%)...") : (uploadStatusText || "جاري الحفظ...")) : (isEditing ? "حفظ التعديلات ✓" : "حفظ الكتاب في المكتبة ✓"))
        )
      )
    )
  );
};
