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

  var utils = window.APP_UTILS;
  var chaps = (activeBook && activeBook.audioChapters) || [];

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
            disabled: isAiAnalyzingBook,
            className: "inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all"
          },
          isAiAnalyzingBook ? "⏳ جاري فحص الفهرس..." : "🪄 فحص الفهرس بالـ AI"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleOpenAddChapter,
            className: "inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          },
          "➕ إضافة فصل يدوي"
        )
      ) : null
    ),

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
            { className: "flex items-center gap-2 self-end md:self-auto shrink-0" },
            chap.text ? React.createElement("button", {
              type: "button",
              onClick: function() { setViewingChapterText(chap); },
              className: "px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1"
            }, "📄 عرض النص") : null,
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
                (isThisPlaying ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20")
            }, isThisPlaying ? "⏸️ إيقاف" : "▶️ استماع") : null,
            currentUser && currentUser.role === "admin" ? React.createElement("button", {
              type: "button",
              onClick: function() { handleOpenEditChapter(chap); },
              className: "p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            }, "✏️") : null,
            currentUser && currentUser.role === "admin" ? React.createElement("button", {
              type: "button",
              onClick: function() { handleDeleteChapter(chap.id); },
              className: "p-1.5 text-rose-400 hover:text-rose-600 text-xs"
            }, "🗑️") : null
          )
        );
      })
    )
  );
};
