// مكون فصول الكتاب الصوتية والنصوص المفرغة ومشغل الصوت المستقل
window.AudioChaptersView = function(props) {
  var activeBook = props.activeBook;
  var currentUser = props.currentUser;
  var playingChapterId = props.playingChapterId;
  var setPlayingChapterId = props.setPlayingChapterId;
  var chapterAudioRef = props.chapterAudioRef;
  var handlePageChange = props.handlePageChange;
  var handleAutoScanActiveBookChapters = props.handleAutoScanActiveBookChapters;
  var handleOpenAddChapter = props.handleOpenAddChapter;
  var handleOpenEditChapter = props.handleOpenEditChapter;
  var handleDeleteChapter = props.handleDeleteChapter;
  var setViewingChapterText = props.setViewingChapterText;
  var isAiAnalyzingBook = props.isAiAnalyzingBook;
  var handleExtractChapterText = props.handleExtractChapterText;
  var extractingChapterId = props.extractingChapterId;
  var extractStatusText = props.extractStatusText;
  var handleClearAllChapters = props.handleClearAllChapters;
  var handleBatchExtractAllChapters = props.handleBatchExtractAllChapters;
  var handleStopBatchExtraction = props.handleStopBatchExtraction;
  var batchProgress = props.batchProgress;

  var utils = window.APP_UTILS;
  var chaps = (activeBook && activeBook.audioChapters) || [];

  var formatSecs = function(sec) {
    if (!sec || isNaN(sec) || sec <= 0) return "0 ثانية";
    var s = Math.round(sec);
    var mins = Math.floor(s / 60);
    var remainingS = s % 60;
    if (mins > 0) return mins + " دقيقة و " + remainingS + " ثانية";
    return remainingS + " ثانية";
  };

  return React.createElement(
    "div",
    { className: "space-y-4" },

    // ترويسة الفصول
    React.createElement(
      "div",
      { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm" },
      React.createElement(
        "div",
        null,
        React.createElement("h4", { className: "font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2" },
          "🎧 فصول الكتاب الصوتية والنصوص المفرغة",
          React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" },
            chaps.length + " فصول مضافة"
          )
        ),
        React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5" },
          "استمع للمقدمة ولكل فصل بشكل مستقل بصوت نقي، واقرأ النص المفرغ أو انتقل لصفحته في الكتاب بضغطة زر."
        )
      ),
      currentUser && currentUser.role === "admin" ? React.createElement(
        "div",
        { className: "flex items-center gap-2 self-start sm:self-auto flex-wrap" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleAutoScanActiveBookChapters,
            disabled: isAiAnalyzingBook || !!batchProgress,
            className: "inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all"
          },
          isAiAnalyzingBook ? "⏳ جاري فحص الفهرس..." : "🪄 فحص الفهرس بالـ AI"
        ),
        chaps.length > 0 && typeof handleBatchExtractAllChapters === "function" ? React.createElement(
          "button",
          {
            type: "button",
            onClick: handleBatchExtractAllChapters,
            disabled: isAiAnalyzingBook || !!batchProgress,
            className: "inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
          },
          batchProgress ? "⏳ جاري الاستخراج الجماعي..." : "📦 استخراج كل الفصول دفعة واحدة"
        ) : null,
        chaps.length > 0 && typeof handleClearAllChapters === "function" && !batchProgress ? React.createElement(
          "button",
          {
            type: "button",
            onClick: handleClearAllChapters,
            className: "inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800 transition-all active:scale-95"
          },
          "🗑️ مسح الفصول والبدء من جديد"
        ) : null,
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleOpenAddChapter,
            disabled: !!batchProgress,
            className: "inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold active:scale-95 transition-all"
          },
          "➕ إضافة فصل يدوي"
        )
      ) : null
    ),

    // لوحة شريط التقدم والوقت للاستخراج الجماعي (Batch Progress Dashboard)
    batchProgress ? React.createElement(
      "div",
      { className: "p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-slate-900 text-white border border-emerald-500/40 shadow-xl space-y-3 animate-fade-in" },
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2" },
        React.createElement("div", { className: "flex items-center gap-2 min-w-0" },
          React.createElement("span", { className: "text-lg animate-spin" }, "⚙️"),
          React.createElement("div", null,
            React.createElement("h5", { className: "font-black text-xs sm:text-sm text-emerald-300 truncate" },
              "استخراج جماعي: فصل (" + batchProgress.currentChapterIndex + " من " + batchProgress.totalChapters + ") - " + batchProgress.currentChapterTitle
            ),
            React.createElement("p", { className: "text-[11px] text-slate-300" },
              "جاري معالجة صفحة PDF رقم " + batchProgress.currentPage + "..."
            )
          )
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleStopBatchExtraction,
            className: "px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 self-start sm:self-auto"
          },
          "⏹️ إيقاف وحفظ ما تم"
        )
      ),

      // شريط النسبة المئوية
      React.createElement(
        "div",
        { className: "space-y-1.5" },
        React.createElement(
          "div",
          { className: "flex justify-between text-[11px] font-bold" },
          React.createElement("span", { className: "text-emerald-400" }, "التقدم الكلي: " + batchProgress.percent + "% (" + batchProgress.pagesDone + " / " + batchProgress.totalPages + " صفحة)"),
          React.createElement("span", { className: "text-slate-300" }, "متبقي حوالي: " + formatSecs(batchProgress.remainingSeconds))
        ),
        React.createElement(
          "div",
          { className: "w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700" },
          React.createElement("div", {
            className: "bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300",
            style: { width: Math.max(3, batchProgress.percent) + "%" }
          })
        )
      ),

      // بطاقات إحصائيات الوقت
      React.createElement(
        "div",
        { className: "grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]" },
        React.createElement("div", { className: "p-2 rounded-xl bg-slate-800/80 border border-slate-700/60" },
          React.createElement("span", { className: "text-slate-400 block text-[10px]" }, "⏱️ الوقت المستغرق:"),
          React.createElement("span", { className: "font-bold text-white font-mono" }, formatSecs(batchProgress.elapsedSeconds))
        ),
        React.createElement("div", { className: "p-2 rounded-xl bg-slate-800/80 border border-slate-700/60" },
          React.createElement("span", { className: "text-slate-400 block text-[10px]" }, "⏳ الوقت المتبقي المقدر:"),
          React.createElement("span", { className: "font-bold text-emerald-300 font-mono" }, formatSecs(batchProgress.remainingSeconds))
        ),
        React.createElement("div", { className: "p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 col-span-2 sm:col-span-1" },
          React.createElement("span", { className: "text-slate-400 block text-[10px]" }, "💾 الحفظ السحابي:"),
          React.createElement("span", { className: "font-bold text-teal-300" }, "تلقائي وفوري لكل فصل ✓")
        )
      )
    ) : null,

    // مشغل الصوت للفصل النشط (مع وضع عائم أنيق للموبايل)
    playingChapterId && (function() {
      var activeChap = chaps.find(function(c) { return c.id === playingChapterId; });
      if (!activeChap) return null;
      return React.createElement(
        "div",
        { className: "p-3 sm:p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white border border-blue-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in fixed bottom-16 inset-x-3 sm:static sm:bottom-auto sm:inset-x-auto z-40" },
        React.createElement(
          "div",
          { className: "flex items-center gap-3 w-full sm:w-auto min-w-0" },
          React.createElement("span", { className: "w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-lg animate-pulse shrink-0" }, "🎵"),
          React.createElement("div", { className: "min-w-0 flex-1" },
            React.createElement("div", { className: "font-black text-xs sm:text-sm text-white truncate" }, "جاري تشغيل: " + activeChap.title),
            React.createElement("div", { className: "text-[11px] text-blue-300 flex items-center gap-2" },
              React.createElement("span", null, "صفحة PDF " + (activeChap.startPage || 1)),
              React.createElement("button", {
                type: "button",
                onClick: function() { handlePageChange(activeChap.startPage || 1); },
                className: "text-[10px] underline text-blue-200 hover:text-white"
              }, "انتقل للصفحة")
            )
          )
        ),
        React.createElement(
          "div",
          { className: "w-full sm:w-auto flex items-center gap-2 shrink-0" },
          React.createElement("audio", {
            ref: chapterAudioRef,
            src: utils.getAudioStreamUrl(activeChap.audioUrl),
            controls: true,
            autoPlay: true,
            className: "h-9 w-full sm:w-64 accent-blue-500"
          }),
          React.createElement("button", {
            type: "button",
            onClick: function() {
              if (chapterAudioRef.current) chapterAudioRef.current.pause();
              setPlayingChapterId(null);
            },
            className: "p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          }, "✕")
        )
      );
    })(),

    // قائمة الفصول
    chaps.length === 0 ? React.createElement(
      "div",
      { className: "text-center py-10 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
      React.createElement("span", { className: "text-4xl block" }, "📁"),
      React.createElement("h5", { className: "font-bold text-slate-700 dark:text-slate-200 text-sm" }, "لم يتم إضافة فصول صوتية لهذا الكتاب حتى الآن"),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-md mx-auto" },
        "يمكن للمسؤول استخراج نص المقدمة أو أي فصل عبر الأداة، وتحويله لصوت ثم رفعه هنا ليظهر للدارسين كقائمة متسلسلة."
      ),
      currentUser && currentUser.role === "admin" ? React.createElement(
        "button",
        {
          type: "button",
          onClick: handleOpenAddChapter,
          className: "mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all"
        },
        "➕ إضافة أول فصل (مثلاً: المقدمة)"
      ) : null
    ) : React.createElement(
      "div",
      { className: "space-y-3" },
      chaps.map(function(chap, idx) {
        var isThisPlaying = playingChapterId === chap.id;
        var isExtractingThis = extractingChapterId === chap.id;
        return React.createElement(
          "div",
          {
            key: chap.id,
            className: "p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 " +
              (isThisPlaying ? "border-blue-500 shadow-md ring-2 ring-blue-500/20" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm")
          },
          React.createElement(
            "div",
            { className: "flex items-start gap-3" },
            React.createElement("span", { className: "w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 " + (isThisPlaying ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300") },
              (idx + 1)
            ),
            React.createElement(
              "div",
              { className: "space-y-1" },
              React.createElement("h5", { className: "font-bold text-sm text-slate-900 dark:text-white" }, chap.title),
              React.createElement(
                "div",
                { className: "flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400" },
                React.createElement("button", {
                  type: "button",
                  onClick: function() { handlePageChange(chap.startPage || 1); },
                  className: "hover:text-blue-600 font-bold underline flex items-center gap-1"
                }, "📖 صفحة PDF رقم " + (chap.startPage || 1)),
                chap.audioUrl ? React.createElement("span", { className: "text-emerald-600 dark:text-emerald-400 font-bold" }, "• أوديو MP3 متاح ✓") : null,
                chap.text ? React.createElement("span", { className: "text-blue-600 dark:text-blue-400 font-bold" }, "• نص مفرغ متاح (" + (chap.text.length) + " حرف) ✓") : null
              )
            )
          ),
          React.createElement(
            "div",
            { className: "flex flex-wrap items-center gap-2 self-end md:self-auto shrink-0" },

            // 1. زر استخراج النص الكامل بالذكاء الاصطناعي (OCR) للأدمن
            currentUser && currentUser.role === "admin" && React.createElement("button", {
              type: "button",
              onClick: function() { handleExtractChapterText && handleExtractChapterText(chap); },
              disabled: isExtractingThis,
              className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs " +
                (chap.text
                  ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 active:scale-95"),
              title: "استخراج وقراءة نص صفحات هذا الفصل بالكامل من الكتاب لنسخه"
            },
            React.createElement("span", null, isExtractingThis ? "⏳" : "⚡"),
            React.createElement("span", null, isExtractingThis ? (extractStatusText || "جاري الاستخراج...") : (chap.text ? "إعادة استخراج النص" : "استخراج نص الفصل بالـ AI"))
            ),

            // 2. زر عرض ونسخ النص المفرغ
            chap.text ? React.createElement("button", {
              type: "button",
              onClick: function() { setViewingChapterText(chap); },
              className: "px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all flex items-center gap-1",
              title: "فتح النص المفرغ لنسخه وتحويله إلى صوت على Edge-TTS"
            },
            React.createElement("span", null, "📄"),
            React.createElement("span", null, "عرض ونسخ النص")
            ) : null,

            // 3. زر الاستماع للصوت إذا كان متاحاً
            chap.audioUrl ? React.createElement("button", {
              type: "button",
              onClick: function() {
                if (isThisPlaying) {
                  if (chapterAudioRef.current) chapterAudioRef.current.pause();
                  setPlayingChapterId(null);
                } else {
                  setPlayingChapterId(chap.id);
                }
              },
              className: "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 " +
                (isThisPlaying ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95"),
              title: "تشغيل ملف الصوت للفصل"
            }, isThisPlaying ? "⏸️ إيقاف" : "▶️ استماع") : null,

            // 4. زر رفع / تعديل ملف الصوت للفصل للأدمن
            currentUser && currentUser.role === "admin" && React.createElement("button", {
              type: "button",
              onClick: function() { handleOpenEditChapter(chap); },
              className: "px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1 border border-slate-200 dark:border-slate-700",
              title: chap.audioUrl ? "تعديل بيانات الفصل أو الصوت" : "رفع ملف صوت الفصل (MP3)"
            },
            React.createElement("span", null, chap.audioUrl ? "✏️" : "🎵"),
            React.createElement("span", null, chap.audioUrl ? "تعديل" : "رفع الصوت (MP3)")
            ),

            // 5. زر حذف الفصل
            currentUser && currentUser.role === "admin" ? React.createElement("button", {
              type: "button",
              onClick: function() { handleDeleteChapter(chap.id); },
              className: "p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs transition-all",
              title: "حذف هذا الفصل من القائمة"
            }, "🗑️") : null
          )
        );
      })
    )
  );
};
