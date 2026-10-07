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
  var singleExtractProgress = props.singleExtractProgress;
  var handleMoveChapter = props.handleMoveChapter;

  var utils = window.APP_UTILS;
  var chaps = (activeBook && activeBook.audioChapters) || [];
  var [audioProgress, setAudioProgress] = React.useState(0);
  var [audioDuration, setAudioDuration] = React.useState(0);
  var [audioSpeed, setAudioSpeed] = React.useState(1);
  var [isAudioPlaying, setIsAudioPlaying] = React.useState(false);
  var [audioHasError, setAudioHasError] = React.useState(false);
  var [useIframePlayer, setUseIframePlayer] = React.useState(false);

  React.useEffect(function() {
    var audio = chapterAudioRef.current;
    if (!audio) return;

    var updateProgress = function() { setAudioProgress(audio.currentTime); };
    var updateDuration = function() { setAudioDuration(audio.duration); };
    var updatePlayState = function() { setIsAudioPlaying(!audio.paused); };
    var updateSpeed = function() { setAudioSpeed(audio.playbackRate); };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("play", updatePlayState);
    audio.addEventListener("pause", updatePlayState);
    audio.addEventListener("ratechange", updateSpeed);

    return function() {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("play", updatePlayState);
      audio.removeEventListener("pause", updatePlayState);
      audio.removeEventListener("ratechange", updateSpeed);
    };
      setAudioHasError(false);
  }, [playingChapterId, chapterAudioRef]);

  var formatTime = function(sec) {
    if (isNaN(sec)) return "00:00";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? "0"+m : m) + ":" + (s < 10 ? "0"+s : s);
  };

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
        chaps.length > 0 && typeof handleBatchExtractAllChapters === "function" ? (function() {
          var unextractedCount = chaps.filter(function(c) { return !utils.isChapterComplete(c); }).length;
          var btnLabel = batchProgress ? "⏳ جاري الاستخراج الجماعي..."
            : (unextractedCount < chaps.length && unextractedCount > 0)
              ? ("📦 استئناف استخراج باقي الفصول (" + unextractedCount + " متبقية)")
              : (unextractedCount === 0)
                ? "✓ اكتمل استخراج جميع الفصول"
                : "📦 استخراج كل الفصول دفعة واحدة";
          return React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { handleBatchExtractAllChapters(); },
              disabled: isAiAnalyzingBook || !!batchProgress,
              className: "inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
            },
            btnLabel
          );
        })() : null,
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
        useIframePlayer ? React.createElement(
          "div",
          { className: "w-full sm:flex-1 flex flex-col gap-1.5 mt-2 sm:mt-0" },
          React.createElement("iframe", {
            src: utils.getMediaEmbedUrl(activeChap.audioUrl),
            className: "w-full h-14 rounded-xl border border-slate-700 bg-black shadow-inner",
            allow: "autoplay"
          }),
          React.createElement("div", { className: "flex justify-between items-center text-[11px]" },
            React.createElement("span", { className: "text-emerald-400 font-bold flex items-center gap-1" }, "✓ مشغل Google Drive الرسمي المباشر"),
            React.createElement("button", {
              type: "button",
              onClick: function() { setUseIframePlayer(false); },
              className: "text-blue-300 hover:text-white underline font-bold"
            }, "العودة للمشغل المتقدم ↺")
          )
        ) : React.createElement(
          "div",
          { className: "w-full flex flex-col gap-2 mt-2 sm:mt-0 sm:flex-1 min-w-[200px]" },
          
          // Audio element hidden
          React.createElement("audio", {
            ref: chapterAudioRef,
            src: utils.getAudioStreamUrl(activeChap.audioUrl),
            controls: false,
            autoPlay: true,
            className: "hidden",
            onError: function() { setAudioHasError(true); }
          }),

          // Error Banner with 1-click fallback
          audioHasError ? React.createElement(
            "div",
            { className: "p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2" },
            React.createElement("span", { className: "text-[11px]" }, "⚠️ جوجل تمنع البث المباشر. اضغط للتبديل:"),
            React.createElement("button", {
              type: "button",
              onClick: function() { setUseIframePlayer(true); },
              className: "px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-lg text-xs transition-all shadow-sm shrink-0"
            }, "مشغل Google المباشر ↗")
          ) : null,
          
          // Progress Bar & Time
          React.createElement("div", { className: "flex items-center gap-2 text-xs" },
            React.createElement("span", { className: "text-blue-200 tabular-nums" }, formatTime(audioProgress)),
            React.createElement("input", {
              type: "range",
              min: 0,
              max: audioDuration || 100,
              value: audioProgress || 0,
              onChange: function(e) {
                if (chapterAudioRef.current) {
                  chapterAudioRef.current.currentTime = parseFloat(e.target.value);
                }
              },
              className: "flex-1 h-2 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
            }),
            React.createElement("span", { className: "text-slate-400 tabular-nums" }, formatTime(audioDuration))
          ),
          
          // Controls
          React.createElement("div", { className: "flex items-center justify-between gap-4" },
            // Speed Slider + Drive link
            React.createElement("div", { className: "flex items-center gap-2" },
              React.createElement("div", { className: "flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50" },
                React.createElement("span", { className: "font-bold w-6" }, audioSpeed.toFixed(1) + "x"),
                React.createElement("input", {
                  type: "range",
                  min: 0.5,
                  max: 2,
                  step: 0.1,
                  value: audioSpeed,
                  onChange: function(e) {
                    if (chapterAudioRef.current) {
                      chapterAudioRef.current.playbackRate = parseFloat(e.target.value);
                    }
                  },
                  className: "w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                })
              ),
              React.createElement("button", {
                type: "button",
                onClick: function() { setUseIframePlayer(true); },
                className: "text-[10px] text-slate-400 hover:text-blue-300 underline hidden sm:inline"
              }, "مشغل Google ↗")
            ),
            
            // Playback Buttons
            React.createElement("div", { className: "flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-full border border-slate-700/50 shadow-inner" },
              React.createElement("button", {
                type: "button",
                onClick: function() { if (chapterAudioRef.current) chapterAudioRef.current.currentTime -= 10; },
                className: "p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all",
                title: "تأخير 10 ثواني"
              }, "⏪"),
              React.createElement("button", {
                type: "button",
                onClick: function() { 
                  if (chapterAudioRef.current) {
                    if (chapterAudioRef.current.paused) chapterAudioRef.current.play();
                    else chapterAudioRef.current.pause();
                  }
                },
                className: "p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center w-10 h-10 text-lg"
              }, isAudioPlaying ? "⏸️" : "▶️"),
              React.createElement("button", {
                type: "button",
                onClick: function() { if (chapterAudioRef.current) chapterAudioRef.current.currentTime += 10; },
                className: "p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all",
                title: "تقديم 10 ثواني"
              }, "⏩")
            )
          )
        ),
          // Close button
          React.createElement("button", {
            type: "button",
            onClick: function() {
              if (chapterAudioRef.current) chapterAudioRef.current.pause();
              setPlayingChapterId(null);
            },
            className: "p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/30 hover:text-rose-200 transition-all ml-1 self-start sm:self-center"
          }, "✕")
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

        var currentChapProgress = null;
        if (isExtractingThis) {
          if (batchProgress && (batchProgress.currentChapterId === chap.id || batchProgress.currentChapterIndex === (idx + 1))) {
            currentChapProgress = {
              percent: batchProgress.chapterPercent !== undefined ? batchProgress.chapterPercent : 0,
              currentPage: batchProgress.chapterCurrentPage || batchProgress.currentPage,
              totalPages: batchProgress.chapterTotalPages || 1,
              pageIndex: batchProgress.chapterPageIndex || 1,
              remainingPages: batchProgress.chapterRemainingPages !== undefined ? batchProgress.chapterRemainingPages : Math.max(0, (batchProgress.chapterTotalPages || 1) - (batchProgress.chapterPageIndex || 1))
            };
          } else if (singleExtractProgress && singleExtractProgress.chapterId === chap.id) {
            currentChapProgress = singleExtractProgress;
          }
        }

        return React.createElement(
          "div",
          {
            key: chap.id,
            className: "p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 " +
              (isThisPlaying ? "border-blue-500 shadow-md ring-2 ring-blue-500/20" : isExtractingThis ? "border-emerald-500/70 shadow-md ring-2 ring-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm")
          },
          React.createElement(
            "div",
            { className: "flex items-start gap-3 flex-1 min-w-0" },
            React.createElement(
              "div",
              { className: "flex flex-col items-center gap-1 shrink-0" },
              React.createElement("span", { className: "w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs " + (isThisPlaying ? "bg-blue-600 text-white" : isExtractingThis ? "bg-emerald-600 text-white animate-pulse" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300") },
                isExtractingThis ? "⏳" : (idx + 1)
              ),
              currentUser && currentUser.role === "admin" ? React.createElement(
                "div",
                { className: "flex items-center gap-0.5" },
                idx > 0 ? React.createElement("button", {
                  type: "button",
                  onClick: function() { handleMoveChapter && handleMoveChapter(idx, -1); },
                  className: "w-4 h-4 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[9px] font-black transition-all",
                  title: "تقديم الترتيب لأعلى ⬆️"
                }, "▲") : null,
                idx < chaps.length - 1 ? React.createElement("button", {
                  type: "button",
                  onClick: function() { handleMoveChapter && handleMoveChapter(idx, 1); },
                  className: "w-4 h-4 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[9px] font-black transition-all",
                  title: "تأخير الترتيب لأسفل ⬇️"
                }, "▼") : null
              ) : null
            ),
            React.createElement(
              "div",
              { className: "space-y-1.5 flex-1 min-w-0" },
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
                chap.text ? (
                  !utils.isChapterComplete(chap) ? React.createElement("span", { className: "text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800" },
                    "• استخراج جزئي (صفحة " + (chap.lastExtractedPage || chap.startPage) + " من " + (chap.endPage || chap.startPage) + ") ⚠️"
                  ) : React.createElement("span", { className: "text-blue-600 dark:text-blue-400 font-bold" },
                    "• نص مفرغ متاح (" + (chap.text.length) + " حرف) ✓"
                  )
                ) : null
              ),

              // شريط تقدم تفريغ هذا الفصل بالنسبة المئوية
              isExtractingThis && currentChapProgress ? React.createElement(
                "div",
                { className: "mt-2.5 p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-500/30 space-y-1.5 animate-fade-in" },
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between text-xs flex-wrap gap-1" },
                  React.createElement("div", { className: "flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300" },
                    React.createElement("span", { className: "animate-spin inline-block text-[11px]" }, "⚙️"),
                    React.createElement("span", null, "نسبة إنجاز هذا الفصل:"),
                    React.createElement("span", { className: "font-mono font-black text-white px-2 py-0.5 rounded-md bg-emerald-600 dark:bg-emerald-500 text-xs shadow-xs" },
                      currentChapProgress.percent + "%"
                    )
                  ),
                  React.createElement("div", { className: "text-[11px] text-slate-700 dark:text-slate-300 font-bold" },
                    "صفحة " + currentChapProgress.currentPage + " (فاضل " + currentChapProgress.remainingPages + " من " + currentChapProgress.totalPages + " صفحة)"
                  )
                ),
                React.createElement(
                  "div",
                  { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden border border-emerald-500/20" },
                  React.createElement("div", {
                    className: "bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300",
                    style: { width: Math.max(5, currentChapProgress.percent) + "%" }
                  })
                ),
                currentChapProgress.remainingPages <= 2 ? React.createElement(
                  "p",
                  { className: "text-[10px] text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1 pt-0.5" },
                  "⏳ أوشك هذا الفصل على الانتهاء! فاضل " + currentChapProgress.remainingPages + " صفحة فقط - ننصح بالانتظار لحظات ليتم حفظه تلقائيًا."
                ) : currentChapProgress.percent <= 25 ? React.createElement(
                  "p",
                  { className: "text-[10px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1 pt-0.5" },
                  "💡 الفصل في بدايته (صفحة " + currentChapProgress.pageIndex + " من " + currentChapProgress.totalPages + ") - يمكنك إيقاف الاستخراج بأمان إن أردت."
                ) : null
              ) : null
            )
          ),
          React.createElement(
            "div",
            { className: "flex flex-wrap items-center gap-2 self-end md:self-auto shrink-0" },

            // 1. زر استخراج أو استئناف النص بالذكاء الاصطناعي للأدمن
            currentUser && currentUser.role === "admin" && (function() {
              var isComplete = utils.isChapterComplete(chap);
              var isPartial = !isComplete && chap.lastExtractedPage && chap.lastExtractedPage >= (chap.startPage || 1);
              var btnTitle = isPartial
                ? ("▶️ استئناف من صفحة " + (chap.lastExtractedPage + 1))
                : (chap.text ? "إعادة استخراج النص" : "استخراج نص الفصل بالـ AI");
              var btnBg = isExtractingThis
                ? "bg-emerald-600 text-white shadow-emerald-500/20"
                : (isPartial
                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/25 active:scale-95"
                    : (chap.text
                        ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 active:scale-95"));

              return React.createElement("button", {
                type: "button",
                onClick: function() { handleExtractChapterText && handleExtractChapterText(chap); },
                disabled: isExtractingThis,
                className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs " + btnBg,
                title: isPartial ? "استئناف استخراج باقي صفحات هذا الفصل بدءاً من صفحة " + (chap.lastExtractedPage + 1) : "استخراج وقراءة نص صفحات هذا الفصل بالكامل من الكتاب لنسخه"
              },
              React.createElement("span", null, isExtractingThis ? "⏳" : (isPartial ? "▶️" : "⚡")),
              React.createElement("span", null, isExtractingThis ? (currentChapProgress ? ("جاري الاستخراج: " + currentChapProgress.percent + "%") : (extractStatusText || "جاري الاستخراج...")) : btnTitle)
              );
            })(),

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

            // 4. زر تعديل بيانات الفصل للأدمن (متاح دائماً لتعديل العنوان وأرقام الصفحات والصوت)
            currentUser && currentUser.role === "admin" && React.createElement("button", {
              type: "button",
              onClick: function() { handleOpenEditChapter(chap); },
              className: "px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold transition-all flex items-center gap-1 border border-slate-200 dark:border-slate-700",
              title: "تعديل اسم الفصل أو أرقام صفحاته أو الصوت"
            },
            React.createElement("span", null, "✏️"),
            React.createElement("span", null, "تعديل")
            ),

            // 5. زر حذف الفصل واضح ومميز للأدمن
            currentUser && currentUser.role === "admin" && React.createElement("button", {
              type: "button",
              onClick: function() { handleDeleteChapter(chap.id); },
              className: "px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1 border border-rose-200 dark:border-rose-800/60 shadow-xs",
              title: "حذف هذا الفصل من القائمة نهائياً"
            },
            React.createElement("span", null, "🗑️"),
            React.createElement("span", null, "حذف")
            )
          )
        );
      })
    )
  );
};

