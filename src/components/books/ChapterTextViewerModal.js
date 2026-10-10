// مودال عرض النص المفرغ للفصل مع مشغل صوت مدمج متزامن للقراءة والاستماع على الموبايل
window.ChapterTextViewerModal = function(props) {
  var viewingChapterText = props.viewingChapterText;
  var onClose = props.onClose;
  var fontSize = props.fontSize || 15;
  var onFontSizeChange = props.onFontSizeChange;
  var activeBook = props.activeBook;
  var playingChapterId = props.playingChapterId;
  var setPlayingChapterId = props.setPlayingChapterId;
  var chapterAudioRef = props.chapterAudioRef;
  var setViewingChapterText = props.setViewingChapterText;
  var isPlaylistMode = props.isPlaylistMode !== undefined ? props.isPlaylistMode : true;
  var setIsPlaylistMode = props.setIsPlaylistMode;

  if (!viewingChapterText) return null;

  var utils = window.APP_UTILS || {};
  var allChaps = (activeBook && activeBook.audioChapters) || [];
  var allAudioChaps = allChaps.filter(function(c) { return c.audioUrl && c.audioUrl.trim(); });
  var curAudioIdx = allAudioChaps.findIndex(function(c) { return c.id === viewingChapterText.id; });
  var hasAudio = !!(viewingChapterText.audioUrl && viewingChapterText.audioUrl.trim());
  var isPlayingThis = playingChapterId === viewingChapterText.id;

  var [localProgress, setLocalProgress] = React.useState(0);
  var [localDuration, setLocalDuration] = React.useState(0);
  var [localIsPlaying, setLocalIsPlaying] = React.useState(false);
  var [localSpeed, setLocalSpeed] = React.useState(1);

  React.useEffect(function() {
    var audio = chapterAudioRef && chapterAudioRef.current;
    if (!audio) return;
    var onTime = function() { setLocalProgress(audio.currentTime); };
    var onMeta = function() { setLocalDuration(audio.duration || 0); };
    var onPlay = function() { setLocalIsPlaying(true); };
    var onPause = function() { setLocalIsPlaying(false); };
    var onRate = function() { setLocalSpeed(audio.playbackRate); };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ratechange", onRate);

    setLocalIsPlaying(!audio.paused);
    setLocalProgress(audio.currentTime);
    setLocalDuration(audio.duration || 0);
    setLocalSpeed(audio.playbackRate || 1);

    return function() {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ratechange", onRate);
    };
  }, [playingChapterId, chapterAudioRef]);

  var canGoPrev = curAudioIdx > 0;
  var canGoNext = curAudioIdx >= 0 && curAudioIdx < allAudioChaps.length - 1;

  var handlePrevTrack = function() {
    if (canGoPrev) {
      var prevChap = allAudioChaps[curAudioIdx - 1];
      if (setViewingChapterText) setViewingChapterText(prevChap);
      if (setPlayingChapterId) setPlayingChapterId(prevChap.id);
    }
  };

  var handleNextTrack = function() {
    if (canGoNext) {
      var nextChap = allAudioChaps[curAudioIdx + 1];
      if (setViewingChapterText) setViewingChapterText(nextChap);
      if (setPlayingChapterId) setPlayingChapterId(nextChap.id);
    }
  };

  var handleTogglePlay = function() {
    if (!isPlayingThis) {
      if (setPlayingChapterId) setPlayingChapterId(viewingChapterText.id);
    } else if (chapterAudioRef && chapterAudioRef.current) {
      if (chapterAudioRef.current.paused) chapterAudioRef.current.play();
      else chapterAudioRef.current.pause();
    }
  };

  var formatTime = function(sec) {
    if (!sec || isNaN(sec)) return "00:00";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  };

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in",
      onClick: onClose
    },
    React.createElement(
      "div",
      {
        className: "bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3 max-h-[92vh] sm:max-h-[88vh] flex flex-col",
        onClick: function(e) { e.stopPropagation(); }
      },
      // ترويسة النافذة
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800 shrink-0 gap-2" },
        React.createElement("div", { className: "min-w-0 flex-1" },
          React.createElement("h3", { className: "font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2 truncate" },
            "📄 " + viewingChapterText.title
          ),
          React.createElement("span", { className: "text-[11px] text-slate-500 dark:text-slate-400 block" },
            (activeBook ? activeBook.title + " • " : "") + "صفحة PDF " + (viewingChapterText.startPage || 1)
          )
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2 shrink-0" },
          // أزرار تكبير وتصغير حجم خط القراءة للموبايل
          React.createElement(
            "div",
            { className: "flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-bold" },
            React.createElement("button", {
              type: "button",
              onClick: function() { if (onFontSizeChange) onFontSizeChange(Math.max(13, fontSize - 1)); },
              title: "تصغير الخط",
              className: "w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 active:scale-90 transition-all text-slate-600 dark:text-slate-300"
            }, "A-"),
            React.createElement("span", { className: "px-1.5 font-mono text-[11px] text-slate-400" }, fontSize + "px"),
            React.createElement("button", {
              type: "button",
              onClick: function() { if (onFontSizeChange) onFontSizeChange(Math.min(24, fontSize + 1)); },
              title: "تكبير الخط",
              className: "w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 active:scale-90 transition-all text-slate-600 dark:text-slate-300"
            }, "A+")
          ),
          React.createElement("button", {
            type: "button",
            onClick: onClose,
            className: "w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center text-sm"
          }, "✕")
        )
      ),

      // مشغل الصوت المدمج المتزامن داخل شاشة القراءة (Audio-Reader Toolbar)
      hasAudio ? (
        isPlayingThis ? React.createElement(
          "div",
          { className: "p-3 rounded-2xl bg-slate-950 text-white border border-indigo-500/40 shadow-lg space-y-2.5 shrink-0" },
          // السطر العلوي: رقم التراك وحالة الـ Playlist المتتالية
          React.createElement(
            "div",
            { className: "flex items-center justify-between text-xs gap-2 flex-wrap" },
            React.createElement("div", { className: "flex items-center gap-2 font-bold text-indigo-300 text-[11px] sm:text-xs" },
              React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }),
              React.createElement("span", null, "🎧 استماع وقراءة متزامنة:"),
              curAudioIdx >= 0 ? React.createElement("span", { className: "text-amber-300" }, "تراك (" + (curAudioIdx + 1) + " من " + allAudioChaps.length + ")") : null
            ),
            React.createElement("div", { className: "flex items-center gap-2" },
              setIsPlaylistMode ? React.createElement("button", {
                type: "button",
                onClick: function() { setIsPlaylistMode(!isPlaylistMode); },
                className: "px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 " +
                  (isPlaylistMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-slate-800 text-slate-400 border-slate-700"),
                title: isPlaylistMode ? "التشغيل المتتالي مفعل" : "التشغيل المتتالي متوقف"
              }, "🔁 " + (isPlaylistMode ? "قائمة متتالية" : "فردي")) : null,
              React.createElement("div", { className: "flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/60 text-[10px] text-slate-300" },
                React.createElement("span", null, localSpeed.toFixed(1) + "x"),
                React.createElement("input", {
                  type: "range",
                  min: 0.5,
                  max: 2,
                  step: 0.1,
                  value: localSpeed,
                  onChange: function(e) {
                    var sp = parseFloat(e.target.value);
                    if (chapterAudioRef && chapterAudioRef.current) {
                      chapterAudioRef.current.playbackRate = sp;
                      setLocalSpeed(sp);
                    }
                  },
                  className: "w-12 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-amber-500"
                })
              )
            )
          ),

          // شريط التقدم والوقت
          React.createElement(
            "div",
            { className: "flex items-center gap-2 text-xs" },
            React.createElement("span", { className: "text-indigo-200 tabular-nums text-[11px]" }, formatTime(localProgress)),
            React.createElement("input", {
              type: "range",
              min: 0,
              max: localDuration || 100,
              value: localProgress || 0,
              onChange: function(e) {
                var pos = parseFloat(e.target.value);
                if (chapterAudioRef && chapterAudioRef.current) {
                  chapterAudioRef.current.currentTime = pos;
                  setLocalProgress(pos);
                }
              },
              className: "flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            }),
            React.createElement("span", { className: "text-slate-400 tabular-nums text-[11px]" }, formatTime(localDuration))
          ),

          // أزرار التحكم بالصوت والتنقل بين التراكات
          React.createElement(
            "div",
            { className: "flex items-center justify-center gap-2 sm:gap-3" },
            React.createElement("button", {
              type: "button",
              onClick: handlePrevTrack,
              disabled: !canGoPrev,
              className: "p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-25",
              title: "الفصل الصوتي السابق"
            }, "⏮️"),
            React.createElement("button", {
              type: "button",
              onClick: function() {
                if (chapterAudioRef && chapterAudioRef.current) chapterAudioRef.current.currentTime -= 10;
              },
              className: "p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs font-bold",
              title: "تأخير 10 ثواني"
            }, "⏪ 10-"),
            React.createElement("button", {
              type: "button",
              onClick: handleTogglePlay,
              className: "w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center text-lg shadow-lg shadow-blue-600/30 active:scale-95 transition-all",
              title: localIsPlaying ? "إيقاف مؤقت" : "متابعة التشغيل"
            }, localIsPlaying ? "⏸️" : "▶️"),
            React.createElement("button", {
              type: "button",
              onClick: function() {
                if (chapterAudioRef && chapterAudioRef.current) chapterAudioRef.current.currentTime += 10;
              },
              className: "p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs font-bold",
              title: "تقديم 10 ثواني"
            }, "+10 ⏩"),
            React.createElement("button", {
              type: "button",
              onClick: handleNextTrack,
              disabled: !canGoNext,
              className: "p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-25",
              title: "الفصل الصوتي التالي"
            }, "⏭️")
          )
        ) : React.createElement(
          "div",
          { className: "p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 flex items-center justify-between gap-3 shrink-0" },
          React.createElement("div", { className: "flex items-center gap-2.5 min-w-0" },
            React.createElement("span", { className: "text-xl shrink-0" }, "🎙️"),
            React.createElement("div", { className: "min-w-0" },
              React.createElement("span", { className: "text-xs font-bold text-white block truncate" }, "التسجيل الصوتي متاح لهذا الفصل"),
              React.createElement("span", { className: "text-[11px] text-indigo-200 block" }, "اضغط للاستماع أثناء قراءة النص بالتزامن")
            )
          ),
          React.createElement("button", {
            type: "button",
            onClick: handleTogglePlay,
            className: "px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
          }, "▶️ تشغيل الصوت")
        )
      ) : null,

      // مساحة قراءة النص التفاعلية مع دعم التمرير السلس للموبايل
      React.createElement(
        "div",
        {
          className: "overflow-y-auto flex-1 p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-loose font-sans whitespace-pre-wrap select-text selection:bg-blue-600 selection:text-white",
          style: { fontSize: fontSize + "px" }
        },
        viewingChapterText.text
      ),

      // شريط الأزرار السفلي
      React.createElement(
        "div",
        { className: "flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0 gap-2" },
        React.createElement("button", {
          type: "button",
          onClick: function() {
            navigator.clipboard.writeText(viewingChapterText.text);
            alert("تم نسخ نص الفصل بالكامل ✓");
          },
          className: "px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center gap-1.5 active:scale-95 transition-all"
        }, "📋 نسخ النص"),
        React.createElement("button", {
          type: "button",
          onClick: onClose,
          className: "px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95 transition-all"
        }, "إغلاق")
      )
    )
  );
};
