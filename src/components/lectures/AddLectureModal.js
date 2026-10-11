// نافذة تسجيل محاضرة جديدة للمسؤول
window.AddLectureModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var onSubmit = props.onSubmit;

  var newMediaUrl = props.newMediaUrl;
  var setNewMediaUrl = props.setNewMediaUrl;
  var selectedFile = props.selectedFile;
  var setSelectedFile = props.setSelectedFile;
  var isDraggingFile = props.isDraggingFile;
  var setIsDraggingFile = props.setIsDraggingFile;
  var isUploading = props.isUploading;
  var uploadStatusText = props.uploadStatusText;
  var processSelectedFile = props.processSelectedFile;
  var handleFileSelect = props.handleFileSelect;

  var newSubject = props.newSubject;
  var setNewSubject = props.setNewSubject;
  var subjectsList = props.subjectsList || [];
  var newDate = props.newDate;
  var setNewDate = props.setNewDate;
  var newSessionOrder = props.newSessionOrder;
  var setNewSessionOrder = props.setNewSessionOrder;
  var newSpeaker = props.newSpeaker;
  var setNewSpeaker = props.setNewSpeaker;
  var newTitle = props.newTitle;
  var setNewTitle = props.setNewTitle;
  var newHandoutUrl = props.newHandoutUrl;
  var setNewHandoutUrl = props.setNewHandoutUrl;
  var newHandoutName = props.newHandoutName;
  var setNewHandoutName = props.setNewHandoutName;
  var newNotes = props.newNotes;
  var setNewNotes = props.setNewNotes;
  var newAudioSummaryUrl = props.newAudioSummaryUrl;
  var setNewAudioSummaryUrl = props.setNewAudioSummaryUrl;
  var newWrittenSummary = props.newWrittenSummary;
  var setNewWrittenSummary = props.setNewWrittenSummary;
  var newQuizText = props.newQuizText;
  var setNewQuizText = props.setNewQuizText;

  if (!isOpen) return null;

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: function(e) { if (e.target === e.currentTarget && !isUploading && onClose) onClose(); }
    },
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto" },
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b pb-3" },
        React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "تسجيل محاضرة جديدة"),
        !isUploading && React.createElement("button", { onClick: function() { if (onClose) onClose(); }, className: "text-slate-400" }, "✕")
      ),
      React.createElement(
        "form",
        { onSubmit: onSubmit, className: "space-y-3" },

        // خيار 1: رابط يوتيوب مباشر
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "رابط المحاضرة على YouTube أو Google Drive (اختياري)"),
          React.createElement("input", {
            type: "url",
            value: newMediaUrl,
            onChange: function(e) { setNewMediaUrl(e.target.value); },
            placeholder: "https://www.youtube.com/watch?v=...",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          })
        ),

        // خيار 2: منطقة سحب وإفلات أو اختيار ملف للرفع
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
              if (droppedFile && processSelectedFile) {
                processSelectedFile(droppedFile);
              }
            },
            className: "p-4 rounded-2xl border-2 border-dashed transition-all text-center space-y-2 " +
              (isDraggingFile ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]" : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20")
          },
          React.createElement("label", { className: "cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 block space-y-1.5" },
            React.createElement("div", { className: "text-2xl" }, isDraggingFile ? "📥" : (selectedFile ? "🎬" : "📂")),
            React.createElement("div", { className: "text-xs font-semibold" },
              selectedFile ? "الملف المختار: " + selectedFile.name : (isDraggingFile ? "أفلت الملف هنا للرفع مباشرة..." : "اسحب وأفلت ملف المحاضرة (صوت أو فيديو) هنا")
            ),
            React.createElement("span", { className: "inline-block text-[11px] text-emerald-600 dark:text-emerald-400 underline font-medium" }, "أو اضغط لتصفح جهازك"),
            React.createElement("input", {
              type: "file",
              accept: "audio/*,video/*",
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

        isUploading && React.createElement(
          "div",
          { className: "p-2.5 rounded-xl bg-slate-900 text-white text-center text-xs animate-pulse" },
          uploadStatusText
        ),

        // اسم المادة الدراسية
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "المادة الدراسية (الفرقة / المساق)"),
          React.createElement("input", {
            type: "text",
            value: newSubject,
            onChange: function(e) { setNewSubject(e.target.value); },
            list: "counseling-subjects-list",
            placeholder: "مثال: مادة علم المشورة، النمو النفسي، الطب النفسي...",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
          }),
          React.createElement(
            "datalist",
            { id: "counseling-subjects-list" },
            subjectsList.filter(function(s) { return s !== "الكل"; }).map(function(s) {
              return React.createElement("option", { key: s, value: s });
            })
          )
        ),

        // تاريخ المحاضرة والترتيب في اليوم
        React.createElement(
          "div",
          { className: "grid grid-cols-2 gap-3" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "تاريخ اليوم الدراسي"),
            React.createElement("input", {
              type: "date",
              required: true,
              value: newDate,
              onChange: function(e) { setNewDate(e.target.value); },
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "ترتيب الجلسة في اليوم"),
            React.createElement("select", {
              value: newSessionOrder,
              onChange: function(e) { setNewSessionOrder(e.target.value); },
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            }, [
              React.createElement("option", { key: 1, value: 1 }, "المحاضرة الأولى"),
              React.createElement("option", { key: 2, value: 2 }, "المحاضرة الثانية"),
              React.createElement("option", { key: 3, value: 3 }, "المحاضرة الثالثة")
            ])
          )
        ),

        // المحاضر
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "المحاضر / الدكتور"),
          React.createElement("input", {
            type: "text",
            required: true,
            value: newSpeaker,
            onChange: function(e) { setNewSpeaker(e.target.value); },
            placeholder: "مثال: د. مجدي إسحق، د. إميل جورج...",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
          })
        ),

        // عنوان المحاضرة
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "موضوع وعنوان المحاضرة"),
          React.createElement("input", {
            type: "text",
            required: true,
            value: newTitle,
            onChange: function(e) { setNewTitle(e.target.value); },
            placeholder: "اكتب عنوان المحاضرة...",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
          })
        ),

        // ملف الهاند آوت أو رابطه (اختياري)
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "📂 رابط ملف الهاند آوت / العرض (Google Drive أو مباشر)"),
          React.createElement("input", {
            type: "url",
            value: newHandoutUrl,
            onChange: function(e) {
              var v = e.target.value;
              setNewHandoutUrl(v);
              if (v && !newHandoutName) setNewHandoutName("ملف المحاضرة (Handout)");
            },
            placeholder: "https://drive.google.com/file/d/... رابط ملف PDF أو بوربوينت",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
          })
        ),

        // ملاحظات وعناصر
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "ملاحظات أو عناصر رئيسية للملخص"),
          React.createElement("textarea", {
            rows: 2,
            value: newNotes,
            onChange: function(e) { setNewNotes(e.target.value); },
            placeholder: "أهم الأفكار التي تساعد في التلخيص...",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
          })
        ),

        // حقول NotebookLM والكويز الاختيارية عند الإنشاء
        React.createElement(
          "div",
          { className: "border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3" },
          React.createElement("h4", { className: "text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5" },
            React.createElement("span", null, "✨"),
            React.createElement("span", null, "مخرجات NotebookLM والكويز (اختياري):")
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "🎙️ رابط الملخص الصوتي (NotebookLM / MP3)"),
            React.createElement("input", {
              type: "url",
              value: newAudioSummaryUrl,
              onChange: function(e) { setNewAudioSummaryUrl(e.target.value); },
              placeholder: "رابط ملف الـ MP3 من درايف أو خادم التخزين...",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "📄 تقرير الملخص المكتوب (NotebookLM)"),
            React.createElement("textarea", {
              rows: 3,
              value: newWrittenSummary,
              onChange: function(e) { setNewWrittenSummary(e.target.value); },
              placeholder: "الصق هنا الملخص المكتوب المستخرج من NotebookLM...",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "📝 أسئلة الكويز (JSON أو نص مباشر)"),
            React.createElement("textarea", {
              rows: 3,
              value: newQuizText,
              onChange: function(e) { setNewQuizText(e.target.value); },
              placeholder: 'يمكنك كتابة نص مباشر أو لصق JSON: [{"question":"...","options":["..."],"correct":0}]',
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-mono"
            })
          )
        ),

        React.createElement(
          "div",
          { className: "flex justify-end gap-2 pt-2" },
          !isUploading && React.createElement("button", { type: "button", onClick: function() { if (onClose) onClose(); }, className: "px-4 py-2 text-xs" }, "إلغاء"),
          React.createElement("button", {
            type: "submit",
            disabled: isUploading,
            className: "px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white"
          }, isUploading ? "جاري الحفظ..." : "حفظ المحاضرة")
        )
      )
    )
  );
};
