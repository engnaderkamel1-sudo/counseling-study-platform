// مكون فصول الكتاب الصوتية والنصوص المفرغة ومشغل الصوت المستقل
window.AudioChaptersView = function(props) {
  var activeBook = props.activeBook;
  var currentUser = props.currentUser;
  var playingChapterId = props.playingChapterId;
  var setPlayingChapterId = props.setPlayingChapterId;
  var chapterAudioRef = props.chapterAudioRef || { current: (window.APP_UTILS && window.APP_UTILS.getPersistentAudioElement ? window.APP_UTILS.getPersistentAudioElement() : null) };
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
  var singleAudioProgress = props.singleAudioProgress;
  var audioStatusText = props.audioStatusText;
  var isPlaylistModeProp = props.isPlaylistMode;
  var setIsPlaylistModeProp = props.setIsPlaylistMode;
  var onOpenQualityAudit = props.onOpenQualityAudit;
  var handlePublishToggle = props.handlePublishToggle;
  var handleToggleChapterPublish = props.handleToggleChapterPublish;
  var handleToggleChapterOverride = props.handleToggleChapterOverride;
  var handlePublishReadyChapters = props.handlePublishReadyChapters;
  var handleSaveChapterSubtitles = props.handleSaveChapterSubtitles;
  var handleClearChapterAudio = props.handleClearChapterAudio;

  var utils = window.APP_UTILS || {};
  var chaps = (activeBook && activeBook.audioChapters) || [];

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

  var [audioProgress, setAudioProgress] = React.useState(0);
  var [audioDuration, setAudioDuration] = React.useState(0);
  var [audioSpeed, setAudioSpeed] = React.useState(1);
  var [isAudioPlaying, setIsAudioPlaying] = React.useState(false);
  var [audioHasError, setAudioHasError] = React.useState(false);
  var [useIframePlayer, setUseIframePlayer] = React.useState(false);
  var [resumedNotice, setResumedNotice] = React.useState("");
  var [isDraggingSlider, setIsDraggingSlider] = React.useState(false);
  var [sliderDragValue, setSliderDragValue] = React.useState(0);
  var restoredPosRef = React.useRef({});

  // سجل الفصول المكتملة والمدروسة للكتاب النشط
  var [completedChapterIds, setCompletedChapterIds] = React.useState(function() {
    return (activeBook && activeBook.id) ? utils.getLocal("counsel_completed_chapters_" + activeBook.id, []) : [];
  });

  React.useEffect(function() {
    if (activeBook && activeBook.id) {
      setCompletedChapterIds(utils.getLocal("counsel_completed_chapters_" + activeBook.id, []));
    }
  }, [activeBook && activeBook.id]);

  var handleToggleChapterCompleted = function(chapId, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!activeBook || !activeBook.id) return;
    var next = completedChapterIds.indexOf(chapId) === -1
      ? completedChapterIds.concat([chapId])
      : completedChapterIds.filter(function(id) { return id !== chapId; });
    setCompletedChapterIds(next);
    utils.setLocal("counsel_completed_chapters_" + activeBook.id, next);
    try {
      window.dispatchEvent(new Event("counsel_book_progress_change"));
    } catch (eEv) {}
  };

  // استعادة موضع الاستماع المحفوظ في التخزين المحلي لكل فصل
  var restoreSavedPosition = function(audioEl, chapterId) {
    if (!audioEl || !activeBook || !activeBook.id || !chapterId) return;
    if (restoredPosRef.current[chapterId]) return;
    try {
      var pos = 0;
      if (window.__PENDING_AUTO_RESUME_AUDIO && window.__PENDING_AUTO_RESUME_AUDIO.chapterId === chapterId && window.__PENDING_AUTO_RESUME_AUDIO.position > 2) {
        pos = parseFloat(window.__PENDING_AUTO_RESUME_AUDIO.position);
        window.__PENDING_AUTO_RESUME_AUDIO = null;
        try { localStorage.removeItem("counsel_auto_resume_audio"); } catch (e) {}
      } else {
        var key = "counsel_audio_pos_" + activeBook.id + "_" + chapterId;
        var saved = localStorage.getItem(key);
        if (saved && !isNaN(parseFloat(saved))) {
          pos = parseFloat(saved);
        }
      }
      var dur = audioEl.duration;
      if (pos > 2 && (!dur || isNaN(dur) || pos < (dur - 3))) {
        audioEl.currentTime = pos;
        setAudioProgress(pos);
        restoredPosRef.current[chapterId] = true;
        setResumedNotice("تم استئناف الاستماع تلقائياً عند " + formatTime(pos));
        setTimeout(function() { setResumedNotice(""); }, 4500);
      }
    } catch (err) {}
  };

  var [localPlaylistMode, setLocalPlaylistMode] = React.useState(function() {
    var saved = utils.getLocal ? utils.getLocal("counsel_audio_playlist_mode", null) : null;
    return saved !== null ? (saved === true || saved === "true") : true;
  });
  var isPlaylistMode = isPlaylistModeProp !== undefined ? isPlaylistModeProp : localPlaylistMode;
  var setIsPlaylistMode = function(val) {
    var nextVal = typeof val === "function" ? val(isPlaylistMode) : val;
    if (setIsPlaylistModeProp) setIsPlaylistModeProp(nextVal);
    setLocalPlaylistMode(nextVal);
    if (utils.setLocal) utils.setLocal("counsel_audio_playlist_mode", nextVal);
  };
  var [showAdminTools, setShowAdminTools] = React.useState(false);

  var cycleSpeed = function() {
    var speeds = [1, 1.25, 1.5, 1.75, 2, 0.8];
    var curIdx = speeds.findIndex(function(s) { return Math.abs(s - audioSpeed) < 0.05; });
    var nextSpeed = speeds[(curIdx + 1) % speeds.length] || 1;
    setAudioSpeed(nextSpeed);
    if (chapterAudioRef.current) {
      chapterAudioRef.current.playbackRate = nextSpeed;
    }
  };

  // توليد توقيتات الجمل بدقة بناءً على طول الصوت الفعلي
  var generateSubtitlesFromDuration = function(rawText, totalDuration) {
    if (!rawText || !totalDuration || totalDuration <= 0) return [];
    var rawParts = rawText.split(/([.!?؟\n]+)/);
    var sentences = [];

    for (var i = 0; i < rawParts.length; i += 2) {
      var sText = (rawParts[i] || "").trim();
      var sPunct = (rawParts[i + 1] || "").trim();
      if (!sText && !sPunct) continue;
      var combined = (sText + (sPunct ? " " + sPunct : "")).trim();
      if (!combined) continue;

      if (combined.length > 85 && (combined.indexOf("،") !== -1 || combined.indexOf("؛") !== -1)) {
        var subParts = combined.split(/([،؛]+)/);
        var curSub = "";
        for (var j = 0; j < subParts.length; j += 2) {
          var pText = (subParts[j] || "").trim();
          var pPunct = (subParts[j + 1] || "").trim();
          var piece = (pText + (pPunct ? " " + pPunct : "")).trim();
          if (!piece) continue;
          if ((curSub.length + piece.length) > 85 && curSub.length >= 30) {
            sentences.push(curSub.trim());
            curSub = piece;
          } else {
            curSub = (curSub ? curSub + " " : "") + piece;
          }
        }
        if (curSub.trim()) sentences.push(curSub.trim());
      } else {
        sentences.push(combined);
      }
    }

    if (sentences.length === 0) sentences = [rawText.trim()];

    var totalChars = 0;
    var pauseSeconds = 0;
    var itemStats = sentences.map(function(s) {
      var chars = s.length;
      totalChars += chars;
      var p = 0;
      if (/[.!?؟]/.test(s)) p += 0.70;
      if (/\n/.test(s)) p += 0.35;
      if (/[،؛]/.test(s)) p += 0.40;
      pauseSeconds += p;
      return { chars: chars, pause: p, text: s };
    });

    var speechDuration = Math.max(totalDuration * 0.4, totalDuration - pauseSeconds);
    var charsPerSec = totalChars > 0 ? (totalChars / speechDuration) : 15;

    var cumTime = 0;
    var subs = [];
    for (var k = 0; k < itemStats.length; k++) {
      var item = itemStats[k];
      var dur = (item.chars / charsPerSec) + item.pause;
      var sStart = Math.round(cumTime * 100) / 100;
      var sEnd = (k === itemStats.length - 1) ? totalDuration : (Math.round((cumTime + dur) * 100) / 100);
      subs.push({
        start: sStart,
        end: sEnd,
        text: item.text
      });
      cumTime += dur;
    }
    return subs;
  };

  var [srtGeneratingChapId, setSrtGeneratingChapId] = React.useState(null);

  // دالة توليد وتنزيل أو حفظ الـ SRT للفصل
  var handleGenerateOrDownloadSrt = async function(targetChap) {
    if (!targetChap || !targetChap.text) {
      alert("⚠️ هذا الفصل لا يحتوي على نص مفرغ لتوليد الـ SRT.");
      return;
    }
    if (!targetChap.audioUrl) {
      alert("⚠️ يرجى توليد أو إضافة ملف الصوت للفصل أولاً ليتمكن النظام من ضبط التوقيتات.");
      return;
    }

    // فحص إذا كانت التوقيتات مسجلة بالفعل
    var existingSubs = targetChap.subtitles;
    var formatSrtTime = function(sec) {
      var s = Math.max(0, sec || 0);
      var hours = Math.floor(s / 3600);
      var minutes = Math.floor((s % 3600) / 60);
      var secs = Math.floor(s % 60);
      var millis = Math.floor((s % 1) * 1000);
      var pad = function(n, len) { return (new Array(len + 1).join("0") + n).slice(-len); };
      return pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(secs, 2) + "," + pad(millis, 3);
    };

    var downloadSubtitlesAsFile = function(subsList) {
      var content = subsList.map(function(item, idx) {
        return (idx + 1) + "\n" +
          formatSrtTime(item.start) + " --> " + formatSrtTime(item.end) + "\n" +
          item.text.trim() + "\n";
      }).join("\n");
      var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = ((targetChap.title || "chapter") + " - subtitles").replace(new RegExp("[\\\\/:*?\"<>|]", "g"), "_") + ".srt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    if (existingSubs && Array.isArray(existingSubs) && existingSubs.length > 0) {
      downloadSubtitlesAsFile(existingSubs);
      return;
    }

    // إذا لم تكن مسجلة، نحدد مدة الصوت ونولدها ونحفظها وننزل الملف
    var dur = (durationsMap && durationsMap[targetChap.id]) || targetChap.audioDuration || 0;
    if (!dur && chapterAudioRef.current && playingChapterId === targetChap.id && chapterAudioRef.current.duration > 0) {
      dur = chapterAudioRef.current.duration;
    }

    setSrtGeneratingChapId(targetChap.id);
    try {
      if (!dur || dur <= 0) {
        // فحص مدة الصوت من رابط التراك
        dur = await new Promise(function(resolve) {
          var probe = new Audio();
          probe.preload = "metadata";
          probe.src = utils.getAudioStreamUrl(targetChap.audioUrl);
          var timer = setTimeout(function() { resolve(0); }, 6000);
          probe.onloadedmetadata = function() {
            clearTimeout(timer);
            resolve(probe.duration || 0);
          };
          probe.onerror = function() {
            clearTimeout(timer);
            resolve(0);
          };
        });
      }

      if (!dur || dur <= 0) {
        throw new Error("تعذر تحديد مدة التسجيل الصوتي للفصل بدقة. يرجى تشغيل المقطع لثانية ثم المحاولة مجدداً.");
      }

      var generatedSubs = generateSubtitlesFromDuration(targetChap.text, dur);
      if (!generatedSubs || generatedSubs.length === 0) {
        throw new Error("تعذر إنشاء توقيتات التزامن.");
      }

      if (handleSaveChapterSubtitles) {
        await handleSaveChapterSubtitles(targetChap.id, generatedSubs);
      }
      alert("✅ تم ضبط وحفظ تزامن الـ SRT بنجاح (" + generatedSubs.length + " جملة)! المشغل سيتتبع ويظلل النص تلقائياً الآن.");
    } catch (err) {
      alert("⚠️ خطأ في معالجة الـ SRT: " + (err.message || err));
    } finally {
      setSrtGeneratingChapId(null);
    }
  };

  // توليد تزامن الـ SRT لكافة فصول الكتاب دفعة واحدة
  var [srtBatchProgress, setSrtBatchProgress] = React.useState(null);

  var handleBatchGenerateAllSrt = async function() {
    var readyChaps = chaps.filter(function(c) {
      return c.text && c.text.trim() && c.audioUrl && c.audioUrl.trim();
    });

    if (readyChaps.length === 0) {
      alert("⚠️ لا توجد فصول جاهزة (تحتوي على نص مفرغ وملف صوتي) لتوليد الـ SRT لها.");
      return;
    }

    var pendingChaps = readyChaps.filter(function(c) {
      return !c.subtitles || !Array.isArray(c.subtitles) || c.subtitles.length === 0;
    });

    var targets = pendingChaps.length > 0 ? pendingChaps : readyChaps;
    var confirmMsg = pendingChaps.length > 0
      ? ("هل تريد توليد تزامن الـ SRT للفصول المتبقية (" + pendingChaps.length + " فصول)؟")
      : ("جميع الفصول لديها تزامن بالفعل. هل تريد إعادة توليد وتحديث الـ SRT لكافة الفصول (" + readyChaps.length + " فصول)؟");

    if (!window.confirm(confirmMsg)) return;

    setSrtBatchProgress({ current: 0, total: targets.length });
    var successCount = 0;

    for (var i = 0; i < targets.length; i++) {
      var curChap = targets[i];
      setSrtBatchProgress({ current: i + 1, total: targets.length, title: curChap.title });

      try {
        var dur = (durationsMap && durationsMap[curChap.id]) || curChap.audioDuration || 0;
        if (!dur && chapterAudioRef.current && playingChapterId === curChap.id && chapterAudioRef.current.duration > 0) {
          dur = chapterAudioRef.current.duration;
        }

        if (!dur || dur <= 0) {
          dur = await new Promise(function(resolve) {
            var probe = new Audio();
            probe.preload = "metadata";
            probe.src = utils.getAudioStreamUrl(curChap.audioUrl);
            var timer = setTimeout(function() { resolve(0); }, 6000);
            probe.onloadedmetadata = function() {
              clearTimeout(timer);
              resolve(probe.duration || 0);
            };
            probe.onerror = function() {
              clearTimeout(timer);
              resolve(0);
            };
          });
        }

        if (dur && dur > 0) {
          var subs = generateSubtitlesFromDuration(curChap.text, dur);
          if (subs && subs.length > 0 && handleSaveChapterSubtitles) {
            await handleSaveChapterSubtitles(curChap.id, subs);
            successCount++;
          }
        }
      } catch (loopErr) {
        console.warn("Error generating SRT for chapter " + curChap.title, loopErr);
      }
    }

    setSrtBatchProgress(null);
    alert("🎉 اكتمل توليد وحفظ تزامن الـ SRT بنجاح لـ (" + successCount + " من " + targets.length + ") فصول!");
  };

  // تفعيل التشغيل الفوري بسلاسة واستعادة نقطة التوقف عند تغيير التراك
  React.useEffect(function() {
    var audio = chapterAudioRef.current;
    setAudioHasError(false);
    if (audio && playingChapterId) {
      restoreSavedPosition(audio, playingChapterId);
      // تأخير بسيط لمنح المتصفح وقتاً لتهيئة المصدر الجديد بسلاسة
      var timer = setTimeout(function() {
        try {
          var p = audio.play();
          if (p !== undefined && typeof p.catch === "function") {
            p.catch(function(err) {
              // خطأ عدم تفاعل المستخدم أو انتظار جاهزية التراك
              console.log("Audio play postponed until user gesture or buffer ready:", err);
            });
          }
        } catch (playErr) {}
      }, 80);
      return function() { clearTimeout(timer); };
    }
  }, [playingChapterId]);

  // استماع لحدث الاستئناف العام في حال كان نفس التراك محدداً بالفعل
  React.useEffect(function() {
    var onResumeTrigger = function() {
      var audio = chapterAudioRef.current;
      if (audio && playingChapterId) {
        var pending = window.__PENDING_AUTO_RESUME_AUDIO;
        if (pending && pending.position > 0) {
          try { audio.currentTime = pending.position; } catch (e) {}
        }
        var p = audio.play();
        if (p && typeof p.catch === "function") p.catch(function() {});
      }
    };
    window.addEventListener("counsel_trigger_resume_audio", onResumeTrigger);
    return function() {
      window.removeEventListener("counsel_trigger_resume_audio", onResumeTrigger);
    };
  }, [playingChapterId]);

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
      if (setViewingChapterText) setViewingChapterText(prevChap);
      setTimeout(function() {
        try {
          var el = document.getElementById("chapter-card-" + prevChap.id);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (e) {}
      }, 150);
    }
  };

  var handlePlayNext = function() {
    if (canPlayNext) {
      var nextChap = audioChaptersList[curAudioIdx + 1];
      setPlayingChapterId(nextChap.id);
      if (setViewingChapterText) setViewingChapterText(nextChap);
      setTimeout(function() {
        try {
          var el = document.getElementById("chapter-card-" + nextChap.id);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (e) {}
      }, 150);
    }
  };

  var handlePlayFullPlaylist = function() {
    if (audioChaptersList.length === 0) return;
    setIsPlaylistMode(true);
    if (playingChapterId) {
      if (chapterAudioRef.current) {
        if (chapterAudioRef.current.paused) {
          chapterAudioRef.current.play();
        } else {
          chapterAudioRef.current.pause();
        }
      }
      return;
    }

    // استئناف الاستماع من آخر فصل كان يستمع له الدارس بدلاً من البدء من البداية دائماً
    var targetChap = null;
    if (activeBook && activeBook.id) {
      try {
        var lastChapId = localStorage.getItem("counsel_audio_last_chap_" + activeBook.id);
        if (lastChapId) {
          targetChap = audioChaptersList.find(function(c) { return c.id === lastChapId; });
        }
      } catch (e) {}

      // إذا لم نجد آخر فصل، نبحث عن أول فصل يحتوي على موضع استماع محفوظ
      if (!targetChap) {
        for (var i = 0; i < audioChaptersList.length; i++) {
          try {
            var savedPos = localStorage.getItem("counsel_audio_pos_" + activeBook.id + "_" + audioChaptersList[i].id);
            if (savedPos && parseFloat(savedPos) > 3) {
              targetChap = audioChaptersList[i];
              break;
            }
          } catch (e) {}
        }
      }
    }

    // إذا لم يكن هناك استماع سابق، نبدأ من الفصل الأول في القائمة
    if (!targetChap) {
      targetChap = audioChaptersList[0];
    }

    setPlayingChapterId(targetChap.id);
    if (setViewingChapterText) setViewingChapterText(targetChap);
    setTimeout(function() {
      try {
        var el = document.getElementById("chapter-card-" + targetChap.id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (e) {}
    }, 150);
  };

  // إعادة ضبط المشغل وتشغيل الصوت عند تغيير الفصل
  React.useEffect(function() {
    if (!playingChapterId) return;
    setUseIframePlayer(false);
    setAudioHasError(false);
    var audio = chapterAudioRef.current || (window.APP_UTILS && window.APP_UTILS.getPersistentAudioElement && window.APP_UTILS.getPersistentAudioElement());
    if (audio) {
      chapterAudioRef.current = audio;
      var activeChap = chaps.find(function(c) { return c.id === playingChapterId; });
      if (activeChap && activeChap.audioUrl) {
        var targetSrc = utils.getAudioStreamUrl(activeChap.audioUrl);
        var isSame = audio.src && (audio.src === targetSrc || audio.src.endsWith(targetSrc));
        if (!isSame) {
          audio.src = targetSrc;
          restoreSavedPosition(audio, playingChapterId);
          var p = audio.play();
          if (p && typeof p.catch === "function") p.catch(function() {});
        } else if (audio.paused) {
          var p2 = audio.play();
          if (p2 && typeof p2.catch === "function") p2.catch(function() {});
        }
      }
    }
  }, [playingChapterId]);

  // مراقبة وتشغيل الصوت والانتقال التلقائي بين الفصول عند انتهاء التراك وحفظ موضع الاستماع
  React.useEffect(function() {
    var audio = chapterAudioRef.current || (window.APP_UTILS && window.APP_UTILS.getPersistentAudioElement && window.APP_UTILS.getPersistentAudioElement());
    if (!audio) return;
    chapterAudioRef.current = audio;

    var saveLastAudioRecord = function(currentSec) {
      if (!activeBook || !activeBook.id || !playingChapterId) return;
      var curChap = chaps.find(function(c) { return c.id === playingChapterId; });
      if (!curChap) return;
      var pos = currentSec !== undefined ? currentSec : (audio ? audio.currentTime : 0);
      var dur = (audio && audio.duration) || (durationsMap && durationsMap[playingChapterId]) || curChap.audioDuration || 0;
      var record = {
        type: "chapter",
        bookId: activeBook.id,
        bookTitle: activeBook.title || "مرجع دراسي",
        bookCoverUrl: activeBook.coverUrl || "",
        chapterId: playingChapterId,
        chapterTitle: curChap.title || "فصل صوتي",
        chapterAudioUrl: curChap.audioUrl || "",
        position: pos,
        duration: dur,
        updatedAt: Date.now()
      };
      try {
        localStorage.setItem("counsel_last_audio_track", JSON.stringify(record));
        window.dispatchEvent(new Event("counsel_audio_state_change"));
      } catch (e) {}
    };

    var updateProgress = function() {
      var ct = audio.currentTime;
      setAudioProgress(ct);
      if (activeBook && activeBook.id && playingChapterId && ct > 0) {
        if (Math.floor(ct) % 2 === 0) {
          try {
            localStorage.setItem("counsel_audio_pos_" + activeBook.id + "_" + playingChapterId, ct.toString());
            localStorage.setItem("counsel_audio_last_chap_" + activeBook.id, playingChapterId);
            saveLastAudioRecord(ct);
          } catch (posErr) {}
        }
      }
      if ("mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
        try {
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate || 1,
              position: Math.min(audio.currentTime, audio.duration)
            });
          }
        } catch (posErr) {}
      }
    };

    var updateDuration = function() {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
        restoreSavedPosition(audio, playingChapterId);
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

    var onCanPlay = function() {
      restoreSavedPosition(audio, playingChapterId);
    };

    var updatePlayState = function() {
      var isPlaying = !audio.paused;
      setIsAudioPlaying(isPlaying);
      if (isPlaying) {
        // قاعدة المشغل الحصري: إيقاف أي مشغل صوتي آخر في الصفحة فوراً لمنع تكرار الصوت
        try {
          var allAudios = document.querySelectorAll("audio");
          for (var ai = 0; ai < allAudios.length; ai++) {
            if (allAudios[ai] !== audio && !allAudios[ai].paused) {
              allAudios[ai].pause();
            }
          }
        } catch (e) {}
      }
      if (!isPlaying && activeBook && activeBook.id && playingChapterId && audio.currentTime > 0) {
        try {
          localStorage.setItem("counsel_audio_pos_" + activeBook.id + "_" + playingChapterId, audio.currentTime.toString());
          localStorage.setItem("counsel_audio_last_chap_" + activeBook.id, playingChapterId);
          saveLastAudioRecord(audio.currentTime);
        } catch (posErr) {}
      }
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
        } catch (e) {}
      }
    };

    var updateSpeed = function() { setAudioSpeed(audio.playbackRate); };

    // الانتقال التلقائي للتراك التالي في الـ Playlist عند انتهاء الفصل الحالي
    var onTrackEnded = function() {
      if (activeBook && activeBook.id && playingChapterId) {
        try {
          localStorage.removeItem("counsel_audio_pos_" + activeBook.id + "_" + playingChapterId);
        } catch (e) {}
      }
      if (isPlaylistMode) {
        var aList = audioChaptersList;
        var cIdx = aList.findIndex(function(c) { return c.id === playingChapterId; });
        if (cIdx >= 0 && cIdx < aList.length - 1) {
          var nextCh = aList[cIdx + 1];
          setPlayingChapterId(nextCh.id);
          // الانتقال التلقائي لنص الفصل الجديد في عارض النصوص
          if (setViewingChapterText) {
            setViewingChapterText(nextCh);
          }
          setTimeout(function() {
            try {
              var el = document.getElementById("chapter-card-" + nextCh.id);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } catch (scrollErr) {}
          }, 150);
        } else {
          setIsAudioPlaying(false);
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
          try {
            localStorage.removeItem("counsel_last_audio_track");
            window.dispatchEvent(new Event("counsel_audio_state_change"));
          } catch (e) {}
        }
      } else {
        setIsAudioPlaying(false);
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
        try {
          localStorage.removeItem("counsel_last_audio_track");
          window.dispatchEvent(new Event("counsel_audio_state_change"));
        } catch (e) {}
      }
    };

    var onError = function() {
      var mediaError = audio.error;
      if (!mediaError || mediaError.code === 1) return;
      console.error("Audio playback error:", mediaError);
      setAudioHasError(true);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("play", updatePlayState);
    audio.addEventListener("pause", updatePlayState);
    audio.addEventListener("ratechange", updateSpeed);
    audio.addEventListener("ended", onTrackEnded);
    audio.addEventListener("error", onError);

    // ربط شاشة القفل وسماعات البلوتوث (MediaSession API للموبايل والخلفية)
    var activeChap = chaps.find(function(c) { return c.id === playingChapterId; });
    if ("mediaSession" in navigator && activeChap) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: activeChap.title,
          artist: (activeBook && activeBook.title) || "المنصة الدراسية",
          album: "فصول الكتاب الصوتية (Playlist)",
          artwork: activeBook && activeBook.coverUrl ? [
            { src: utils.getDriveImageUrl(activeBook.coverUrl), sizes: "512x512", type: "image/jpeg" }
          ] : []
        });
        navigator.mediaSession.playbackState = audio.paused ? "paused" : "playing";
        navigator.mediaSession.setActionHandler("play", function() { if (audio) audio.play(); });
        navigator.mediaSession.setActionHandler("pause", function() { if (audio) audio.pause(); });
        navigator.mediaSession.setActionHandler("seekbackward", function() { if (audio) audio.currentTime -= 10; });
        navigator.mediaSession.setActionHandler("seekforward", function() { if (audio) audio.currentTime += 10; });
        navigator.mediaSession.setActionHandler("previoustrack", handlePlayPrev);
        navigator.mediaSession.setActionHandler("nexttrack", handlePlayNext);
        try {
          navigator.mediaSession.setActionHandler("seekto", function(details) {
            if (details.seekTime !== undefined && audio) audio.currentTime = details.seekTime;
          });
        } catch (seekErr) {}
      } catch (msErr) {}
    }

    setAudioHasError(false);
    return function() {
      if (audio && activeBook && activeBook.id && playingChapterId && audio.currentTime > 0) {
        try {
          localStorage.setItem("counsel_audio_pos_" + activeBook.id + "_" + playingChapterId, audio.currentTime.toString());
          saveLastAudioRecord(audio.currentTime);
        } catch (posErr) {}
      }
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("play", updatePlayState);
      audio.removeEventListener("pause", updatePlayState);
      audio.removeEventListener("ratechange", updateSpeed);
      audio.removeEventListener("ended", onTrackEnded);
      audio.removeEventListener("error", onError);
    };
  }, [playingChapterId, chapterAudioRef, isPlaylistMode, chaps, viewingChapterText, activeBook]);

  // مزامنة حالة المشغل الصوتي العائم (Global Mini-Player Bridge)
  React.useEffect(function() {
    var activeChap = chaps.find(function(c) { return c.id === playingChapterId; });
    if (playingChapterId && activeChap) {
      window.__ACTIVE_PLAYING_AUDIO = {
        title: activeChap.title || "فصل صوتي",
        book: (activeBook && activeBook.title) || "كتاب صوتي",
        isPlaying: isAudioPlaying,
        togglePlay: function() {
          if (chapterAudioRef.current) {
            if (chapterAudioRef.current.paused) chapterAudioRef.current.play();
            else chapterAudioRef.current.pause();
          }
        },
        stop: function() {
          if (chapterAudioRef.current) chapterAudioRef.current.pause();
          setPlayingChapterId(null);
        }
      };
    } else {
      window.__ACTIVE_PLAYING_AUDIO = null;
    }
    try {
      window.dispatchEvent(new Event("counsel_audio_state_change"));
    } catch (eEv) {}
  }, [playingChapterId, activeBook, isAudioPlaying]);

  return React.createElement(
    "div",
    { className: "space-y-4 " + (playingChapterId ? "pb-44 sm:pb-8" : "pb-12 sm:pb-4") },

    // ترويسة الفصول
    React.createElement(
      "div",
      { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm" },
      React.createElement(
        "div",
        null,
        React.createElement("h4", { className: "font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2" },
          "🎧 فصول الكتاب الصوتية والنصوص",
          React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" },
            visibleChaps.length + " فصول"
          )
        ),
        React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5" },
          "استمع لكل فصل بشكل مستقل، واقرأ النص المفرغ أو تصفح صفحات الـ PDF بكل سهولة."
        )
      ),

      currentUser && currentUser.role === "admin" ? React.createElement(
        "div",
        { className: "flex items-center gap-2 self-start sm:self-auto flex-wrap" },
        // زر سريع دائم لاستئناف توليد باقي أصوات الفصول دون الحاجة للبحث في الدروج
        chaps.length > 0 && typeof handleBatchGenerateAllAudio === "function" ? (function() {
          var missingAudioCount = chaps.filter(function(c) { return c.text && c.text.trim() && (!c.audioUrl || !c.audioUrl.trim()); }).length;
          if (missingAudioCount === 0) return null;
          return React.createElement(
            "button",
            {
              type: "button",
              onClick: handleBatchGenerateAllAudio,
              disabled: !!batchProgress || !!audioBatchProgress || !!srtBatchProgress,
              className: "inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 active:scale-95 transition-all animate-pulse"
            },
            audioBatchProgress ? "⏳ جاري التوليد..." : ("🎙️ استئناف توليد باقي الفصول (" + missingAudioCount + ")")
          );
        })() : null,
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { setShowAdminTools(!showAdminTools); },
            className: "inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold active:scale-95 transition-all border border-slate-200 dark:border-slate-700 shadow-2xs"
          },
          showAdminTools ? "✕ إغلاق أدوات الإدارة" : "⚙️ أدوات المعالجة والـ AI"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleOpenAddChapter,
            disabled: !!batchProgress || !!audioBatchProgress,
            className: "inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
          },
          "➕ إضافة فصل"
        )
      ) : null
    ),

    // بطاقة متابعة إنجاز فصول الكتاب (Book Chapter Progress Tracker)
    (function() {
      if (!chaps || chaps.length === 0) return null;
      var totalChaps = chaps.length;
      var doneChaps = chaps.filter(function(c) {
        return completedChapterIds.indexOf(c.id) !== -1;
      }).length;
      var chapPct = Math.min(100, Math.round((doneChaps / totalChaps) * 100));

      return React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 transition-all animate-in fade-in" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between gap-2 flex-wrap" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2.5" },
            React.createElement("span", { className: "text-xl sm:text-2xl" }, "📖"),
            React.createElement(
              "div",
              null,
              React.createElement(
                "h5",
                { className: "text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight" },
                "إنجازك في قراءة وسماع فصول هذا المرجع"
              ),
              React.createElement(
                "p",
                { className: "text-[11px] text-slate-500 dark:text-slate-400 mt-0.5" },
                chapPct === 100
                  ? "🎉 مبارك! أتممت دراسة وسماع كافة فصول هذا الكتاب بنجاح."
                  : (doneChaps > 0
                      ? ("أتممت دراسة " + doneChaps + " من أصل " + totalChaps + " فصول حتى الآن 🌿")
                      : "اضغط على علامة (✓) بجوار كل فصل تنتهي من قراءته أو سماعه لاحتسابه في إنجازك.")
              )
            )
          ),
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement(
              "span",
              { className: "text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 font-mono" },
              doneChaps + " من " + totalChaps + " فصول"
            ),
            React.createElement(
              "span",
              { className: "text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono" },
              chapPct + "%"
            )
          )
        ),
        // شريط التقدم المرئي
        React.createElement(
          "div",
          { className: "w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60" },
          chapPct > 0 && React.createElement(
            "div",
            {
              className: "h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 rounded-full transition-all duration-500 shadow-xs",
              style: { width: chapPct + "%" }
            }
          )
        )
      );
    })(),

    // درج أدوات المعالجة بالذكاء الاصطناعي للأدمن (يفتح عند الضغط على زر الأدوات فقط للحفاظ على نظافة وهدوء الشاشة)
    currentUser && currentUser.role === "admin" && (showAdminTools || !!batchProgress || !!audioBatchProgress) ? React.createElement(
      "div",
      { className: "p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in" },
      React.createElement("div", { className: "flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800" },
        React.createElement("span", { className: "text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5" },
          "⚙️ لوحة أدوات المعالجة والاستخراج بالـ AI"
        ),
        React.createElement("span", { className: "text-[11px] text-slate-400" }, "أدوات مخصصة للمسؤول لإعداد الكتاب")
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-2 flex-wrap pt-1" },
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
              disabled: isAiAnalyzingBook || !!batchProgress || !!audioBatchProgress || !!srtBatchProgress,
              className: "inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/25 active:scale-95 transition-all"
            },
            audioBtnLabel
          );
        })() : null,
        // زر توليد الـ SRT لكافة الفصول دفعة واحدة
        chaps.length > 0 && typeof handleSaveChapterSubtitles === "function" ? (function() {
          var audioAndTextChaps = chaps.filter(function(c) { return c.text && c.text.trim() && c.audioUrl && c.audioUrl.trim(); });
          if (audioAndTextChaps.length === 0) return null;
          var missingSrtCount = audioAndTextChaps.filter(function(c) { return !c.subtitles || !Array.isArray(c.subtitles) || c.subtitles.length === 0; }).length;
          var srtBtnLabel = srtBatchProgress
            ? ("⏳ جاري توليد الـ SRT (" + srtBatchProgress.current + "/" + srtBatchProgress.total + ")...")
            : (missingSrtCount > 0)
              ? ("⚡ توليد الـ SRT للفصول (" + missingSrtCount + " متبقية)")
              : "✓ الـ SRT مكتمل لجميع الفصول";
          return React.createElement(
            "button",
            {
              type: "button",
              onClick: handleBatchGenerateAllSrt,
              disabled: isAiAnalyzingBook || !!batchProgress || !!audioBatchProgress || !!srtBatchProgress,
              className: "inline-flex items-center gap-1.5 px-3.5 py-2 " +
                (missingSrtCount > 0
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-md shadow-violet-600/25"
                  : "bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:hover:bg-violet-900/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800") +
                " rounded-xl text-xs font-bold active:scale-95 transition-all"
            },
            srtBtnLabel
          );
        })() : null,
        chaps.length > 0 && typeof handleClearAllChapters === "function" && !batchProgress && !audioBatchProgress && !srtBatchProgress ? React.createElement(
          "button",
          {
            type: "button",
            onClick: handleClearAllChapters,
            className: "inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800 transition-all active:scale-95"
          },
          "🗑️ مسح الفصول والبدء من جديد"
        ) : null
      ),

      // ==========================================
      // لوحات مؤشر التقدم الحية (Live Progress Bars)
      // ==========================================

      // 1. مؤشر تقدم استخراج النصوص بالـ AI
      batchProgress ? (function() {
        var pct = Math.min(100, Math.max(0, batchProgress.percent || 0));
        return React.createElement(
          "div",
          { className: "mt-3 p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 space-y-2 animate-fade-in" },
          React.createElement(
            "div",
            { className: "flex items-center justify-between text-xs gap-2" },
            React.createElement("div", { className: "flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200 truncate" },
              React.createElement("span", { className: "animate-spin" }, "⏳"),
              React.createElement("span", { className: "truncate" }, "جاري استخراج: " + (batchProgress.currentChapterTitle || "الفصل"))
            ),
            React.createElement("div", { className: "flex items-center gap-2 shrink-0 font-mono font-black text-emerald-700 dark:text-emerald-300" },
              React.createElement("span", null, "(" + (batchProgress.pagesDone || 0) + "/" + (batchProgress.totalPages || 0) + " صفحة)"),
              React.createElement("span", { className: "text-sm bg-emerald-200/60 dark:bg-emerald-900/80 px-2 py-0.5 rounded-lg" }, pct + "%")
            )
          ),
          React.createElement(
            "div",
            { className: "w-full h-2.5 bg-emerald-200/50 dark:bg-emerald-900/50 rounded-full overflow-hidden p-0.5" },
            React.createElement("div", {
              className: "h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 shadow-xs",
              style: { width: pct + "%" }
            })
          ),
          typeof handleStopBatchExtraction === "function" ? React.createElement(
            "div",
            { className: "flex justify-end pt-1" },
            React.createElement("button", {
              type: "button",
              onClick: handleStopBatchExtraction,
              className: "px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 rounded-lg transition-all"
            }, "⏹️ إيقاف مؤقت للاستخراج")
          ) : null
        );
      })() : null,

      // 2. مؤشر تقدم توليد الصوت لكافة الفصول
      audioBatchProgress ? (function() {
        var curIdx = audioBatchProgress.currentIndex || 0;
        var total = audioBatchProgress.total || 1;
        var pct = Math.min(100, Math.max(0, audioBatchProgress.percent !== undefined ? audioBatchProgress.percent : Math.round((curIdx / total) * 100)));
        return React.createElement(
          "div",
          { className: "mt-3 p-3.5 rounded-xl bg-purple-50/90 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-800 space-y-2 animate-fade-in" },
          React.createElement(
            "div",
            { className: "flex items-center justify-between text-xs gap-2" },
            React.createElement("div", { className: "flex items-center gap-2 font-bold text-purple-900 dark:text-purple-200 truncate" },
              React.createElement("span", { className: "animate-pulse" }, "🎙️"),
              React.createElement("span", { className: "truncate" }, "جاري توليد صوت: " + (audioBatchProgress.currentTitle || ("فصل " + curIdx)))
            ),
            React.createElement("div", { className: "flex items-center gap-2 shrink-0 font-mono font-black text-purple-700 dark:text-purple-300" },
              React.createElement("span", { className: "text-[11px] font-sans font-medium text-purple-600 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-900/40 px-2 py-0.5 rounded-md" },
                (total - curIdx) > 0 ? ("⏳ متبقي: ~" + Math.max(1, Math.ceil((total - curIdx) * 1.2)) + " دقيقة") : "اكتمل تقريباً"
              ),
              React.createElement("span", null, "(" + curIdx + " من " + total + " فصول)"),
              React.createElement("span", { className: "text-sm bg-purple-200/60 dark:bg-purple-900/80 px-2 py-0.5 rounded-lg" }, pct + "%")
            )
          ),
          React.createElement(
            "div",
            { className: "w-full h-2.5 bg-purple-200/50 dark:bg-purple-900/50 rounded-full overflow-hidden p-0.5" },
            React.createElement("div", {
              className: "h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-400 rounded-full transition-all duration-300 shadow-xs",
              style: { width: pct + "%" }
            })
          ),
          React.createElement(
            "div",
            { className: "flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-300 pt-1" },
            React.createElement("span", { className: "truncate" }, audioStatusText || "جاري الاتصال بمحرك الصوت والتجهيز..."),
            typeof handleStopBatchAudio === "function" ? React.createElement("button", {
              type: "button",
              onClick: handleStopBatchAudio,
              className: "px-2.5 py-1 font-bold text-rose-700 dark:text-rose-300 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 rounded-lg transition-all shrink-0"
            }, "⏹️ إيقاف توليد الصوت") : null
          )
        );
      })() : null,

      // 3. مؤشر تقدم توليد الـ SRT لكافة الفصول
      srtBatchProgress ? (function() {
        var cur = srtBatchProgress.current || 0;
        var tot = srtBatchProgress.total || 1;
        var pct = Math.min(100, Math.max(0, Math.round((cur / tot) * 100)));
        return React.createElement(
          "div",
          { className: "mt-3 p-3.5 rounded-xl bg-violet-50/90 dark:bg-violet-950/50 border border-violet-300 dark:border-violet-800 space-y-2 animate-fade-in" },
          React.createElement(
            "div",
            { className: "flex items-center justify-between text-xs gap-2" },
            React.createElement("div", { className: "flex items-center gap-2 font-bold text-violet-900 dark:text-violet-200 truncate" },
              React.createElement("span", { className: "animate-pulse" }, "⚡"),
              React.createElement("span", { className: "truncate" }, "جاري ضبط توقيتات SRT: " + (srtBatchProgress.title || ("فصل " + cur)))
            ),
            React.createElement("div", { className: "flex items-center gap-2 shrink-0 font-mono font-black text-violet-700 dark:text-violet-300" },
              React.createElement("span", null, "(" + cur + " من " + tot + " فصول)"),
              React.createElement("span", { className: "text-sm bg-violet-200/60 dark:bg-violet-900/80 px-2 py-0.5 rounded-lg" }, pct + "%")
            )
          ),
          React.createElement(
            "div",
            { className: "w-full h-2.5 bg-violet-200/50 dark:bg-violet-900/50 rounded-full overflow-hidden p-0.5" },
            React.createElement("div", {
              className: "h-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-400 rounded-full transition-all duration-300 shadow-xs",
              style: { width: pct + "%" }
            })
          ),
          React.createElement(
            "div",
            { className: "text-[11px] text-violet-600 dark:text-violet-300 pt-0.5" },
            "يتم حساب التوقيتات بدقة الأجزاء من الثانية وحفظها للمشغل مباشرة..."
          )
        );
      })() : null
    ) : null,

    // لوحة بوابة الجودة واعتماد النشر للدارسين (Quality Gate Card)
    currentUser && currentUser.role === "admin" && audit && showAdminTools ? React.createElement(
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

    // بطاقة قائمة تشغيل الكتاب الصوتي (Audiobook Playlist Master Card بتصميم Pro Max فخم)
    audioChaptersList.length > 0 ? React.createElement(
      "div",
      { className: "p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/90 to-slate-950 text-white border border-indigo-500/30 shadow-xl space-y-3.5" },
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" },
        React.createElement(
          "div",
          { className: "flex items-center gap-3 w-full sm:w-auto min-w-0" },
          React.createElement("div", {
            className: "w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-indigo-600/30 border border-indigo-400/30 " + (isAudioPlaying ? "animate-pulse" : "")
          }, isAudioPlaying ? "📻" : "💿"),
          React.createElement(
            "div",
            { className: "min-w-0 flex-1" },
            React.createElement("div", { className: "font-black text-sm sm:text-base flex items-center gap-2 flex-wrap" },
              "قائمة تشغيل الكتاب الصوتي (Playlist)",
              React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" },
                audioChaptersList.length + " فصول صوتية"
              )
            ),
            React.createElement("div", { className: "text-xs text-indigo-200 mt-1 flex items-center gap-2 flex-wrap" },
              React.createElement("span", null, "⏱️ إجمالي وقت الاستماع:"),
              React.createElement("span", { className: "font-black text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20" },
                totalPlaylistSeconds > 0 ? utils.formatArabicDuration(totalPlaylistSeconds) : "جاري احتساب المدة..."
              )
            )
          )
        ),
        // شريحة تفعيل التشغيل المتتالي
        React.createElement("button", {
          type: "button",
          onClick: function() { setIsPlaylistMode(!isPlaylistMode); },
          className: "px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 self-start sm:self-auto active:scale-95 " +
            (isPlaylistMode
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"),
          title: isPlaylistMode ? "الانتقال التلقائي بين الفصول مفعّل" : "التشغيل المتتالي متوقف"
        },
          React.createElement("span", null, isPlaylistMode ? "🔁" : "⏹️"),
          React.createElement("span", null, isPlaylistMode ? "تشغيل متتالي (تلقائي) ✓" : "تشغيل فصل واحد فقط")
        )
      ),

      // تنبيه الفصل الجاري تشغيله الآن داخل الكارت
      playingChapterId && curAudioIdx >= 0 ? React.createElement(
        "div",
        { className: "p-2.5 rounded-2xl bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-between gap-2 text-xs" },
        React.createElement("div", { className: "flex items-center gap-2 min-w-0" },
          React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" }),
          React.createElement("span", { className: "font-bold text-indigo-200 truncate" },
            "جاري الاستماع الآن: (" + (curAudioIdx + 1) + " من " + audioChaptersList.length + ") " + audioChaptersList[curAudioIdx].title
          )
        ),
        canPlayNext && isPlaylistMode ? React.createElement("span", { className: "text-[11px] text-teal-300 shrink-0 font-medium hidden sm:inline" },
          "التالي: " + audioChaptersList[curAudioIdx + 1].title
        ) : null
      ) : null,

      // زر البدء الكبير المخصص للموبايل (يستأنف من آخر فصل توقف عنده الدارس)
      (function() {
        var savedChapTitle = "";
        if (!playingChapterId && activeBook && activeBook.id) {
          try {
            var lastChapId = localStorage.getItem("counsel_audio_last_chap_" + activeBook.id);
            if (lastChapId) {
              var foundC = audioChaptersList.find(function(c) { return c.id === lastChapId; });
              if (foundC) savedChapTitle = foundC.title;
            }
          } catch (e) {}
        }

        var btnText = playingChapterId
          ? (isAudioPlaying ? "إيقاف مؤقت للاستماع" : "متابعة استماع الكتاب الصوتي")
          : (savedChapTitle ? ("استئناف تشغيل الكتاب من: " + savedChapTitle) : "بدء تشغيل الكتاب كاملاً (Playlist متتالية)");

        return React.createElement(
          "div",
          { className: "pt-1" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handlePlayFullPlaylist,
              className: "w-full py-3 px-5 rounded-2xl font-black text-xs sm:text-sm shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 " +
                (playingChapterId
                  ? (isAudioPlaying
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25")
                  : "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/30")
            },
            React.createElement("span", { className: "text-base" }, playingChapterId ? (isAudioPlaying ? "⏸️" : "▶️") : "▶️"),
            React.createElement("span", { className: "truncate max-w-full" }, btnText)
          )
        );
      })()
    ) : null,

    // مشغل الصوت للفصل النشط (مع وضع عائم فخم مصمم خصيصاً للموبايل UI/UX Pro Max)
    playingChapterId && (function() {
      var activeChap = chaps.find(function(c) { return c.id === playingChapterId; });
      if (!activeChap) return null;
      var nextChapInfo = (curAudioIdx >= 0 && curAudioIdx < audioChaptersList.length - 1) ? audioChaptersList[curAudioIdx + 1] : null;

      return React.createElement(
        "div",
        {
          className: "fixed bottom-16 inset-x-2.5 sm:inset-x-4 md:static md:bottom-auto md:inset-x-auto z-40 p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-950/95 dark:bg-slate-950/95 backdrop-blur-xl text-white border border-indigo-500/40 shadow-2xl space-y-2.5 animate-fade-in"
        },
        // 0. إشعار استئناف موضع الاستماع السابق
        resumedNotice ? React.createElement(
          "div",
          { className: "p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs flex items-center justify-between gap-2 shadow-sm animate-fade-in" },
          React.createElement("div", { className: "flex items-center gap-1.5 font-bold" },
            React.createElement("span", null, "⏱️"),
            React.createElement("span", null, resumedNotice)
          ),
          React.createElement("button", {
            type: "button",
            onClick: function() {
              if (chapterAudioRef.current) chapterAudioRef.current.currentTime = 0;
              setAudioProgress(0);
              setResumedNotice("");
              try {
                localStorage.removeItem("counsel_audio_pos_" + activeBook.id + "_" + playingChapterId);
              } catch (e) {}
            },
            className: "text-[11px] underline text-indigo-300 hover:text-white font-bold"
          }, "البدء من 00:00")
        ) : null,

        // 1. شريط التمرير الزمني العلوي (Scrubber) مع التوقيت
        React.createElement(
          "div",
          { className: "space-y-1" },
          React.createElement("input", {
            type: "range",
            min: 0,
            max: (audioDuration && !isNaN(audioDuration) && audioDuration > 0) ? Math.floor(audioDuration) : 100,
            step: 1,
            value: isDraggingSlider ? sliderDragValue : (audioProgress || 0),
            onInput: function(e) {
              setIsDraggingSlider(true);
              setSliderDragValue(parseFloat(e.target.value));
            },
            onChange: function(e) {
              var targetTime = parseFloat(e.target.value);
              setIsDraggingSlider(false);
              setAudioProgress(targetTime);
              var audio = chapterAudioRef.current || (window.APP_UTILS && window.APP_UTILS.getPersistentAudioElement && window.APP_UTILS.getPersistentAudioElement());
              if (audio) {
                var wasPlaying = !audio.paused;
                try {
                  audio.currentTime = targetTime;
                  if (wasPlaying && audio.paused) {
                    audio.play().catch(function() {});
                  }
                } catch (err) {
                  console.warn("Seek error:", err);
                }
              }
            },
            className: "w-full h-1.5 sm:h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400 active:accent-emerald-400 transition-all"
          }),
          React.createElement(
            "div",
            { className: "flex justify-between items-center text-[11px] font-mono tabular-nums text-slate-400 px-0.5" },
            React.createElement("span", { className: "text-indigo-300 font-bold" }, formatTime(isDraggingSlider ? sliderDragValue : audioProgress)),
            nextChapInfo && isPlaylistMode ? React.createElement(
              "span",
              { className: "text-[10px] text-teal-300 font-sans truncate max-w-[180px] sm:max-w-xs" },
              "⏭️ التالي: " + nextChapInfo.title
            ) : null,
            React.createElement("span", null, formatTime(audioDuration))
          )
        ),

        // 2. سطر معلومات الفصل الحالي وأزرار التفاعل السريعة
        React.createElement(
          "div",
          { className: "flex items-center justify-between gap-2 min-w-0" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2.5 min-w-0 flex-1" },
            React.createElement("span", {
              className: "w-8 h-8 rounded-xl bg-indigo-600/80 flex items-center justify-center text-sm shrink-0 border border-indigo-400/30 " + (isAudioPlaying ? "animate-pulse" : "")
            }, "🎵"),
            React.createElement(
              "div",
              { className: "min-w-0 flex-1" },
              React.createElement("h5", { className: "font-black text-xs sm:text-sm text-white truncate" },
                (curAudioIdx >= 0 ? ("(" + (curAudioIdx + 1) + " من " + audioChaptersList.length + ") ") : "") + activeChap.title
              ),
              React.createElement(
                "div",
                { className: "flex items-center gap-2 text-[10px] text-indigo-300 flex-wrap" },
                React.createElement("span", { className: "text-slate-400 font-medium" }, "📄 صفحة PDF " + (activeChap.startPage || 1)),
                activeChap.text ? (function() {
                  var isViewingThis = viewingChapterText && viewingChapterText.id === activeChap.id;
                  return React.createElement("button", {
                    type: "button",
                    onClick: function() {
                      if (setViewingChapterText) {
                        setViewingChapterText(isViewingThis ? null : activeChap);
                      }
                    },
                    className: "px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95 " +
                      (isViewingThis
                        ? "bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-400/40"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 font-black"),
                    title: isViewingThis ? "إخفاء نافذة قراءة النص" : "عرض نص الفصل المفرغ للقراءة"
                  },
                    React.createElement("span", null, "📖"),
                    React.createElement("span", null, isViewingThis ? "إخفاء النص" : "عرض النص")
                  );
                })() : null
              )
            )
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() {
                if (chapterAudioRef.current) chapterAudioRef.current.pause();
                setPlayingChapterId(null);
              },
              className: "p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-all shrink-0 active:scale-95",
              title: "إغلاق المشغل"
            },
            "✕"
          )
        ),

        // تنبيه المشغل عند وجود خطأ في الرابط
        audioHasError ? (function() {
          var driveId = utils.extractDriveId ? utils.extractDriveId(activeChap.audioUrl) : null;
          var isExpiredGradio = activeChap.audioUrl && (activeChap.audioUrl.indexOf("/tmp/gradio/") !== -1 || activeChap.audioUrl.indexOf("gradio_api/file") !== -1);

          if (isExpiredGradio) {
            return React.createElement(
              "div",
              { className: "p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm animate-fade-in" },
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-lg" }, "⚠️"),
                React.createElement("span", { className: "text-[11px] leading-tight" }, "رابط الصوت المؤقت انتهت صلاحيته من السيرفر الخارجي. اضغط لتوليده وحفظه تلقائياً على Google Drive:")
              ),
              isAdmin && typeof handleGenerateChapterAudio === "function" ? React.createElement("button", {
                type: "button",
                onClick: function() { handleGenerateChapterAudio(activeChap); },
                className: "px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm shrink-0 active:scale-95 flex items-center gap-1 self-end sm:self-auto"
              }, React.createElement("span", null, "🎙️"), React.createElement("span", null, "توليد وحفظ على Drive")) : null
            );
          }

          if (driveId) {
            return React.createElement(
              "div",
              { className: "p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2" },
              React.createElement("span", { className: "text-[11px]" }, "⚠️ تعذر البث المباشر. اضغط للتبديل لمشغل Google:"),
              React.createElement("button", {
                type: "button",
                onClick: function() { setUseIframePlayer(true); },
                className: "px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-lg text-xs transition-all shadow-sm shrink-0"
              }, "مشغل Google ↗")
            );
          }

          return null;
        })() : null,

        useIframePlayer ? React.createElement(
          "div",
          { className: "w-full flex flex-col gap-2 pt-1" },
          React.createElement("iframe", {
            src: utils.getMediaEmbedUrl(activeChap.audioUrl),
            className: "w-full h-48 sm:h-52 rounded-2xl border border-slate-700 bg-slate-950 shadow-inner",
            allow: "autoplay"
          }),
          React.createElement("div", { className: "flex justify-between items-center text-[11px] flex-wrap gap-2 px-1" },
            React.createElement("span", { className: "text-emerald-400 font-bold flex items-center gap-1" },
              React.createElement("span", null, "✓"),
              React.createElement("span", null, "مشغل Google Drive المباشر")
            ),
            React.createElement("div", { className: "flex items-center gap-3" },
              React.createElement("a", {
                href: activeChap.audioUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "text-amber-300 hover:text-amber-200 underline font-bold flex items-center gap-1"
              }, "فتح الصوت في Google Drive ↗"),
              React.createElement("button", {
                type: "button",
                onClick: function() { setUseIframePlayer(false); },
                className: "text-slate-400 hover:text-white underline font-bold"
              }, "العودة للمشغل الذكي ↺")
            )
          )
        ) : React.createElement(
          "div",
          { className: "flex items-center justify-between gap-1 sm:gap-2 pt-0.5" },
          // زر سرعة القراءة وزر التبديل المتتالي
          React.createElement(
            "div",
            { className: "flex items-center gap-1.5" },
            React.createElement("button", {
              type: "button",
              onClick: cycleSpeed,
              className: "px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border border-slate-700/60 text-xs font-mono font-bold active:scale-95 transition-all shadow-xs",
              title: "تغيير سرعة الصوت"
            }, audioSpeed.toFixed(1) + "x"),
            React.createElement("button", {
              type: "button",
              onClick: function() { setIsPlaylistMode(!isPlaylistMode); },
              className: "px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 active:scale-95 " +
                (isPlaylistMode
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs"
                  : "bg-slate-800 text-slate-400 border-slate-700"),
              title: isPlaylistMode ? "التشغيل المتتالي مفعّل" : "التشغيل المتتالي متوقف"
            },
              React.createElement("span", null, isPlaylistMode ? "🔁" : "⏹️"),
              React.createElement("span", { className: "text-[11px] hidden sm:inline" }, isPlaylistMode ? "قائمة" : "فردي")
            )
          ),

          // أزرار التحكم بالصوت (توزيع LTR قياسي ثابت غير مقلوب مع أيقونات 10 ثوانٍ واضحة)
          React.createElement(
            "div",
            {
              dir: "ltr",
              className: "flex items-center gap-1 sm:gap-1.5 bg-slate-900/90 px-1.5 py-0.5 rounded-full border border-slate-800 shadow-inner"
            },
            // السابق (الفصل السابق في القائمة)
            React.createElement("button", {
              type: "button",
              onClick: handlePlayPrev,
              disabled: !canPlayPrev,
              className: "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-20",
              title: "الفصل السابق في القائمة"
            },
              React.createElement("svg", { className: "w-4 h-4 fill-current", viewBox: "0 0 24 24" },
                React.createElement("path", { d: "M6 6h2v12H6zm3.5 6l8.5 6V6z" })
              )
            ),
            // تأخير 10 ثوان (سهم دائري لليسار مع رقم 10)
            React.createElement("button", {
              type: "button",
              onClick: function() { if (chapterAudioRef.current) chapterAudioRef.current.currentTime -= 10; },
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
            // تشغيل / إيقاف مؤقت
            React.createElement("button", {
              type: "button",
              onClick: function() {
                var audio = chapterAudioRef.current || (window.APP_UTILS && window.APP_UTILS.getPersistentAudioElement && window.APP_UTILS.getPersistentAudioElement());
                if (audio) {
                  if (audio.paused) {
                    var p = audio.play();
                    if (p && typeof p.catch === "function") {
                      p.catch(function(err) {
                        console.warn("Audio play error:", err);
                      });
                    }
                  } else {
                    audio.pause();
                  }
                }
              },
              className: "w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center text-lg sm:text-xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all",
              title: isAudioPlaying ? "إيقاف مؤقت" : "تشغيل"
            },
              isAudioPlaying
                ? React.createElement("svg", { className: "w-5 h-5 fill-current", viewBox: "0 0 24 24" },
                    React.createElement("path", { d: "M6 19h4V5H6v14zm8-14v14h4V5h-4z" })
                  )
                : React.createElement("svg", { className: "w-5 h-5 fill-current ml-0.5", viewBox: "0 0 24 24" },
                    React.createElement("path", { d: "M8 5v14l11-7z" })
                  )
            ),
            // تقديم 10 ثوان (سهم دائري لليمين مع رقم 10)
            React.createElement("button", {
              type: "button",
              onClick: function() { if (chapterAudioRef.current) chapterAudioRef.current.currentTime += 10; },
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
            // التالي (الفصل التالي في القائمة)
            React.createElement("button", {
              type: "button",
              onClick: handlePlayNext,
              disabled: !canPlayNext,
              className: "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-20",
              title: "الفصل التالي في القائمة"
            },
              React.createElement("svg", { className: "w-4 h-4 fill-current", viewBox: "0 0 24 24" },
                React.createElement("path", { d: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" })
              )
            )
          )
        )
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

        var isNextInPlaylist = isPlaylistMode && curAudioIdx >= 0 && (curAudioIdx < audioChaptersList.length - 1) && (audioChaptersList[curAudioIdx + 1].id === chap.id);
        var isChapDone = completedChapterIds.indexOf(chap.id) !== -1;

        return React.createElement(
          "div",
          {
            key: chap.id,
            id: "chapter-card-" + chap.id,
            className: "p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 " +
              (isThisPlaying
                ? "border-indigo-500 dark:border-indigo-400 shadow-lg ring-2 ring-indigo-500/30 bg-indigo-50/15 dark:bg-indigo-950/30"
                : isNextInPlaylist
                  ? "border-teal-500/60 dark:border-teal-500/40 shadow-xs bg-teal-50/10 dark:bg-teal-950/20"
                  : isExtractingThis
                    ? "border-emerald-500/70 shadow-md ring-2 ring-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/20"
                    : isChapDone
                      ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm")
          },
          React.createElement(
            "div",
            { className: "flex items-start gap-3 flex-1 min-w-0" },
            // زر تحديد إتمام دراسة الفصل
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function(e) {
                  handleToggleChapterCompleted(chap.id, e);
                },
                title: isChapDone ? "تمت دراسة هذا الفصل بنجاح (اضغط للإلغاء)" : "اضغط لتحديد إتمام دراسة هذا الفصل",
                className: "w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer mt-1 " +
                  (isChapDone
                    ? "bg-emerald-500 text-white shadow-xs scale-105"
                    : "border border-slate-300 dark:border-slate-700 text-slate-300 dark:text-slate-600 hover:border-emerald-400 hover:text-emerald-500")
              },
              React.createElement("span", { className: "text-xs font-black" }, isChapDone ? "✓" : "")
            ),
            React.createElement(
              "div",
              { className: "flex flex-col items-center gap-1 shrink-0" },
              React.createElement("span", {
                className: "w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs " +
                  (isThisPlaying
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/50"
                    : isNextInPlaylist
                      ? "bg-teal-600 text-white"
                      : isExtractingThis
                        ? "bg-emerald-600 text-white animate-pulse"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")
              },
                isThisPlaying ? "🎧" : isNextInPlaylist ? "⏭️" : isExtractingThis ? "⏳" : (idx + 1)
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
              React.createElement(
                "div",
                { className: "flex items-center gap-2 flex-wrap" },
                React.createElement("h5", { className: "font-bold text-sm text-slate-900 dark:text-white" }, chap.title),
                isThisPlaying ? React.createElement("span", {
                  className: "px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white flex items-center gap-1 shadow-xs animate-pulse"
                }, "🎧 جاري الاستماع") : null,
                isNextInPlaylist ? React.createElement("span", {
                  className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1"
                }, "⏭️ التالي في القائمة") : null
              ),
              React.createElement(
                "div",
                { className: "flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400" },
                React.createElement("span", {
                  className: "font-medium flex items-center gap-1 text-slate-500 dark:text-slate-400"
                }, "📄 صفحة PDF " + (chap.startPage || 1)),
                // 1. شارة حالة النص
                (function() {
                  var textLen = (chap.text || "").trim().length;
                  if (textLen > 100) {
                    return React.createElement("span", {
                      className: "text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-[11px] flex items-center gap-1"
                    }, "📄 النص: مفرغ (" + textLen.toLocaleString() + " حرف)");
                  } else {
                    return React.createElement("span", {
                      className: "text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 text-[11px] flex items-center gap-1"
                    }, "📄 النص: غير مفرغ");
                  }
                })(),

                // 2. شارة حالة الصوت الحقيقية
                (function() {
                  var hasDriveAudio = chap.audioUrl && (chap.audioUrl.indexOf("drive.google.com") !== -1 || chap.audioUrl.indexOf("docs.google.com") !== -1 || chap.audioUrl.indexOf("lh3.googleusercontent.com") !== -1);
                  var d = (durationsMap && durationsMap[chap.id]) || chap.audioDuration || 0;
                  if (hasDriveAudio) {
                    return React.createElement("span", {
                      className: "text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-[11px] flex items-center gap-1"
                    }, "🎙️ الصوت: دائم على Drive" + (d > 0 ? (" (" + formatTime(d) + ")") : ""));
                  } else if (chap.audioUrl && chap.audioUrl.trim()) {
                    return React.createElement("span", {
                      className: "text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 text-[11px] flex items-center gap-1"
                    }, "⚠️ الصوت: مؤقت (بحاجة لحفظ)");
                  } else {
                    return currentUser && currentUser.role === "admin" ? React.createElement("span", {
                      className: "text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 text-[11px] flex items-center gap-1"
                    }, "❌ الصوت: غير مولد") : null;
                  }
                })(),

                // 3. شارة حالة ملف التزامن SRT
                (function() {
                  var hasSubs = chap.subtitles && Array.isArray(chap.subtitles) && chap.subtitles.length > 0;
                  var hasAudio = chap.audioUrl && chap.audioUrl.trim();
                  if (hasSubs) {
                    return React.createElement("span", {
                      className: "text-violet-700 dark:text-violet-300 font-bold bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-md border border-violet-200 dark:border-violet-800 text-[11px] flex items-center gap-1"
                    }, "✅ الـ SRT: متزامن ومحفوظ (" + chap.subtitles.length + " جملة)");
                  } else if (hasAudio) {
                    return React.createElement("span", {
                      className: "text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 text-[11px] flex items-center gap-1"
                    }, "⚠️ الـ SRT: غير مولد (تظليل تقديري)");
                  } else {
                    return currentUser && currentUser.role === "admin" ? React.createElement("span", {
                      className: "text-slate-400 dark:text-slate-500 font-normal text-[11px] flex items-center gap-1"
                    }, "⚪ الـ SRT: بانتظار توليد الصوت أولاً") : null;
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
                ) : null
              ),

              // شريط تقدم تفريغ النص لهذا الفصل بالنسبة المئوية
              isExtractingThis && currentChapProgress ? React.createElement(
                "div",
                { className: "mt-2.5 p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-500/30 space-y-1.5 animate-fade-in" },
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between text-xs flex-wrap gap-1" },
                  React.createElement("div", { className: "flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300" },
                    React.createElement("span", { className: "animate-spin inline-block text-[11px]" }, "⚙️"),
                    React.createElement("span", null, "نسبة إنجاز النص:"),
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
                )
              ) : null,

              // شريط تقدم توليد الصوت الحي لهذا الفصل بالنسبة المئوية وعدّاد الأجزاء
              (generatingAudioChapterId === chap.id) && singleAudioProgress ? React.createElement(
                "div",
                { className: "mt-2.5 p-2.5 rounded-xl bg-purple-500/10 dark:bg-purple-950/50 border border-purple-500/30 space-y-1.5 animate-fade-in" },
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between text-xs flex-wrap gap-1" },
                  React.createElement("div", { className: "flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-200" },
                    React.createElement("span", { className: "animate-pulse text-[11px]" }, "🎙️"),
                    React.createElement("span", null, "نسبة توليد الصوت:"),
                    React.createElement("span", { className: "font-mono font-black text-white px-2 py-0.5 rounded-md bg-purple-600 dark:bg-purple-500 text-xs shadow-xs" },
                      (singleAudioProgress.percent || 0) + "%"
                    )
                  ),
                  React.createElement("div", { className: "text-[11px] text-purple-700 dark:text-purple-300 font-mono font-bold flex items-center gap-1.5" },
                    singleAudioProgress.total > 1 ? React.createElement("span", null, "(جزء " + singleAudioProgress.current + " من " + singleAudioProgress.total + ")") : null,
                    (singleAudioProgress.total > 1 && (singleAudioProgress.total - singleAudioProgress.current) > 0)
                      ? React.createElement("span", { className: "text-[10px] font-sans font-medium bg-purple-100/80 dark:bg-purple-900/50 px-1.5 py-0.5 rounded text-purple-800 dark:text-purple-200" },
                          "⏳ متبقي: ~" + Math.max(2, (singleAudioProgress.total - singleAudioProgress.current) * 3) + " ثانية"
                        )
                      : null
                  )
                ),
                React.createElement(
                  "div",
                  { className: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden border border-purple-500/20" },
                  React.createElement("div", {
                    className: "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-400 h-full rounded-full transition-all duration-300 shadow-xs",
                    style: { width: Math.max(5, singleAudioProgress.percent || 0) + "%" }
                  })
                ),
                React.createElement("p", { className: "text-[11px] text-purple-800 dark:text-purple-200 font-medium pt-0.5" },
                  singleAudioProgress.statusText || audioStatusText || "جاري الاتصال بمحرك الصوت والتجهيز..."
                )
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

            // 2.6 زر ملف الـ SRT (يظهر عند توفر ملف الصوت فقط لتوليد أو تحديث التزامن الدقيق)
            currentUser && currentUser.role === "admin" && chap.text && chap.audioUrl && (function() {
              var isSrtGen = (srtGeneratingChapId === chap.id);
              var hasSubs = chap.subtitles && Array.isArray(chap.subtitles) && chap.subtitles.length > 0;
              return React.createElement("button", {
                type: "button",
                onClick: function() { handleGenerateOrDownloadSrt(chap); },
                disabled: isSrtGen || !!audioBatchProgress || (generatingAudioChapterId === chap.id),
                className: "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border " +
                  (isSrtGen
                    ? "bg-violet-600 text-white border-violet-600 shadow-md animate-pulse"
                    : hasSubs
                      ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                      : "bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800 active:scale-95"),
                title: hasSubs ? ("تزامن الـ SRT جاهز ومحفوظ بالمشغل (" + chap.subtitles.length + " جملة) - اضغط للتحديث والتنزيل") : "توليد ملف تزامن الكلمات (SRT) للتحكم الدقيق بالقراءة"
              },
              React.createElement("span", null, isSrtGen ? "⏳" : (hasSubs ? "✅" : "⚡")),
              React.createElement("span", null, isSrtGen ? "جاري ضبط SRT..." : (hasSubs ? ("تحديث الـ SRT (" + chap.subtitles.length + ")") : "توليد الـ SRT"))
              );
            })(),

            // 2.7 زر إزالة / حذف ملف الصوت (للأدمن عند الرغبة بإلغاء التراك أو الفايل الفاضي وإعادة التوليد)
            currentUser && currentUser.role === "admin" && chap.audioUrl && typeof handleClearChapterAudio === "function" ? React.createElement("button", {
              type: "button",
              onClick: function() { handleClearChapterAudio(chap.id); },
              disabled: (generatingAudioChapterId === chap.id) || !!audioBatchProgress,
              className: "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-rose-200 dark:border-rose-900 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 active:scale-95",
              title: "حذف ملف الصوت من هذا الفصل ليعود (غير مولد) وتتمكن من إعادة توليده من جديد"
            },
              React.createElement("span", null, "🗑️"),
              React.createElement("span", null, "حذف الصوت")
            ) : null,

            // 3. زر الاستماع للصوت إذا كان متاحاً
            chap.audioUrl ? (function() {
              var savedPos = 0;
              if (activeBook && activeBook.id) {
                try {
                  var s = localStorage.getItem("counsel_audio_pos_" + activeBook.id + "_" + chap.id);
                  if (s) savedPos = parseFloat(s) || 0;
                } catch (e) {}
              }
              var isThisChapterPlaying = isThisPlaying && isAudioPlaying;

              var btnLabel = isThisChapterPlaying
                ? "⏸️ إيقاف"
                : (savedPos > 3 ? ("▶️ استئناف (" + formatTime(savedPos) + ")") : "▶️ استماع");

              return React.createElement("button", {
                type: "button",
                onClick: function() {
                  var audio = chapterAudioRef.current || (utils.getPersistentAudioElement && utils.getPersistentAudioElement());
                  if (isThisChapterPlaying) {
                    if (audio) audio.pause();
                    setPlayingChapterId(null);
                    setIsAudioPlaying(false);
                  } else {
                    setPlayingChapterId(chap.id);
                    if (chap.text && setViewingChapterText) {
                      setViewingChapterText(chap);
                    }
                    if (chap.audioUrl && audio) {
                      var stream = utils.getAudioStreamUrl(chap.audioUrl);
                      if (stream) {
                        var isSame = audio.src && (audio.src === stream || audio.src.endsWith(stream));
                        if (!isSame) {
                          audio.src = stream;
                          restoreSavedPosition(audio, chap.id);
                        }
                        var p = audio.play();
                        if (p && typeof p.catch === "function") {
                          p.catch(function(err) {
                            console.warn("Audio play error:", err);
                          });
                        }
                      }
                    }
                  }
                },
                className: "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 " +
                  (isThisChapterPlaying ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95"),
                title: savedPos > 3 ? ("استئناف الاستماع بدءاً من " + formatTime(savedPos)) : "تشغيل ملف الصوت للفصل"
              }, btnLabel);
            })() : null,

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
              title: "نقل هذا الفصل إلى سلة المحذوفات (مع إمكانية استرجاعه خلال 7 أيام)"
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

