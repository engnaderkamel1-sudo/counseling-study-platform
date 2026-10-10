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
  var viewingChapterText = props.viewingChapterText;
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
  var handleGenerateChapterAudio = props.handleGenerateChapterAudio;
  var handleBatchGenerateAllAudio = props.handleBatchGenerateAllAudio;
  var handleStopBatchAudio = props.handleStopBatchAudio;
  var generatingAudioChapterId = props.generatingAudioChapterId;
  var audioBatchProgress = props.audioBatchProgress;
  var audioStatusText = props.audioStatusText;
  var isPlaylistModeProp = props.isPlaylistMode;
  var setIsPlaylistModeProp = props.setIsPlaylistMode;
  var onOpenQualityAudit = props.onOpenQualityAudit;
  var handlePublishToggle = props.handlePublishToggle;
  var handleToggleChapterPublish = props.handleToggleChapterPublish;
  var handleToggleChapterOverride = props.handleToggleChapterOverride;
  var handlePublishReadyChapters = props.handlePublishReadyChapters;

  var utils = window.APP_UTILS || {};
  var chaps = (activeBook && activeBook.audioChapters) || [];
  var [audioProgress, setAudioProgress] = React.useState(0);
  var [audioDuration, setAudioDuration] = React.useState(0);
  var [audioSpeed, setAudioSpeed] = React.useState(1);
  var [isAudioPlaying, setIsAudioPlaying] = React.useState(false);
  var [audioHasError, setAudioHasError] = React.useState(false);
  var [useIframePlayer, setUseIframePlayer] = React.useState(false);
  var [localPlaylistMode, setLocalPlaylistMode] = React.useState(true);
  var isPlaylistMode = isPlaylistModeProp !== undefined ? isPlaylistModeProp : localPlaylistMode;
  var setIsPlaylistMode = setIsPlaylistModeProp || setLocalPlaylistMode;

  // فحص جودة الكتاب لحارس النشر
  var audit = React.useMemo(function() {
    return (utils.auditBookQuality && activeBook) ? utils.auditBookQuality(activeBook) : null;
  }, [activeBook, chaps]);
  var isPublished = !!(activeBook && (activeBook.publishStatus === "published" || activeBook.isPublished === true));
  var isAdmin = currentUser && currentUser.role === "admin";

  // الفصول المعروضة: للأدمن تظهر كافة الفصول، وللطالب تظهر الفصول المنشورة فقط
  var visibleChaps = React.useMemo(function() {
    if (isAdmin) return chaps;
    return chaps.filter(function(c) {
      return (c.isPublished === true) || (isPublished && c.isPublished !== false);
    });
  }, [chaps, isAdmin, isPublished]);

  // خريطة مدد الفصول الصوتية بالثواني مع تخزين محلي سريع
  var [durationsMap, setDurationsMap] = React.useState(function() {
    var bId = (activeBook && activeBook.id) || "";
    return (bId && utils.getLocal("counsel_audio_durations_" + bId, {})) || {};
  });

  // قائمة الفصول التي تحتوي على تسجيلات صوتية جاهزة
  var audioChaptersList = React.useMemo(function() {
    return visibleChaps.filter(function(c) { return c.audioUrl && c.audioUrl.trim(); });
  }, [visibleChaps]);

  // استكشاف مدد ملفات الصوت تلقائياً في الخلفية لحساب وقت التراكات والـ Playlist
  React.useEffect(function() {
    if (!activeBook || !chaps || chaps.length === 0) return;
    var bId = activeBook.id;
    var currentMap = Object.assign({}, durationsMap);
    var hasUpdates = false;

    chaps.forEach(function(c) {
      if (!c.audioUrl || !c.audioUrl.trim()) return;
      if (c.audioDuration && !currentMap[c.id]) {
        currentMap[c.id] = c.audioDuration;
        hasUpdates = true;
      } else if (!currentMap[c.id]) {
        try {
          var probe = new Audio();
          probe.preload = "metadata";
          probe.src = utils.getAudioStreamUrl(c.audioUrl);
          probe.onloadedmetadata = function() {
            if (probe.duration && !isNaN(probe.duration) && isFinite(probe.duration)) {
              setDurationsMap(function(prev) {
                var n = Object.assign({}, prev);
                n[c.id] = probe.duration;
                utils.setLocal("counsel_audio_durations_" + bId, n);
                return n;
              });
            }
          };
        } catch (e) {}
      }
    });

    if (hasUpdates) {
      setDurationsMap(currentMap);
      utils.setLocal("counsel_audio_durations_" + bId, currentMap);
    }
  }, [activeBook && activeBook.id, chaps]);

  // حساب الوقت الإجمالي لقائمة تشغيل الكتاب بالكامل (بالثواني)
  var totalPlaylistSeconds = React.useMemo(function() {
    return audioChaptersList.reduce(function(acc, c) {
      var d = (durationsMap && durationsMap[c.id]) || c.audioDuration || 0;
      return acc + d;
    }, 0);
  }, [audioChaptersList, durationsMap]);

  var curAudioIdx = audioChaptersList.findIndex(function(c) { return c.id === playingChapterId; });
  var canPlayPrev = curAudioIdx > 0;
  var canPlayNext = curAudioIdx >= 0 && curAudioIdx < audioChaptersList.length - 1;

  var handlePlayPrev = function() {
    if (canPlayPrev) {
      var prevChap = audioChaptersList[curAudioIdx - 1];
      setPlayingChapterId(prevChap.id);
      if (viewingChapterText && setViewingChapterText) setViewingChapterText(prevChap);
    }
  };

  var handlePlayNext = function() {
    if (canPlayNext) {
      var nextChap = audioChaptersList[curAudioIdx + 1];
      setPlayingChapterId(nextChap.id);
      if (viewingChapterText && setViewingChapterText) setViewingChapterText(nextChap);
    }
  };

  var handlePlayFullPlaylist = function() {
    if (audioChaptersList.length === 0) return;
    setIsPlaylistMode(true);
    var firstChap = audioChaptersList[0];
    setPlayingChapterId(firstChap.id);
    if (viewingChapterText && setViewingChapterText) setViewingChapterText(firstChap);
  };

  // مراقبة وتشغيل الصوت والانتقال التلقائي بين الفصول عند انتهاء التراك
  React.useEffect(function() {
    var audio = chapterAudioRef.current;
    if (!audio) return;

    var updateProgress = function() { setAudioProgress(audio.currentTime); };
    var updateDuration = function() {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
        if (playingChapterId) {
          setDurationsMap(function(prev) {
            var n = Object.assign({}, prev);
            n[playingChapterId] = audio.duration;
            if (activeBook) utils.setLocal("counsel_audio_durations_" + activeBook.id, n);
            return n;
          });
        }
      }
    };
    var updatePlayState = function() { setIsAudioPlaying(!audio.paused); };
    var updateSpeed = function() { setAudioSpeed(audio.playbackRate); };

    // الانتقال التلقائي للتراك التالي في الـ Playlist عند انتهاء الفصل الحالي
    var onTrackEnded = function() {
      if (isPlaylistMode) {
        var aList = chaps.filter(function(c) { return c.audioUrl && c.audioUrl.trim(); });
        var cIdx = aList.findIndex(function(c) { return c.id === playingChapterId; });
        if (cIdx >= 0 && cIdx < aList.length - 1) {
          var nextCh = aList[cIdx + 1];
          setPlayingChapterId(nextCh.id);
          // إذا كانت شاشة قراءة النص مفتوحة، تنتقل تلقائياً لنص الفصل الجديد
          if (viewingChapterText && setViewingChapterText) {
            setViewingChapterText(nextCh);
          }
        } else {
          setIsAudioPlaying(false);
        }
      } else {
        setIsAudioPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("play", updatePlayState);
    audio.addEventListener("pause", updatePlayState);
    audio.addEventListener("ratechange", updateSpeed);
    audio.addEventListener("ended", onTrackEnded);

    // ربط شاشة القفل وسماعات البلوتوث (MediaSession API للموبايل)
    var activeChap = chaps.find(function(c) { return c.id === playingChapterId; });
    if ("mediaSession" in navigator && activeChap) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: activeChap.title,
          artist: (activeBook && activeBook.title) || "المنصة الدراسية",
          album: "فصول الكتاب الصوتية (Playlist)",
          artwork: activeBook && activeBook.coverUrl ? [{ src: utils.getDriveImageUrl(activeBook.coverUrl), sizes: "512x512", type: "image/jpeg" }] : []
        });
        navigator.mediaSession.setActionHandler("play", function() { if (audio) audio.play(); });
        navigator.mediaSession.setActionHandler("pause", function() { if (audio) audio.pause(); });
        navigator.mediaSession.setActionHandler("seekbackward", function() { if (audio) audio.currentTime -= 10; });
        navigator.mediaSession.setActionHandler("seekforward", function() { if (audio) audio.currentTime += 10; });
        navigator.mediaSession.setActionHandler("previoustrack", handlePlayPrev);
        navigator.mediaSession.setActionHandler("nexttrack", handlePlayNext);
      } catch (msErr) {}
    }

    setAudioHasError(false);
    return function() {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("play", updatePlayState);
      audio.removeEventListener("pause", updatePlayState);
      audio.removeEventListener("ratechange", updateSpeed);
      audio.removeEventListener("ended", onTrackEnded);
    };
  }, [playingChapterId, chapterAudioRef, isPlaylistMode, chaps, viewingChapterText]);

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

      // بطاقة حالة المزامنة السحابية للفصول المفرغة (تؤكد حفظ كافة النصوص على جميع الأجهزة)
      (function() {
        var readyChaps = chaps.filter(function(c) { return c.text && c.text.trim().length > 30; });
        if (readyChaps.length > 0) {
          var totalChars = readyChaps.reduce(function(acc, c) { return acc + (c.text ? c.text.length : 0); }, 0);
          return React.createElement(
            "div",
            { className: "p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-teal-950/60 to-slate-900 border border-emerald-500/30 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in w-full" },
            React.createElement("div", { className: "flex items-center gap-2.5 min-w-0" },
              React.createElement("span", { className: "w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-lg shrink-0 shadow-sm" }, "☁️"),
              React.createElement("div", { className: "min-w-0" },
                React.createElement("div", { className: "font-black text-xs sm:text-sm text-emerald-300 flex items-center gap-2 flex-wrap" },
                  "متزامن سحابياً مع قاعدة البيانات",
                  React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" },
                    readyChaps.length + " فصول مفرغة جاهزة"
                  )
                ),
                React.createElement("div", { className: "text-[11px] text-slate-300 mt-0.5" },
                  "تم حفظ وتوثيق " + totalChars.toLocaleString() + " حرف من نصوص الكتاب ومتاحة على جميع أجهزتك."
                )
              )
            ),
            React.createElement("div", { className: "flex items-center gap-2 self-end sm:self-auto shrink-0" },
              React.createElement("span", { className: "text-[10px] font-mono text-emerald-400 bg-emerald-900/60 border border-emerald-700/60 px-2.5 py-1 rounded-xl" },
                "✓ Cloud Sync Active"
              )
            )
          );
        }
        return null;
      })(),
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
              disabled: isAiAnalyzingBook || !!batchProgress || !!audioBatchProgress,
              className: "inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
            },
            btnLabel
          );
        })() : null,
        chaps.length > 0 && typeof handleBatchGenerateAllAudio === "function" ? (function() {
          var textReadyCount = chaps.filter(function(c) { return c.text && c.text.trim(); }).length;
          var missingAudioCount = chaps.filter(function(c) { return c.text && c.text.trim() && (!c.audioUrl || !c.audioUrl.trim()); }).length;
          if (textReadyCount === 0) return null;
          var audioBtnLabel = audioBatchProgress ? "⏳ جاري توليد الصوت..."
            : (missingAudioCount > 0)
              ? ("🎙️ توليد الصوت للفصول (" + missingAudioCount + " متبقية)")
              : "🎙️ إعادة توليد صوت الفصول";
          return React.createElement(
            "button",
            {
              type: "button",
              onClick: handleBatchGenerateAllAudio,
              disabled: isAiAnalyzingBook || !!batchProgress || !!audioBatchProgress,
              className: "inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/25 active:scale-95 transition-all"
            },
            audioBtnLabel
          );
        })() : null,
        chaps.length > 0 && typeof handleClearAllChapters === "function" && !batchProgress && !audioBatchProgress ? React.createElement(
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
            disabled: !!batchProgress || !!audioBatchProgress,
            className: "inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold active:scale-95 transition-all"
          },
          "➕ إضافة فصل يدوي"
        )
      ) : null
    ),

    // لوحة بوابة الجودة واعتماد النشر للدارسين (Quality Gate Card)
    currentUser && currentUser.role === "admin" && audit ? React.createElement(
      "div",
      {
        className: "p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 " +
          (isPublished
            ? "bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-emerald-500/40 text-white shadow-lg shadow-emerald-950/20"
            : audit.isPublishable
              ? "bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-blue-500/40 text-white shadow-lg shadow-blue-950/20"
              : "bg-gradient-to-r from-amber-950/60 via-slate-900 to-rose-950/60 border-amber-500/40 text-white shadow-lg")
      },
      React.createElement(
        "div",
        { className: "flex items-start sm:items-center gap-3 min-w-0 flex-1" },
        React.createElement("span", { className: "text-2xl p-2.5 rounded-2xl bg-white/10 shrink-0" },
          isPublished ? "🌟" : audit.isPublishable ? "✅" : "🛡️"
        ),
        React.createElement(
          "div",
          { className: "space-y-1 min-w-0" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2 flex-wrap" },
            React.createElement("h4", { className: "font-black text-sm sm:text-base text-white" },
              isPublished
                ? "الكتاب منشور رسمياً للدارسين"
                : audit.isPublishable
                  ? "الكتاب مكتمل 100% ومؤهل للنشر"
                  : "بوابة فحص الجودة (مسودة قيد الإعداد)"
            ),
            React.createElement("span", {
              className: "text-[11px] font-black px-2 py-0.5 rounded-full border " +
                (isPublished
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : audit.isPublishable
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40")
            },
              isPublished ? "🚀 منشور للطلبة" : "🔒 مخفي عن الطلبة"
            )
          ),
          React.createElement(
            "p",
            { className: "text-xs text-slate-300 flex items-center gap-2 flex-wrap" },
            React.createElement("span", null, "نسبة الإنجاز الإجمالية: " + audit.overallPercent + "%"),
            React.createElement("span", { className: "text-slate-500" }, "•"),
            React.createElement("span", null, "فصول تامة: " + audit.completedCount + " من " + audit.totalChapters),
            React.createElement("span", { className: "text-slate-500" }, "•"),
            React.createElement("span", null, "تراكات صوتية: " + audit.audioReadyCount + " من " + audit.totalChapters)
          )
        )
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-2 w-full md:w-auto shrink-0 justify-end flex-wrap" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: onOpenQualityAudit,
            className: "flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          },
          "🔍 فحص الجودة والتفاصيل"
        ),
        isPublished ? React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { handlePublishToggle && handlePublishToggle("draft"); },
            className: "flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-black bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/40 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          },
          "🔒 إلغاء النشر مؤقتاً"
        ) : audit.isPublishable ? React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { handlePublishToggle && handlePublishToggle("published"); },
            className: "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          },
          "🚀 اعتماد ونشر الكتاب كاملاً"
        ) : (audit.readyCount > 0 ? React.createElement(
          "button",
          {
            type: "button",
            onClick: handlePublishReadyChapters,
            className: "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-md shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            title: "نشر الفصول الجاهزة والمعتمدة فقط حالياً للدارسين وإبقاء الباقي مسودة"
          },
          "🚀 نشر الفصول الجاهزة (" + audit.readyCount + " من " + audit.totalChapters + ")"
        ) : React.createElement(
          "button",
          {
            type: "button",
            disabled: true,
            className: "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-70 transition-all flex items-center justify-center gap-1.5",
            title: "لا توجد فصول جاهزة أو معتمدة للنشر بعد"
          },
          "🔒 غير مؤهل للنشر"
        ))
      )
    ) : null,

    // لوحة شريط تقدم توليد الصوت الجماعي (Batch Audio Progress)
    audioBatchProgress ? React.createElement(
      "div",
      { className: "p-4 rounded-2xl bg-gradient-to-r from-purple-950/90 to-slate-900 text-white border border-purple-500/40 shadow-xl space-y-3 animate-fade-in" },
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2" },
        React.createElement("div", { className: "flex items-center gap-2 min-w-0" },
          React.createElement("span", { className: "text-lg animate-pulse" }, "🎙️"),
          React.createElement("div", null,
            React.createElement("h5", { className: "font-black text-xs sm:text-sm text-purple-300 truncate" },
              "توليد الصوت: فصل (" + audioBatchProgress.currentIndex + " من " + audioBatchProgress.total + ") - " + audioBatchProgress.currentTitle
            ),
            React.createElement("p", { className: "text-[11px] text-slate-300" },
              audioStatusText || "جاري المعالجة وإنشاء الملف الصوتي..."
            )
          )
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleStopBatchAudio,
            className: "px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 self-start sm:self-auto"
          },
          "⏹️ إيقاف وحفظ ما تم"
        )
      ),
      React.createElement(
        "div",
        { className: "w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700" },
        React.createElement("div", {
          className: "bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-300",
          style: { width: Math.max(5, audioBatchProgress.percent) + "%" }
        })
      )
    ) : null,

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
          React.createElement("span", { className: "text-slate-300" }, 
            batchProgress.isBenchmarking 
              ? ("⏳ جاري قياس سرعة المعالجة الفعلية (صفحة " + (batchProgress.benchmarkPage || 1) + " من 4)...")
              : ("متبقي حوالي: " + formatSecs(batchProgress.remainingSeconds))
          )
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
          React.createElement("span", { className: "font-bold text-emerald-300 font-mono text-[11px]" }, 
            batchProgress.isBenchmarking 
              ? "جاري القياس (أول 4 صفحات)..."
              : formatSecs(batchProgress.remainingSeconds)
          )
        ),
        React.createElement("div", { className: "p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 col-span-2 sm:col-span-1" },
          React.createElement("span", { className: "text-slate-400 block text-[10px]" }, "💾 الحفظ السحابي:"),
          React.createElement("span", { className: "font-bold text-teal-300" }, "تلقائي وفوري لكل فصل ✓")
        )
      )
    ) : null,

    // بطاقة قائمة التشغيل الكاملة وحساب المدة الإجمالية (Playlist Master Card)
    audioChaptersList.length > 0 ? React.createElement(
      "div",
      { className: "p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5" },
      React.createElement(
        "div",
        { className: "flex items-center gap-3 w-full sm:w-auto min-w-0" },
        React.createElement("span", { className: "w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl shrink-0 shadow-md shadow-indigo-600/30" }, "📻"),
        React.createElement(
          "div",
          { className: "min-w-0 flex-1" },
          React.createElement("div", { className: "font-black text-sm sm:text-base flex items-center gap-2 flex-wrap" },
            "قائمة التشغيل الكاملة (Playlist)",
            React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" },
              audioChaptersList.length + " تراك صوتي"
            )
          ),
          React.createElement("div", { className: "text-xs text-indigo-200 mt-1 flex items-center gap-2 flex-wrap" },
            React.createElement("span", null, "⏱️ إجمالي وقت استماع الكتاب:"),
            React.createElement("span", { className: "font-black text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20" },
              totalPlaylistSeconds > 0 ? utils.formatArabicDuration(totalPlaylistSeconds) : "جاري احتساب المدة..."
            )
          )
        )
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-2 w-full sm:w-auto justify-end shrink-0" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handlePlayFullPlaylist,
            className: "w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          },
          React.createElement("span", { className: "text-base" }, "▶️"),
          React.createElement("span", null, "تشغيل الكل كـ Playlist")
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
            React.createElement("div", { className: "font-black text-xs sm:text-sm text-white truncate" },
              (curAudioIdx >= 0 ? ("تراك (" + (curAudioIdx + 1) + " من " + audioChaptersList.length + "): ") : "") + activeChap.title
            ),
            React.createElement("div", { className: "text-[11px] text-blue-300 flex items-center gap-2 flex-wrap" },
              React.createElement("span", null, "صفحة PDF " + (activeChap.startPage || 1)),
              React.createElement("button", {
                type: "button",
                onClick: function() { handlePageChange(activeChap.startPage || 1); },
                className: "text-[10px] underline text-blue-200 hover:text-white"
              }, "انتقل للصفحة"),
              activeChap.text ? React.createElement("button", {
                type: "button",
                onClick: function() { if (setViewingChapterText) setViewingChapterText(activeChap); },
                className: "text-[10px] bg-blue-500/20 hover:bg-blue-500/40 text-blue-200 px-2 py-0.5 rounded-md border border-blue-400/30 font-bold transition-all"
              }, "📖 عرض النص المفرغ") : null
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
          React.createElement("div", { className: "flex items-center justify-between gap-2 sm:gap-4 flex-wrap" },
            // Speed Slider + Drive link + Playlist Mode toggle
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
                  className: "w-14 sm:w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                })
              ),
              React.createElement("button", {
                type: "button",
                onClick: function() { setIsPlaylistMode(!isPlaylistMode); },
                className: "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 " +
                  (isPlaylistMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-slate-800 text-slate-400 border-slate-700"),
                title: isPlaylistMode ? "التشغيل المتتالي مفعل (Playlist ON)" : "التشغيل المتتالي متوقف"
              }, "🔁 " + (isPlaylistMode ? "قائمة" : "فردي")),
              React.createElement("button", {
                type: "button",
                onClick: function() { setUseIframePlayer(true); },
                className: "text-[10px] text-slate-400 hover:text-blue-300 underline hidden sm:inline"
              }, "مشغل Google ↗")
            ),
            
            // Playback Buttons with Prev & Next
            React.createElement("div", { className: "flex items-center gap-1 sm:gap-2 bg-slate-800/80 p-1 rounded-full border border-slate-700/50 shadow-inner" },
              // Previous Chapter
              React.createElement("button", {
                type: "button",
                onClick: handlePlayPrev,
                disabled: !canPlayPrev,
                className: "p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-20",
                title: "الفصل الصوتي السابق"
              }, "⏮️"),
              // Rewind 10s
              React.createElement("button", {
                type: "button",
                onClick: function() { if (chapterAudioRef.current) chapterAudioRef.current.currentTime -= 10; },
                className: "p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-xs",
                title: "تأخير 10 ثواني"
              }, "⏪"),
              // Play/Pause
              React.createElement("button", {
                type: "button",
                onClick: function() { 
                  if (chapterAudioRef.current) {
                    if (chapterAudioRef.current.paused) chapterAudioRef.current.play();
                    else chapterAudioRef.current.pause();
                  }
                },
                className: "p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center w-10 h-10 text-lg active:scale-95"
              }, isAudioPlaying ? "⏸️" : "▶️"),
              // Fast Forward 10s
              React.createElement("button", {
                type: "button",
                onClick: function() { if (chapterAudioRef.current) chapterAudioRef.current.currentTime += 10; },
                className: "p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-xs",
                title: "تقديم 10 ثواني"
              }, "⏩"),
              // Next Chapter
              React.createElement("button", {
                type: "button",
                onClick: handlePlayNext,
                disabled: !canPlayNext,
                className: "p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-20",
                title: "الفصل الصوتي التالي"
              }, "⏭️")
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
    visibleChaps.length === 0 ? React.createElement(
      "div",
      { className: "text-center py-10 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
      React.createElement("span", { className: "text-4xl block" }, "📁"),
      React.createElement("h5", { className: "font-bold text-slate-700 dark:text-slate-200 text-sm" },
        isAdmin ? "لم يتم إضافة فصول لهذا الكتاب حتى الآن" : "فصول هذا الكتاب قيد الإعداد والمراجعة حالياً"
      ),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-md mx-auto" },
        isAdmin
          ? "يمكن للمسؤول استخراج نص المقدمة أو أي فصل عبر الأداة، وتحويله لصوت ثم رفعه هنا ليظهر للدارسين كقائمة متسلسلة."
          : "ستكون الفصول الصوتية والنصوص المعتمدة متاحة هنا للدارسين فور نشرها من قبل المشرف ⏳"
      ),
      isAdmin ? React.createElement(
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
      visibleChaps.map(function(chap, idx) {
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
                chap.audioUrl ? (function() {
                  var d = (durationsMap && durationsMap[chap.id]) || chap.audioDuration || 0;
                  return React.createElement("span", {
                    className: "text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 text-[11px]"
                  },
                    "⏱️ " + (d > 0 ? ("المدة: " + formatTime(d)) : "صوت MP3 جاهز ✓")
                  );
                })() : (currentUser && currentUser.role === "admin" ? React.createElement(
                  "span",
                  { className: "text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 text-[11px] flex items-center gap-1" },
                  "⚠️ بدون صوت MP3"
                ) : null),
                (function() {
                  var sP = Number(chap.startPage) || 1;
                  var nextC = chaps[idx + 1];
                  var defaultEnd = nextC && nextC.startPage ? (Number(nextC.startPage) - 1) : sP;
                  var eP = Number(chap.endPage) || defaultEnd;
                  var totalChapPages = Math.max(1, eP - sP + 1);
                  var lastP = Number(chap.lastExtractedPage) || (chap.isComplete ? eP : 0);
                  var pagesDone = chap.isComplete ? totalChapPages : (lastP >= sP ? Math.min(totalChapPages, lastP - sP + 1) : ((chap.text && chap.text.trim().length > 100) ? totalChapPages : 0));
                  var textLen = (chap.text || "").trim().length;
                  var isDone = (pagesDone >= totalChapPages) && (textLen > 100);

                  if (currentUser && currentUser.role === "admin") {
                    if (isDone) {
                      return React.createElement("span", {
                        className: "text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-[11px] flex items-center gap-1"
                      },
                        "✅ مكتمل 100% (" + totalChapPages + " ص • " + textLen.toLocaleString() + " حرف)"
                      );
                    } else if (textLen > 0 || pagesDone > 0) {
                      return React.createElement("span", {
                        className: "text-amber-700 dark:text-amber-300 font-black bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 text-[11px] flex items-center gap-1 animate-pulse"
                      },
                        "⚠️ غير مكتمل (" + pagesDone + " من " + totalChapPages + " ص • " + textLen.toLocaleString() + " حرف)"
                      );
                    } else {
                      return React.createElement("span", {
                        className: "text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1"
                      },
                        "⚪ لم يستخرج بعد (" + totalChapPages + " ص)"
                      );
                    }
                  } else {
                    return textLen > 0 ? React.createElement("span", {
                      className: "text-blue-600 dark:text-blue-400 font-medium text-[11px] flex items-center gap-1"
                    }, "📖 نص مفرغ متاح للقراءة ✓") : null;
                  }
                })(),
                // شارة حالة نشر هذا الفصل للأدمن
                currentUser && currentUser.role === "admin" ? React.createElement("span", {
                  className: "text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 " +
                    (chap.isPublished === true
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700")
                },
                  chap.isPublished === true ? "🟢 متاح للدارسين" : "🔒 مسودة (مخفي)"
                ) : null,
                currentUser && currentUser.role === "admin" && chap.adminOverride ? React.createElement("span", {
                  className: "text-[11px] font-black px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1"
                }, "🛡️ معتمد يدوياً (Override)") : null
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

            // أزرار النشر الفردي والاعتماد اليدوي للأدمن (Override & Progressive Publishing)
            currentUser && currentUser.role === "admin" ? React.createElement("button", {
              type: "button",
              onClick: function() {
                handleToggleChapterPublish && handleToggleChapterPublish(chap.id, !chap.isPublished);
              },
              className: "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border shadow-xs " +
                (chap.isPublished
                  ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black border-emerald-400"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"),
              title: chap.isPublished ? "إخفاء الفصل عن الدارسين وإرجاعه لمسودة" : "إتاحة ونشر هذا الفصل للدارسين"
            },
              React.createElement("span", null, chap.isPublished ? "🚀 متاح للطلبة" : "🔒 إتاحة للطلبة")
            ) : null,

            currentUser && currentUser.role === "admin" ? React.createElement("button", {
              type: "button",
              onClick: function() {
                handleToggleChapterOverride && handleToggleChapterOverride(chap.id);
              },
              className: "px-2 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border " +
                (chap.adminOverride
                  ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-400"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"),
              title: chap.adminOverride ? "إلغاء الاعتماد اليدوي للأدمن" : "اعتماد وتجاوز يدوي للأدمن لهذا الفصل (Override)"
            },
              React.createElement("span", null, "🛡️"),
              React.createElement("span", null, chap.adminOverride ? "معتمد يدوياً" : "تجاوز يدوي")
            ) : null,

            // 1. زر استخراج أو استئناف النص بالذكاء الاصطناعي للأدمن
            currentUser && currentUser.role === "admin" && (function() {
              var nextCh = chaps[idx + 1];
              var isComplete = utils.isChapterComplete(chap, nextCh);
              var effectiveEnd = Number(chap.endPage) || (nextCh && nextCh.startPage ? (Number(nextCh.startPage) - 1) : (chap.startPage || 1));
              var hasMeaningfulText = chap.text && chap.text.trim().length > 30;
              var isPartial = !isComplete && hasMeaningfulText && chap.lastExtractedPage && chap.lastExtractedPage >= (chap.startPage || 1) && chap.lastExtractedPage < effectiveEnd;
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
              title: "فتح النص المفرغ لقراءته ونسخه"
            },
            React.createElement("span", null, "📄"),
            React.createElement("span", null, "عرض ونسخ النص")
            ) : null,

            // 2.5 زر توليد صوت الفصل
            currentUser && currentUser.role === "admin" && chap.text && typeof handleGenerateChapterAudio === "function" ? (function() {
              var isThisGenerating = (generatingAudioChapterId === chap.id);
              return React.createElement("button", {
                type: "button",
                onClick: function() { handleGenerateChapterAudio(chap); },
                disabled: isThisGenerating || !!audioBatchProgress,
                className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border " +
                  (isThisGenerating
                    ? "bg-purple-600 text-white border-purple-600 shadow-md animate-pulse"
                    : chap.audioUrl
                      ? "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                      : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-transparent shadow-md shadow-purple-600/20 active:scale-95"),
                title: chap.audioUrl ? "إعادة توليد صوت الفصل" : "توليد تسجيل صوتي للفصل"
              },
              React.createElement("span", null, isThisGenerating ? "⏳" : "🎙️"),
              React.createElement("span", null, isThisGenerating ? (audioStatusText || "جاري التوليد...") : (chap.audioUrl ? "إعادة توليد الصوت" : "توليد الصوت"))
              );
            })() : null,

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

            // 4. زر تعديل بيانات الفصل للأدمن (متاح دائماً لتعديل العنوان وأرقام الصفحات أو رفع الصوت)
            currentUser && currentUser.role === "admin" && React.createElement("button", {
              type: "button",
              onClick: function() { handleOpenEditChapter(chap); },
              className: "px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold transition-all flex items-center gap-1 border border-slate-200 dark:border-slate-700",
              title: chap.audioUrl ? "تعديل اسم الفصل أو أرقام صفحاته أو الصوت" : "رفع أو ربط ملف صوت الفصل (MP3)"
            },
            React.createElement("span", null, chap.audioUrl ? "✏️" : "🎵"),
            React.createElement("span", null, chap.audioUrl ? "تعديل" : "رفع صوت (MP3)")
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

