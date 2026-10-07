// مكون عارض الـ PDF التفاعلي المدمج (Native PDF Reader)
// يدعم القراءة بدون إنترنت، ملء الشاشة، التدوير، ونمط القراءة المريح
window.PdfReaderView = function(props) {
  var activeBook = props.activeBook;
  var isSavedOffline = props.isSavedOffline;
  var isFullScreen = props.isFullScreen;
  var mobileSectionTab = props.mobileSectionTab;
  var pdfTheme = props.pdfTheme;
  var setPdfTheme = props.setPdfTheme;
  var pdfRotation = props.pdfRotation;
  var handlePageChange = props.handlePageChange;
  var getMaxPages = props.getMaxPages;
  var handleRotatePage = props.handleRotatePage;
  var toggleFullScreen = props.toggleFullScreen;
  var loadPdfFromData = props.loadPdfFromData;
  var setIsSavedOffline = props.setIsSavedOffline;
  var setOfflineSaveMsg = props.setOfflineSaveMsg;
  var handleSaveOffline = props.handleSaveOffline;
  var isSavingOffline = props.isSavingOffline;
  var handleRemoveOffline = props.handleRemoveOffline;
  var isPdfLoading = props.isPdfLoading;
  var pdfDoc = props.pdfDoc;
  var pdfCanvasRef = props.pdfCanvasRef;
  var pdfViewerContainerRef = props.pdfViewerContainerRef;

  var utils = window.APP_UTILS;

  if (!activeBook || (!activeBook.driveUrl && !isSavedOffline)) {
    return null;
  }

  return React.createElement(
    "div",
    {
      ref: pdfViewerContainerRef,
      className: "w-full overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2 transition-all " +
        (isFullScreen
          ? "fixed inset-0 z-[9999] rounded-0 p-3 h-screen w-screen flex flex-col justify-between bg-slate-950"
          : "rounded-2xl p-3 ") +
        (!isFullScreen && mobileSectionTab !== "pdf" ? "hidden sm:block" : "block")
    },
    
    // شريط أدوات قارئ الكتاب وحالة الأوفلاين وأزرار ملء الشاشة والتدوير
    React.createElement(
      "div",
      { className: "flex flex-wrap items-center justify-between gap-2 px-2 py-1 text-white border-b border-slate-800 pb-2.5 text-xs shrink-0" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement("span", { className: "text-base" }, "📖"),
        React.createElement("span", { className: "font-bold text-xs" }, "قارئ الكتاب المدمج"),
        isSavedOffline ? React.createElement(
          "span",
          { className: "bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full" },
          "✓ متاح للقراءة أوفلاين بدون نت"
        ) : React.createElement(
          "span",
          { className: "bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-medium px-2 py-0.5 rounded-full" },
          "سحابي (يحتاج إنترنت)"
        )
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-2 mr-auto" },

        // أزرار نمط القراءة المريح (عادي / حماية عين بيج Sepia / ليلي عاكس Dark)
        React.createElement(
          "div",
          { className: "flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700" },
          React.createElement("button", {
            type: "button",
            onClick: function() { setPdfTheme("normal"); utils.setLocal("counsel_pdf_theme", "normal"); },
            title: "وضع القراءة العادي (أبيض)",
            className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " +
              (pdfTheme === "normal" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-white")
          }, "☀️ عادي"),
          React.createElement("button", {
            type: "button",
            onClick: function() { setPdfTheme("sepia"); utils.setLocal("counsel_pdf_theme", "sepia"); },
            title: "وضع القراءة المريح للعين (بيج / Sepia)",
            className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " +
              (pdfTheme === "sepia" ? "bg-[#fbf0d9] text-[#5f4b32] shadow-xs font-black" : "text-amber-200/60 hover:text-amber-200")
          }, "📜 بيج"),
          React.createElement("button", {
            type: "button",
            onClick: function() { setPdfTheme("dark"); utils.setLocal("counsel_pdf_theme", "dark"); },
            title: "وضع القراءة الليلي العاكس للألوان (Dark Invert)",
            className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " +
              (pdfTheme === "dark" ? "bg-slate-950 text-emerald-400 border border-emerald-500/30 shadow-xs font-black" : "text-slate-400 hover:text-white")
          }, "🌙 ليلي")
        ),

        // أزرار التنقل السريع بين الصفحات أثناء وضع ملء الشاشة
        isFullScreen && React.createElement(
          "div",
          { className: "flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl text-xs border border-slate-700" },
          React.createElement("button", {
            type: "button",
            onClick: function() { handlePageChange((activeBook.currentPage || 1) - 1); },
            disabled: (activeBook.currentPage || 1) <= 1,
            title: "الصفحة السابقة",
            className: "px-2 py-0.5 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          }, "◀"),
          React.createElement("div", { className: "flex items-center gap-1 font-bold text-emerald-400 font-mono" },
            React.createElement("input", {
              type: "number",
              min: 1,
              max: getMaxPages(),
              value: activeBook.currentPage || 1,
              onChange: function(e) {
                var val = parseInt(e.target.value);
                if (!isNaN(val)) handlePageChange(val);
              },
              title: "اكتب رقم الصفحة للانتقال المباشر",
              className: "w-12 bg-slate-900 border border-slate-700 rounded text-center text-emerald-400 text-xs py-0.5 focus:border-emerald-500 focus:outline-none"
            }),
            React.createElement("span", { className: "text-slate-400 text-xs" }, " / " + getMaxPages())
          ),
          React.createElement("button", {
            type: "button",
            onClick: function() { handlePageChange((activeBook.currentPage || 1) + 1); },
            disabled: (activeBook.currentPage || 1) >= getMaxPages(),
            title: "الصفحة التالية",
            className: "px-2 py-0.5 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          }, "▶")
        ),

        // زر تدوير الصفحة 90 درجة (Rotate)
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleRotatePage,
            title: "تدوير الصفحة 90 درجة",
            className: "px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm active:scale-95 transition-all min-h-[38px]"
          },
          React.createElement("span", { className: "text-base" }, "🔄"),
          React.createElement("span", { className: "hidden sm:inline font-mono" }, pdfRotation + "°")
        ),

        // زر وضع ملء الشاشة (Full Screen)
        React.createElement(
          "button",
          {
            type: "button",
            onClick: toggleFullScreen,
            title: isFullScreen ? "الخروج من ملء الشاشة" : "وضع ملء الشاشة للقراءة",
            className: "px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all min-h-[38px]"
          },
          React.createElement("span", null, isFullScreen ? "🗗" : "⛶"),
          React.createElement("span", null, isFullScreen ? "خروج" : "ملء الشاشة")
        ),

        // زر فتح ملف PDF من الجهاز مباشرة لتخطي أي قيود سحابية وللقراءة الصوتية فوراً
        React.createElement(
          "label",
          {
            title: "اختر ملف الكتاب من جهازك للقراءة الصوتية التلقائية وحفظه بدون نت",
            className: "px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm cursor-pointer active:scale-95 transition-all min-h-[38px]"
          },
          React.createElement("span", null, "📂"),
          React.createElement("span", { className: "hidden sm:inline" }, "فتح ملف"),
          React.createElement("input", {
            type: "file",
            accept: "application/pdf",
            className: "hidden",
            onChange: function(e) {
              var file = e.target.files && e.target.files[0];
              if (!file) return;
              var reader = new FileReader();
              reader.onload = function(evt) {
                var buffer = evt.target.result;
                loadPdfFromData(buffer);
                if (activeBook && activeBook.id) {
                  utils.saveOfflinePdf(activeBook.id, buffer).then(function() {
                    setIsSavedOffline(true);
                    setOfflineSaveMsg("تم حفظ الكتاب في جهازك بنجاح! متاح للقراءة والاستماع دائماً بدون إنترنت ✓");
                    setTimeout(function() { setOfflineSaveMsg(""); }, 4000);
                  }).catch(function() {});
                }
              };
              reader.readAsArrayBuffer(file);
            }
          })
        ),

        // زر حفظ الكتاب للقراءة أوفلاين
        !isSavedOffline ? React.createElement(
          "button",
          {
            type: "button",
            onClick: handleSaveOffline,
            disabled: isSavingOffline,
            className: "px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm active:scale-95 transition-all"
          },
          React.createElement("span", null, "📥"),
          React.createElement("span", { className: "hidden md:inline" }, isSavingOffline ? "جاري الحفظ..." : "تحميل بدون نت")
        ) : React.createElement(
          "button",
          {
            type: "button",
            onClick: handleRemoveOffline,
            className: "px-2.5 py-1 text-[11px] text-slate-400 hover:text-rose-400"
          },
          "إلغاء الحفظ"
        )
      )
    ),

    // لوحة عرض الصفحة (PDF Canvas Viewer)
    React.createElement(
      "div",
      {
        className: "relative overflow-auto flex items-center justify-center bg-slate-950 rounded-xl p-2 transition-all " +
          (isFullScreen ? "flex-1 w-full h-[calc(100vh-80px)] min-h-0 max-h-none" : "min-h-[420px] max-h-[650px]")
      },
      isPdfLoading && React.createElement(
        "div",
        { className: "absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10 text-white text-xs font-bold gap-2" },
        React.createElement("span", { className: "animate-spin text-lg" }, "⏳"),
        React.createElement("span", null, "جاري فتح صفحات الكتاب وحفظ موضع القراءة...")
      ),
      pdfDoc ? React.createElement("canvas", {
        ref: pdfCanvasRef,
        className: "max-w-full shadow-2xl rounded-lg transition-transform duration-300 " +
          (pdfTheme === "sepia" ? "bg-[#fbf0d9]" : pdfTheme === "dark" ? "bg-slate-950" : "bg-white"),
        style: {
          filter: pdfTheme === "sepia"
            ? "sepia(0.4) contrast(0.95) brightness(0.95)"
            : pdfTheme === "dark"
              ? "invert(0.9) hue-rotate(180deg) contrast(1.1)"
              : "none"
        }
      }) : React.createElement(
        "iframe",
        {
          src: utils.getDrivePreviewUrl(activeBook.driveUrl),
          className: "w-full h-full min-h-[480px] border-0 rounded-lg transition-transform duration-300",
          style: Object.assign(
            {},
            pdfRotation ? { transform: "rotate(" + pdfRotation + "deg)" } : {},
            pdfTheme === "sepia"
              ? { filter: "sepia(0.4) contrast(0.95) brightness(0.95)" }
              : pdfTheme === "dark"
                ? { filter: "invert(0.9) hue-rotate(180deg) contrast(1.1)" }
                : {}
          ),
          title: activeBook.title
        }
      )
    )
  );
};
