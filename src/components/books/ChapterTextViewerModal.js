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

  var currentUser = props.currentUser;
  var onUpdateTimeOffset = props.onUpdateTimeOffset;

  var utils = window.APP_UTILS || {};
  var isAdmin = !!(currentUser && currentUser.role === "admin");
  var allChaps = (activeBook && activeBook.audioChapters) || [];
  var allAudioChaps = allChaps.filter(function(c) { return c.audioUrl && c.audioUrl.trim(); });
  var curAudioIdx = allAudioChaps.findIndex(function(c) { return c.id === viewingChapterText.id; });
  var hasAudio = !!(viewingChapterText.audioUrl && viewingChapterText.audioUrl.trim());
  var isPlayingThis = playingChapterId === viewingChapterText.id;

  var [localProgress, setLocalProgress] = React.useState(0);
  var [localDuration, setLocalDuration] = React.useState(0);
  var [localIsPlaying, setLocalIsPlaying] = React.useState(false);
  var [localSpeed, setLocalSpeed] = React.useState(1);
  var [autoScrollEnabled, setAutoScrollEnabled] = React.useState(true);
  var [isAudioCollapsed, setIsAudioCollapsed] = React.useState(function() {
    try {
      var saved = localStorage.getItem("counsel_reader_audio_collapsed");
      return saved !== null ? saved === "true" : false;
    } catch (e) {
      return false;
    }
  });

  // حالة إزاحة تزامن الصوت مع النص (Time Shift بالثواني مع الكسور مثل +1.5s أو -2s)
  var [timeOffset, setTimeOffset] = React.useState(function() {
    // 1. الأولوية للإعداد المحفوظ في الفصل سحابياً
    if (viewingChapterText && viewingChapterText.timeOffset !== undefined) {
      return parseFloat(viewingChapterText.timeOffset) || 0;
    }
    // 2. أو الإعداد المحفوظ محلياً على جهاز المستخدم لهذا الفصل
    try {
      var saved = localStorage.getItem("counsel_time_offset_" + (viewingChapterText ? viewingChapterText.id : ""));
      if (saved !== null && !isNaN(parseFloat(saved))) {
        return parseFloat(saved);
      }
    } catch (e) {}
    return 0;
  });

  var [showOffsetPanel, setShowOffsetPanel] = React.useState(false);
  var [isSavingOffset, setIsSavingOffset] = React.useState(false);
  var [offsetSavedNotice, setOffsetSavedNotice] = React.useState("");

  // تحديث الإزاحة عند تغيير الفصل
  React.useEffect(function() {
    if (viewingChapterText) {
      var defaultOffset = (viewingChapterText.timeOffset !== undefined) ? (parseFloat(viewingChapterText.timeOffset) || 0) : 0;
      try {
        var localVal = localStorage.getItem("counsel_time_offset_" + viewingChapterText.id);
        if (localVal !== null && !isNaN(parseFloat(localVal))) {
          defaultOffset = parseFloat(localVal);
        }
      } catch (e) {}
      setTimeOffset(defaultOffset);
    }
  }, [viewingChapterText && viewingChapterText.id]);

  var handleAdjustOffset = function(delta) {
    setTimeOffset(function(prev) {
      var nextVal = Math.round((prev + delta) * 10) / 10;
      try {
        if (viewingChapterText && viewingChapterText.id) {
          localStorage.setItem("counsel_time_offset_" + viewingChapterText.id, nextVal.toString());
        }
      } catch (e) {}
      return nextVal;
    });
  };

  var handleDirectOffsetChange = function(newVal) {
    var num = parseFloat(newVal);
    if (isNaN(num)) num = 0;
    num = Math.round(num * 10) / 10;
    setTimeOffset(num);
    try {
      if (viewingChapterText && viewingChapterText.id) {
        localStorage.setItem("counsel_time_offset_" + viewingChapterText.id, num.toString());
      }
    } catch (e) {}
  };

  var handleResetOffset = function() {
    setTimeOffset(0);
    try {
      if (viewingChapterText && viewingChapterText.id) {
        localStorage.removeItem("counsel_time_offset_" + viewingChapterText.id);
      }
    } catch (e) {}
  };

  var handleSaveOffsetForEveryone = async function() {
    if (!viewingChapterText || !onUpdateTimeOffset) return;
    setIsSavingOffset(true);
    try {
      await onUpdateTimeOffset(viewingChapterText.id, timeOffset);
      setOffsetSavedNotice("✅ تم حفظ التزامن لجميع الدارسين بنجاح!");
      setTimeout(function() { setOffsetSavedNotice(""); }, 3500);
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ السحابي: " + (err.message || err));
    } finally {
      setIsSavingOffset(false);
    }
  };

  var toggleAudioCollapse = function() {
    setIsAudioCollapsed(function(prev) {
      var nextVal = !prev;
      try {
        localStorage.setItem("counsel_reader_audio_collapsed", nextVal ? "true" : "false");
      } catch (e) {}
      return nextVal;
    });
  };

  var textContainerRef = React.useRef(null);

  // تقسيم نص الفصل إلى جُمل وعبارات دقيقة وقصيرة (سطر بسطر) للحفاظ على تركيز القارئ ودقة المتابعة
  var segments = React.useMemo(function() {
    var raw = (viewingChapterText && viewingChapterText.text) || "";
    if (!raw.trim()) return [];

    // 1. تقسيم مبدئي عند نهايات الجمل والأسطر (. أو ! أو ؟ أو \n)
    var rawParts = raw.split(/([.!?؟\n]+)/);
    var sentences = [];

    for (var i = 0; i < rawParts.length; i += 2) {
      var sText = (rawParts[i] || "").trim();
      var sPunct = (rawParts[i + 1] || "").trim();
      if (!sText && !sPunct) continue;
      var combined = (sText + (sPunct ? " " + sPunct : "")).trim();
      if (!combined) continue;

      // 2. إذا كانت الجملة طويلة (أكثر من 85 حرف) وبها فواصل (، أو ؛)، نقسمها لعبارات ألطف سطر بسطر
      if (combined.length > 85 && (combined.indexOf("،") !== -1 || combined.indexOf("؛") !== -1)) {
        var subParts = combined.split(/([،؛]+)/);
        var currentChunk = "";
        for (var j = 0; j < subParts.length; j += 2) {
          var cText = (subParts[j] || "").trim();
          var cPunct = (subParts[j + 1] || "").trim();
          var piece = (cText + (cPunct ? " " + cPunct : "")).trim();
          if (!piece) continue;

          if ((currentChunk.length + piece.length) > 85 && currentChunk.length >= 30) {
            sentences.push(currentChunk.trim());
            currentChunk = piece;
          } else {
            currentChunk = (currentChunk ? currentChunk + " " : "") + piece;
          }
        }
        if (currentChunk.trim()) {
          sentences.push(currentChunk.trim());
        }
      } else {
        sentences.push(combined);
      }
    }

    if (sentences.length === 0) {
      sentences = [raw.trim()];
    }

    // حساب الوزن النسبي لعدد الحروف في كل عبارة/سطر
    var totalChars = 0;
    for (var k = 0; k < sentences.length; k++) {
      totalChars += sentences[k].length;
    }
    if (totalChars === 0) totalChars = 1;

    var cumulative = 0;
    return sentences.map(function(itemText, idx) {
      var startRatio = cumulative / totalChars;
      cumulative += itemText.length;
      var endRatio = cumulative / totalChars;
      return {
        id: idx,
        text: itemText,
        startRatio: startRatio,
        endRatio: endRatio
      };
    });
  }, [viewingChapterText && viewingChapterText.text]);

  // تحديد الفقرة النشطة حالياً بناءً على موضع الصوت مع تطبيق الإزاحة الزمنية (Time Offset / Shift)
  var activeSegmentIdx = React.useMemo(function() {
    if (!isPlayingThis || !localDuration || segments.length === 0) return -1;
    // تطبيق الإزاحة: إذا كان النص سابق الصوت، نطرح الإزاحة لتأخير تحديد الفقرة، وإذا كان النص متأخراً نضيفها
    var effectiveTime = Math.max(0, Math.min(localDuration, localProgress - timeOffset));
    var ratio = effectiveTime / localDuration;
    for (var i = 0; i < segments.length; i++) {
      if (ratio >= segments[i].startRatio && ratio < segments[i].endRatio) {
        return i;
      }
    }
    return segments.length - 1;
  }, [isPlayingThis, localProgress, localDuration, segments, timeOffset]);

  // التمرير السلس للفقرة النشطة تلقائياً أثناء تشغيل الصوت
  React.useEffect(function() {
    if (autoScrollEnabled && isPlayingThis && activeSegmentIdx >= 0) {
      var targetEl = document.getElementById("chapter-segment-" + activeSegmentIdx);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeSegmentIdx, autoScrollEnabled, isPlayingThis]);

  // القفز في الصوت مباشرة للفقرة التي ينقر عليها المستخدم مع مراعاة الإزاحة
  var handleSegmentClick = function(seg) {
    if (chapterAudioRef && chapterAudioRef.current && localDuration > 0) {
      var targetTime = (seg.startRatio * localDuration) + timeOffset;
      targetTime = Math.max(0, Math.min(localDuration, targetTime));
      chapterAudioRef.current.currentTime = targetTime;
      setLocalProgress(targetTime);
      if (!isPlayingThis) {
        if (setPlayingChapterId) setPlayingChapterId(viewingChapterText.id);
      } else if (chapterAudioRef.current.paused) {
        var p = chapterAudioRef.current.play();
        if (p && typeof p.catch === "function") p.catch(function() {});
      }
    }
  };

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

  var cycleSpeed = function() {
    var speeds = [1, 1.25, 1.5, 1.75, 2, 0.8];
    var curIdx = speeds.findIndex(function(s) { return Math.abs(s - localSpeed) < 0.05; });
    var nextSpeed = speeds[(curIdx + 1) % speeds.length] || 1;
    setLocalSpeed(nextSpeed);
    if (chapterAudioRef && chapterAudioRef.current) {
      chapterAudioRef.current.playbackRate = nextSpeed;
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
        isPlayingThis ? (
          isAudioCollapsed ? (
            // وضع المشغل المطوي المصغر (بار نحيف جداً بارتفاع ~40px يوفر أقصى مساحة للقراءة)
            React.createElement(
              "div",
              { className: "px-3 py-1.5 rounded-xl bg-slate-950/95 text-white border border-indigo-500/40 shadow-md flex items-center justify-between gap-2 shrink-0 animate-fade-in" },
              
              // زر التشغيل المصغر والتوقيت
              React.createElement("div", { className: "flex items-center gap-2 min-w-0" },
                React.createElement("button", {
                  type: "button",
                  onClick: handleTogglePlay,
                  className: "w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all",
                  title: localIsPlaying ? "إيقاف مؤقت" : "تشغيل"
                },
                  localIsPlaying
                    ? React.createElement("svg", { className: "w-3.5 h-3.5 fill-current", viewBox: "0 0 24 24" },
                        React.createElement("path", { d: "M6 19h4V5H6v14zm8-14v14h4V5h-4z" })
                      )
                    : React.createElement("svg", { className: "w-3.5 h-3.5 fill-current ml-0.5", viewBox: "0 0 24 24" },
                        React.createElement("path", { d: "M8 5v14l11-7z" })
                      )
                ),
                React.createElement("div", { className: "flex items-center gap-1.5 text-xs min-w-0" },
                  React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" }),
                  React.createElement("span", { className: "font-mono font-bold text-indigo-300 text-[11px]" }, formatTime(localProgress)),
                  React.createElement("span", { className: "text-slate-500 text-[10px]" }, "/"),
                  React.createElement("span", { className: "font-mono text-slate-400 text-[11px]" }, formatTime(localDuration)),
                  curAudioIdx >= 0 ? React.createElement("span", { className: "text-[10px] text-amber-300 font-bold hidden sm:inline" }, "(" + (curAudioIdx + 1) + "/" + allAudioChaps.length + ")") : null
                )
              ),

              // شريط التقدم النحيف في المنتصف
              React.createElement("div", { className: "flex-1 max-w-xs mx-2 hidden sm:block" },
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
                  className: "w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                })
              ),

              // أزرار التحكم السريعة وزر التوسيع
              React.createElement("div", { className: "flex items-center gap-1.5 shrink-0" },
                React.createElement("button", {
                  type: "button",
                  onClick: function() { setAutoScrollEnabled(!autoScrollEnabled); },
                  className: "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all " +
                    (autoScrollEnabled ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-800 text-slate-400 border-slate-700"),
                  title: autoScrollEnabled ? "المتابعة التلقائية مفعلة" : "المتابعة التلقائية متوقفة"
                }, autoScrollEnabled ? "📍 متابعة" : "📍 متوقفة"),
                React.createElement("button", {
                  type: "button",
                  onClick: cycleSpeed,
                  className: "px-1.5 py-1 rounded-lg bg-slate-800 text-amber-300 border border-slate-700 text-[10px] font-mono font-bold",
                  title: "سرعة الصوت"
                }, localSpeed.toFixed(1) + "x"),
                React.createElement("button", {
                  type: "button",
                  onClick: toggleAudioCollapse,
                  className: "px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all flex items-center gap-1 active:scale-95",
                  title: "توسيع المشغل وعرض باقي الأزرار"
                },
                  React.createElement("span", null, "توسيع"),
                  React.createElement("span", { className: "text-[10px]" }, "▼")
                )
              )
            )
          ) : (
            // وضع المشغل الموسع (مع زر الطي)
            React.createElement(
              "div",
              { className: "p-2.5 sm:p-3 rounded-2xl bg-slate-950 text-white border border-indigo-500/40 shadow-lg space-y-2 shrink-0 animate-fade-in" },
              // السطر العلوي: رقم التراك وحالة الـ Playlist المتتالية وزر الطي
              React.createElement(
                "div",
                { className: "flex items-center justify-between text-xs gap-2 flex-wrap" },
                React.createElement("div", { className: "flex items-center gap-1.5 font-bold text-indigo-300 text-[11px] sm:text-xs" },
                  React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }),
                  React.createElement("span", null, "🎧 تراك"),
                  curAudioIdx >= 0 ? React.createElement("span", { className: "text-amber-300" }, "(" + (curAudioIdx + 1) + " من " + allAudioChaps.length + ")") : null
                ),
                React.createElement("div", { className: "flex items-center gap-1.5 flex-wrap" },
                  React.createElement("button", {
                    type: "button",
                    onClick: function() { setAutoScrollEnabled(!autoScrollEnabled); },
                    className: "px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 active:scale-95 " +
                      (autoScrollEnabled ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs" : "bg-slate-800 text-slate-400 border-slate-700"),
                    title: autoScrollEnabled ? "المتابعة التلقائية وتمرير الشاشة مع الصوت مفعلة (اضغط للإيقاف)" : "المتابعة التلقائية متوقفة (اضغط للتفعيل)"
                  }, autoScrollEnabled ? "📍 متابعة ✓" : "📍 متوقفة"),
                  setIsPlaylistMode ? React.createElement("button", {
                    type: "button",
                    onClick: function() { setIsPlaylistMode(!isPlaylistMode); },
                    className: "px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 active:scale-95 " +
                      (isPlaylistMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs" : "bg-slate-800 text-slate-400 border-slate-700"),
                    title: isPlaylistMode ? "التشغيل المتتالي مفعل" : "التشغيل المتتالي متوقف"
                  }, "🔁 " + (isPlaylistMode ? "متتالي ✓" : "فردي")) : null,
                  React.createElement("button", {
                    type: "button",
                    onClick: cycleSpeed,
                    className: "px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-mono font-bold active:scale-95 transition-all shadow-xs",
                    title: "تغيير سرعة الصوت"
                  }, localSpeed.toFixed(1) + "x"),
                  React.createElement("button", {
                    type: "button",
                    onClick: toggleAudioCollapse,
                    className: "px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-700 flex items-center gap-1 transition-all active:scale-95",
                    title: "طي المشغل لإتاحة مساحة أكبر لقراءة النص"
                  },
                    React.createElement("span", null, "طي"),
                    React.createElement("span", { className: "text-[10px]" }, "▲")
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
                canGoNext && isPlaylistMode && allAudioChaps[curAudioIdx + 1] ? React.createElement(
                  "span",
                  { className: "text-[10px] text-teal-300 truncate max-w-[140px] sm:max-w-xs font-sans" },
                  "⏭️ التالي: " + allAudioChaps[curAudioIdx + 1].title
                ) : null,
                React.createElement("span", { className: "text-slate-400 tabular-nums text-[11px]" }, formatTime(localDuration))
              ),

              // أزرار التحكم بالصوت والتنقل بين التراكات (توزيع LTR قياسي ثابت)
              React.createElement(
                "div",
                {
                  dir: "ltr",
                  className: "flex items-center justify-center gap-1.5 sm:gap-2.5 bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-800 shadow-inner"
                },
                // السابق
                React.createElement("button", {
                  type: "button",
                  onClick: handlePrevTrack,
                  disabled: !canGoPrev,
                  className: "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-20",
                  title: "الفصل الصوتي السابق"
                },
                  React.createElement("svg", { className: "w-4 h-4 fill-current", viewBox: "0 0 24 24" },
                    React.createElement("path", { d: "M6 6h2v12H6zm3.5 6l8.5 6V6z" })
                  )
                ),
                // تأخير 10 ثوان
                React.createElement("button", {
                  type: "button",
                  onClick: function() {
                    if (chapterAudioRef && chapterAudioRef.current) chapterAudioRef.current.currentTime -= 10;
                  },
                  className: "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex flex-col items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all relative group",
                  title: "تأخير 10 ثوان (رجوع للخلف)"
                },
                  React.createElement("svg", {
                    className: "w-5 h-5 stroke-current fill-none",
                    viewBox: "0 0 24 24",
                    strokeWidth: "2",
                    strokeLinecap: "round",
                    strokeLinejoin: "round"
                  },
                    React.createElement("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
                    React.createElement("path", { d: "M3 3v5h5" })
                  ),
                  React.createElement("span", {
                    className: "absolute text-[8px] font-black font-mono leading-none text-slate-200 mt-1 pointer-events-none"
                  }, "10")
                ),
                // تشغيل / إيقاف
                React.createElement("button", {
                  type: "button",
                  onClick: handleTogglePlay,
                  className: "w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center text-base sm:text-lg shadow-lg shadow-blue-600/30 active:scale-95 transition-all",
                  title: localIsPlaying ? "إيقاف مؤقت" : "متابعة التشغيل"
                },
                  localIsPlaying
                    ? React.createElement("svg", { className: "w-5 h-5 fill-current", viewBox: "0 0 24 24" },
                        React.createElement("path", { d: "M6 19h4V5H6v14zm8-14v14h4V5h-4z" })
                      )
                    : React.createElement("svg", { className: "w-5 h-5 fill-current ml-0.5", viewBox: "0 0 24 24" },
                        React.createElement("path", { d: "M8 5v14l11-7z" })
                      )
                ),
                // تقديم 10 ثوان
                React.createElement("button", {
                  type: "button",
                  onClick: function() {
                    if (chapterAudioRef && chapterAudioRef.current) chapterAudioRef.current.currentTime += 10;
                  },
                  className: "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex flex-col items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all relative group",
                  title: "تقديم 10 ثوان (تقدم للأمام)"
                },
                  React.createElement("svg", {
                    className: "w-5 h-5 stroke-current fill-none",
                    viewBox: "0 0 24 24",
                    strokeWidth: "2",
                    strokeLinecap: "round",
                    strokeLinejoin: "round"
                  },
                    React.createElement("path", { d: "M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }),
                    React.createElement("path", { d: "M21 3v5h-5" })
                  ),
                  React.createElement("span", {
                    className: "absolute text-[8px] font-black font-mono leading-none text-slate-200 mt-1 pointer-events-none"
                  }, "10")
                ),
                // التالي
                React.createElement("button", {
                  type: "button",
                  onClick: handleNextTrack,
                  disabled: !canGoNext,
                  className: "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-20",
                  title: "الفصل الصوتي التالي"
                },
                  React.createElement("svg", { className: "w-4 h-4 fill-current", viewBox: "0 0 24 24" },
                    React.createElement("path", { d: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" })
                  )
                )
              )
            )
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

      // لوحة وأدوات وزن وضبط تزامن تظليل النص مع صوت المتحدث (Highlight Time Sync Shift)
      hasAudio ? React.createElement(
        "div",
        { className: "p-2.5 sm:p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 text-xs shadow-2xs" },
        React.createElement(
          "div",
          { className: "flex flex-col sm:flex-row sm:items-center gap-2.5 min-w-0" },
          React.createElement("div", { className: "flex items-center gap-1.5 shrink-0" },
            React.createElement("span", { className: "text-base" }, "🎯"),
            React.createElement("div", null,
              React.createElement("span", { className: "font-black text-slate-900 dark:text-white block text-xs" }, "ضبط تزامن التظليل الأصفر مع الصوت:"),
              React.createElement("span", { className: "text-[10px] text-slate-500 dark:text-slate-400 block" }, "لوزن السطر المظلل إذا كان سابقاً لصوت المتحدث أو متأخراً عنه")
            )
          ),

          // أزرار الضبط الواضحة والصريحة باللغة العربية
          React.createElement(
            "div",
            { className: "flex items-center gap-1.5 flex-wrap" },
            // زر تأخير التظليل (إذا كان النص سابق الصوت)
            React.createElement("button", {
              type: "button",
              onClick: function() { handleAdjustOffset(2); },
              className: "px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-xs shadow-2xs flex items-center gap-1 transition-all active:scale-95",
              title: "اضغط هنا إذا كان التظليل الأصفر يسبق صوت المتحدث لتأخير التظليل ثانيتين"
            },
              React.createElement("span", null, "⏪"),
              React.createElement("span", null, "تأخير التظليل (-2ث)")
            ),

            // خانة كتابة الثواني يدوياً
            React.createElement(
              "div",
              { dir: "ltr", className: "flex items-center bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-700 px-2 py-0.5 shadow-inner" },
              React.createElement("input", {
                type: "number",
                step: "1",
                value: timeOffset,
                onChange: function(e) { handleDirectOffsetChange(e.target.value); },
                className: "w-12 text-center font-mono font-black text-xs bg-transparent text-amber-700 dark:text-amber-300 focus:outline-none py-1",
                title: "القيمة بالثواني (مثال: 3 لتأخير التظليل، أو -3 لتقديمه)"
              }),
              React.createElement("span", { className: "text-[10px] text-slate-400 font-sans ml-0.5" }, "ث")
            ),

            // زر تقديم التظليل (إذا كان النص متأخراً عن الصوت)
            React.createElement("button", {
              type: "button",
              onClick: function() { handleAdjustOffset(-2); },
              className: "px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-xs shadow-2xs flex items-center gap-1 transition-all active:scale-95",
              title: "اضغط هنا إذا كان صوت المتحدث يسبق التظليل لتقديم التظليل ثانيتين"
            },
              React.createElement("span", null, "تقديم التظليل (+2ث)"),
              React.createElement("span", null, "⏩")
            ),

            timeOffset !== 0 ? React.createElement("button", {
              type: "button",
              onClick: handleResetOffset,
              className: "text-[11px] text-rose-500 hover:text-rose-700 underline font-bold px-1.5 transition-colors",
              title: "إعادة تعيين التزامن للوضع الافتراضي الأصلي"
            }, "إلغاء التعديل ↺") : null
          )
        ),

        // حالة الحفظ وزر المشرف
        React.createElement(
          "div",
          { className: "flex items-center gap-2 self-end md:self-auto shrink-0" },
          offsetSavedNotice ? React.createElement("span", { className: "text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in" }, offsetSavedNotice) : null,
          isAdmin && onUpdateTimeOffset ? React.createElement("button", {
            type: "button",
            disabled: isSavingOffset,
            onClick: handleSaveOffsetForEveryone,
            className: "px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50",
            title: "حفظ هذا التزامن في قاعدة البيانات لجميع الدارسين ليروا النص متزامناً بهذا الشكل تلقائياً"
          },
            React.createElement("span", null, "💾"),
            React.createElement("span", null, isSavingOffset ? "جاري الحفظ..." : "حفظ التزامن لجميع الطلبة")
          ) : null
        )
      ) : null,

      // مساحة قراءة النص التفاعلية مع دعم التمرير السلس والمزامنة الدقيقة (سطر بسطر)
      React.createElement(
        "div",
        {
          ref: textContainerRef,
          className: "overflow-y-auto flex-1 p-3 sm:p-5 rounded-2xl border leading-relaxed font-sans select-text space-y-1.5 transition-colors " +
            (readerTheme === "sepia"
              ? "bg-[#fbf0d9] border-[#edd9be] text-[#433422] selection:bg-amber-300 selection:text-amber-950"
              : "bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 selection:bg-blue-600 selection:text-white"),
          style: { fontSize: fontSize + "px" }
        },
        segments.length > 0 ? segments.map(function(seg, idx) {
          var isActive = (idx === activeSegmentIdx);
          return React.createElement(
            "div",
            {
              key: seg.id,
              id: "chapter-segment-" + idx,
              onClick: hasAudio ? function() { handleSegmentClick(seg); } : undefined,
              className: "px-3 py-1.5 rounded-xl transition-all duration-200 " +
                (isActive
                  ? "bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100 border-r-4 border-amber-500 font-bold shadow-xs ring-1 ring-amber-400/40"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/50 " + (hasAudio ? "cursor-pointer" : "")),
              title: hasAudio ? "اضغط للاستماع بدءاً من هذا السطر" : undefined
            },
            React.createElement("p", { className: "whitespace-pre-wrap leading-relaxed" }, seg.text)
          );
        }) : React.createElement("p", { className: "whitespace-pre-wrap text-slate-400" }, (viewingChapterText && viewingChapterText.text) || "لا يوجد نص متاح لهذا الفصل.")
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
