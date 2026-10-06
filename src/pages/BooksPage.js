// شاشة الكتب والمراجع مع فصول الكتاب والملخص الصوتي لكل فصل وحصر الذكاء للمسؤول
window.BooksPage = function(props) {
  var currentUser = props.currentUser || { role: "admin" };
  var utils = window.APP_UTILS;
  var cfg = window.APP_CONFIG;
  var cloud = window.CloudSyncService;
  var ai = window.GeminiAIService;

  var [books, setBooks] = React.useState(function() {
    return utils.getLocal(cfg.storageKeys.books, []);
  });

  var [activeBook, setActiveBook] = React.useState(null);
  var [showAddModal, setShowAddModal] = React.useState(false);
  var [selectedChapter, setSelectedChapter] = React.useState(null);
  var [isAiGenerating, setIsAiGenerating] = React.useState(false);
  var [activeTabByChapter, setActiveTabByChapter] = React.useState({}); // idx -> "written" | "audio"
  var [speakingChapterIdx, setSpeakingChapterIdx] = React.useState(null);
  var [isAudioPaused, setIsAudioPaused] = React.useState(false);
  var [audioProgress, setAudioProgress] = React.useState({ current: 0, total: 0 });
  var [audioPlaybackRate, setAudioPlaybackRate] = React.useState(1.0); // 0.85x, 1.0x, 1.25x, 1.5x
  var [availableVoices, setAvailableVoices] = React.useState([]);
  var [selectedVoiceUri, setSelectedVoiceUri] = React.useState("");
  var [audioDurationSec, setAudioDurationSec] = React.useState(0);
  var [audioElapsedSec, setAudioElapsedSec] = React.useState(0);

  // حقول الإضافة
  var [selectedFile, setSelectedFile] = React.useState(null);
  var [isDraggingFile, setIsDraggingFile] = React.useState(false);
  var [isUploading, setIsUploading] = React.useState(false);
  var [uploadStatusText, setUploadStatusText] = React.useState("");

  var [isAiAnalyzingBook, setIsAiAnalyzingBook] = React.useState(false);
  var [newTitle, setNewTitle] = React.useState("");
  var [newAuthor, setNewAuthor] = React.useState("");
  var [newCoverUrl, setNewCoverUrl] = React.useState("");
  var [newTotalPages, setNewTotalPages] = React.useState(350);
  var [newDriveUrl, setNewDriveUrl] = React.useState("");
  var [newChaptersCount, setNewChaptersCount] = React.useState(8);
  var [includeIntro, setIncludeIntro] = React.useState(true);

  React.useEffect(function() {
    var unsubscribe = cloud.subscribeBooks(function(cloudList) {
      if (cloudList) {
        setBooks(cloudList);
        utils.setLocal(cfg.storageKeys.books, cloudList);
        if (cloudList.length > 0) {
          setActiveBook(function(prev) {
            // إذا كان المستخدم فاتح كتاب بالفعل، نحدث بياناته، وإلا يبقى في صفحة المعرض الرئيسية
            return prev ? (cloudList.find(function(b) { return b.id === prev.id; }) || null) : null;
          });
        } else {
          setActiveBook(null);
        }
      }
    });
    return function() {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // مرجع إدارة تشغيل الصوت المباشر
  var audioPlayerRef = React.useRef({
    utterance: null,
    chunks: [],
    chunkIdx: 0,
    isPlaying: false,
    isPaused: false,
    playbackRate: 1.0,
    chapterIdx: null,
    keepAliveTimer: null
  });

  // تنظيف وإيقاف الصوت
  var stopAudioPlayback = function() {
    var p = audioPlayerRef.current;
    if (p.keepAliveTimer) {
      clearInterval(p.keepAliveTimer);
      p.keepAliveTimer = null;
    }
    p.isPlaying = false;
    p.isPaused = false;
    p.chapterIdx = null;
    p.chunks = [];
    p.chunkIdx = 0;
    p.utterance = null;

    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setSpeakingChapterIdx(null);
    setIsAudioPaused(false);
    setAudioProgress({ current: 0, total: 0 });
  };

  React.useEffect(function() {
    return function() {
      stopAudioPlayback();
    };
  }, []);

  var handlePageChange = function(newPage) {
    if (!activeBook) return;
    var validPage = Math.max(1, Math.min(newPage, activeBook.totalPages || 500));
    setActiveBook(Object.assign({}, activeBook, { currentPage: validPage }));
    cloud.updateBookPage(activeBook.id, validPage);
  };

  // تنظيف النص المقروء من أي تحيات مصطنعة أو عبارات قيادة أو ماركداون
  var cleanSpokenText = function(text) {
    if (!text) return "";
    return text
      .replace(/[#*`_~]/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/أهلاً بك( أيها الزميل الدارس)?( في رحلة هادئة ومغذية للروح والوجدان)?[،.]?/g, "")
      .replace(/أهلاً بك عزيزي (المستمع|الدارس|القارئ)[،.]?/g, "")
      .replace(/مرحباً بك( عزيزي)?[،.]?/g, "")
      .replace(/بصفتي (الذكاء الاصطناعي|مساعدك الذكي)[،.]?/g, "")
      .replace(/بينما تقود سيارتك( الآن)?[،.]?/g, "")
      .replace(/أثناء القيادة( بالسيارة)?[،.]?/g, "")
      .replace(/في سيارتك[،.]?/g, "")
      .replace(/أثناء قيادتك للسيارة[،.]?/g, "")
      .replace(/أثناء قيادة السيارة[،.]?/g, "")
      .replace(/للاستماع أثناء القيادة[،.]?/g, "")
      .replace(/في طريقك[،.]?/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // تقسيم النص إلى جمل متوسطة مريحة للأذن ولا تقطع في أي متصفح
  var splitIntoSpokenChunks = function(text) {
    if (!text) return [];
    var rawParts = text.split(/([.\n،؛!؟]+)/);
    var chunks = [];
    var cur = "";
    for (var i = 0; i < rawParts.length; i++) {
      var part = rawParts[i].trim();
      if (!part) continue;
      if ((cur + " " + part).length <= 110) {
        cur = cur ? (cur + " " + part) : part;
      } else {
        if (cur) chunks.push(cur);
        if (part.length > 110) {
          var words = part.split(/\s+/);
          var subCur = "";
          for (var w = 0; w < words.length; w++) {
            if ((subCur + " " + words[w]).length <= 110) {
              subCur = subCur ? (subCur + " " + words[w]) : words[w];
            } else {
              if (subCur) chunks.push(subCur);
              subCur = words[w];
            }
          }
          if (subCur) cur = subCur;
          else cur = "";
        } else {
          cur = part;
        }
      }
    }
    if (cur) chunks.push(cur);
    return chunks.length > 0 ? chunks : [text];
  };

  // تحميل قائمة الأصوات المتاحة بالجهاز فور توفرها
  React.useEffect(function() {
    var updateVoicesList = function() {
      if (!("speechSynthesis" in window)) return;
      var voices = window.speechSynthesis.getVoices() || [];
      var ar = voices.filter(function(v) {
        var l = (v.lang || "").toLowerCase();
        return l.startsWith("ar") || l.indexOf("arabic") !== -1;
      });
      // إذا لم يكن هناك أصوات عربية، نعرض كل الأصوات
      var list = ar.length > 0 ? ar : voices;
      setAvailableVoices(list);
      if (list.length > 0 && !selectedVoiceUri) {
        setSelectedVoiceUri(list[0].voiceURI || list[0].name);
      }
    };

    updateVoicesList();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoicesList;
    }
  }, []);

  // عداد الوقت المنقضي أثناء تشغيل الصوت
  React.useEffect(function() {
    var timer = null;
    if (speakingChapterIdx !== null && !isAudioPaused) {
      timer = setInterval(function() {
        setAudioElapsedSec(function(prev) { return prev + 1; });
      }, 1000);
    }
    return function() {
      if (timer) clearInterval(timer);
    };
  }, [speakingChapterIdx, isAudioPaused]);

  // دالة لاختيار أفضل صوت أنثوي مصري أو عربي متاح (منع الأصوات الإنجليزية تماماً)
  var getBestEgyptianFemaleVoice = function() {
    if (!("speechSynthesis" in window)) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    if (!voices || voices.length === 0) return null;

    // فلترة الأصوات العربية فقط واستبعاد أي لغة أخرى
    var arVoices = voices.filter(function(v) {
      var l = (v.lang || "").toLowerCase();
      return l.startsWith("ar") || l.indexOf("arabic") !== -1;
    });

    if (arVoices.length === 0) {
      // لا يوجد صوت عربي مثبت بنظام الجهاز، لا نستخدم صوتاً إنجليزياً أبداً
      return null;
    }

    // إذا كان المستخدم اختار صوتاً محدداً وهو عربي
    if (selectedVoiceUri) {
      var userV = arVoices.find(function(v) { return (v.voiceURI || v.name) === selectedVoiceUri; });
      if (userV) return userV;
    }

    // 1. صوت مصري أنثوي صريح (ar-EG + female/salma/laila/mariam/hoda)
    var egFemale = arVoices.find(function(v) {
      var l = (v.lang || "").toLowerCase();
      var n = (v.name || "").toLowerCase();
      var isEg = l.indexOf("eg") !== -1 || n.indexOf("egypt") !== -1 || n.indexOf("مصر") !== -1;
      var isFem = n.indexOf("female") !== -1 || n.indexOf("salma") !== -1 || n.indexOf("hoda") !== -1 || n.indexOf("laila") !== -1 || n.indexOf("mariam") !== -1 || n.indexOf("zeina") !== -1;
      return isEg && isFem;
    });
    if (egFemale) return egFemale;

    // 2. أي صوت أنثوي عربي عام (سلمى، ليلى، زينة، مريم، فاطمة)
    var arFemale = arVoices.find(function(v) {
      var n = (v.name || "").toLowerCase();
      return n.indexOf("female") !== -1 || n.indexOf("salma") !== -1 || n.indexOf("hoda") !== -1 || n.indexOf("laila") !== -1 || n.indexOf("mariam") !== -1 || n.indexOf("zeina") !== -1 || n.indexOf("zari") !== -1 || n.indexOf("fatima") !== -1;
    });
    if (arFemale) return arFemale;

    // 3. أي صوت مصري متاح
    var egGen = arVoices.find(function(v) {
      var l = (v.lang || "").toLowerCase();
      var n = (v.name || "").toLowerCase();
      return l.indexOf("eg") !== -1 || n.indexOf("egypt") !== -1;
    });
    if (egGen) return egGen;

    // 4. أول صوت عربي متاح
    return arVoices[0];
  };

  // تشغيل الجملة المحددة بمحرك الكلام الصوتي
  var speakChunkAtIndex = function(idx) {
    var p = audioPlayerRef.current;
    if (!p.isPlaying || p.isPaused) return;

    if (idx < 0 || idx >= p.chunks.length) {
      stopAudioPlayback();
      return;
    }

    p.chunkIdx = idx;
    setAudioProgress({ current: idx + 1, total: p.chunks.length });

    // تحديث موضع الوقت التقديري بناءً على الجملة
    if (audioDurationSec > 0 && p.chunks.length > 0) {
      var estSec = Math.floor((idx / p.chunks.length) * audioDurationSec);
      setAudioElapsedSec(estSec);
    }

    if (!("speechSynthesis" in window)) {
      alert("خاصية الصوت غير مدعومة في هذا المتصفح.");
      stopAudioPlayback();
      return;
    }

    var chunk = p.chunks[idx];
    if (!chunk || !chunk.trim()) {
      if (idx + 1 < p.chunks.length) {
        speakChunkAtIndex(idx + 1);
      } else {
        stopAudioPlayback();
      }
      return;
    }

    var utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = p.playbackRate || 0.95; // سرعة هادئة وطبيعية
    utterance.pitch = 1.15; // نبرة صوت أنثوية ناعمة

    var voice = getBestEgyptianFemaleVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "ar-EG";
    } else {
      // إجبار المتصفح على قراءة النص بالعربية المصرية حصراً، وعدم استخدام الصوت الافتراضي الإنجليزي للجهاز
      utterance.lang = "ar-EG";
    }

    // حفظ المرجع عالمياً لمنع V8 Garbage Collection من قطع الصوت فوراً
    window._activeTtsUtterance = utterance;
    p.utterance = utterance;

    // علم لمنع التكرار المزدوج
    var hasHandledCompletion = false;

    utterance.onend = function(e) {
      if (hasHandledCompletion) return;
      hasHandledCompletion = true;
      window._activeTtsUtterance = null;
      if (!p.isPlaying || p.isPaused) return;

      if (p.chunkIdx + 1 < p.chunks.length) {
        speakChunkAtIndex(p.chunkIdx + 1);
      } else {
        stopAudioPlayback();
      }
    };

    utterance.onerror = function(err) {
      if (hasHandledCompletion) return;
      window._activeTtsUtterance = null;
      if (!p.isPlaying || p.isPaused) return;

      console.warn("TTS Error Notice:", err && err.error);

      // في حالة وجود خطأ في المحرك أو عدم توفر الصوت، أوقف المحاولة التلقائية المتكررة حتى لا يجري في ثانيتين
      hasHandledCompletion = true;
      stopAudioPlayback();
      if (err && err.error !== "canceled" && err.error !== "interrupted") {
        alert("تنبيه: محرك الصوت في جهازك/متصفحك يواجه صعوبة في تشغيل الصوت العربي. يرجى التأكد من تفعيل صوت عربي أو استخدام متصفح كروم / إيدج.");
      }
    };

    // استئناف محرك الصوت وإلغاء أي تعليق
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("speechSynthesis.speak failed:", e);
      stopAudioPlayback();
    }
  };

  // تشغيل / إيقاف المشغل الصوتي
  var handleToggleSpeech = function(chapterIndex, textToRead) {
    var p = audioPlayerRef.current;

    if (speakingChapterIdx === chapterIndex) {
      if (isAudioPaused) {
        // استئناف
        p.isPaused = false;
        setIsAudioPaused(false);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          speakChunkAtIndex(p.chunkIdx);
        }
      } else {
        // إيقاف مؤقت
        p.isPaused = true;
        setIsAudioPaused(true);
        if (window.speechSynthesis) {
          window.speechSynthesis.pause();
        }
      }
      return;
    }

    // إيقاف المشغل السابق بهدوء بدون إفساد المحرك
    p.isPlaying = false;
    p.isPaused = false;
    window._activeTtsUtterance = null;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    var cleanText = cleanSpokenText(textToRead);
    if (!cleanText) {
      alert("لا يوجد نص متاح للقراءة في هذا الملخص.");
      return;
    }

    var chunks = splitIntoSpokenChunks(cleanText);
    if (chunks.length === 0) return;

    // حساب المدة التقديرية بالثواني بناءً على عدد الكلمات (معدل 130 كلمة بالدقيقة)
    var wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    var estTotalSeconds = Math.max(30, Math.round((wordCount / 130) * 60));
    setAudioDurationSec(estTotalSeconds);
    setAudioElapsedSec(0);

    p.isPlaying = true;
    p.isPaused = false;
    p.chapterIdx = chapterIndex;
    p.chunks = chunks;
    p.chunkIdx = 0;
    p.playbackRate = audioPlaybackRate;

    setSpeakingChapterIdx(chapterIndex);
    setIsAudioPaused(false);

    // تأخير طفيف (100ms) بعد cancel() لضمان أن Web Speech API أفرغ الطابور ولا يلغي الـ utterance الجديدة
    setTimeout(function() {
      if (audioPlayerRef.current.isPlaying) {
        speakChunkAtIndex(0);
      }
    }, 100);
  };

  // تقديم 10 ثوانٍ (جملة للأمام)
  var handleAudioSeekForward = function() {
    var p = audioPlayerRef.current;
    if (!p.isPlaying) return;
    var nextIdx = Math.min(p.chunks.length - 1, p.chunkIdx + 1);
    p.isPaused = false;
    setIsAudioPaused(false);
    speakChunkAtIndex(nextIdx);
  };

  // ترجيع 10 ثوانٍ (جملة للخلف)
  var handleAudioSeekBackward = function() {
    var p = audioPlayerRef.current;
    if (!p.isPlaying) return;
    var prevIdx = Math.max(0, p.chunkIdx - 1);
    p.isPaused = false;
    setIsAudioPaused(false);
    speakChunkAtIndex(prevIdx);
  };

  // القفز إلى موضع محدد عبر شريط التقدم التفاعلي (Slider)
  var handleAudioProgressSeek = function(e) {
    var p = audioPlayerRef.current;
    if (!p.isPlaying || p.chunks.length === 0) return;
    var targetFraction = parseFloat(e.target.value);
    var targetIdx = Math.min(p.chunks.length - 1, Math.floor(targetFraction * p.chunks.length));
    var newElapsed = Math.floor(targetFraction * audioDurationSec);
    setAudioElapsedSec(newElapsed);
    p.isPaused = false;
    setIsAudioPaused(false);
    speakChunkAtIndex(targetIdx);
  };

  // تغيير سرعة القراءة (1x, 1.25x, 1.5x, 0.85x)
  var handleAudioSpeedChange = function(newRate) {
    setAudioPlaybackRate(newRate);
    var p = audioPlayerRef.current;
    p.playbackRate = newRate;
    if (p.isPlaying && !p.isPaused) {
      speakChunkAtIndex(p.chunkIdx);
    }
  };

  // تغيير صوت القارئ (ذكر / أنثى) فوراً
  var handleVoiceChange = function(voiceUri) {
    setSelectedVoiceUri(voiceUri);
    var p = audioPlayerRef.current;
    if (p.isPlaying && !p.isPaused) {
      speakChunkAtIndex(p.chunkIdx);
    }
  };

  // توليد ملخص صوتي ومكتوب احترافي بدون عبارات نمطية
  var handleGenerateChapterSummary = async function(chapterIndex) {
    if (!activeBook || currentUser.role !== "admin") return;

    var existingKey = await ai.getApiKey();
    if (!existingKey) {
      var entered = window.prompt("يرجى إدخال مفتاح Gemini API لتفعيل التلخيص الذكي وحفظه سحابياً ومحلياً:");
      if (!entered || !entered.trim()) {
        return;
      }
      await ai.saveApiKey(entered.trim());
      utils.setLocal(cfg.storageKeys.apiKey, entered.trim());
    }

    setIsAiGenerating(true);
    try {
      var ch = (activeBook.chapters || [])[chapterIndex];
      var chName = ch.title || ("الفصل " + chapterIndex);
      var prompt = "أنت باحث ومتخصص في علوم المشورة والنمو الإنساني.\n" +
        "قم بإعداد دراسة وتلخيص مركز ومكثف لـ: '" + chName + "' من كتاب: '" + activeBook.title + "' للمؤلف '" + (activeBook.author || "") + "'.\n" +
        "شروط هامة جداً:\n" +
        "- اكتب الملخص المكتوب (writtenSummary) بلغة عربية فصيحة سلسة وواضحة، بأسلوب علمي وإنساني طبيعي.\n" +
        "- اكتب السيناريو الصوتي (audioScript) بلهجة مصرية عامية راقية وودودة وهادئة (مثل بودكاست مصري مشوق يقرأ بصوت متكلمة مصرية تشرح لصديق)، يسهل جداً على الأذن سماعه وفهمه والاستمتاع به.\n" +
        "- ادخل مباشرة في جوهر الأفكار والتحليل النفسي والروحي والتطبيقات العملية دون أي مقدمات نمطية أو ترحيبات سطحية.\n" +
        "- لا تذكر نهائياً عبارات مثل (أثناء القيادة، السيارة، الذكاء الاصطناعي، مرحباً بك، بصفتي مساعدك).\n" +
        "المطلوب إرجاع صيغة JSON نظيفة:\n" +
        "{\n" +
        '  "writtenSummary": "أهم المفاهيم الجوهرية والنقاط العملية المشروحة بوضوح للقراءة السريعة والمذاكرة بالفصحى المبسطة",\n' +
        '  "audioScript": "نص صوتي مشوق بالعامية المصرية الهادئة والراقية، يدخل في صلب الموضوع مباشرة ويشرح الأفكار بعمق وبساطة تامة كأنها جلسة ودية ممتعة في 3-5 دقائق"\n' +
        "}\n" +
        "أرجع الـ JSON فقط بدون علامات ماركداون إضافية وبدون أي نصوص خارجية.";
      
      var res = await ai.callGemini(prompt);
      var cleanJson = res.replace(/```json/gi, "").replace(/```/g, "").trim();
      var parsed;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        parsed = {
          writtenSummary: res,
          audioScript: res
        };
      }
      
      var updatedChapters = (activeBook.chapters || []).slice();
      updatedChapters[chapterIndex] = Object.assign({}, updatedChapters[chapterIndex], {
        summaryText: parsed.writtenSummary || res,
        audioScript: parsed.audioScript || parsed.writtenSummary || res,
        hasAudio: true,
        lastAudioPosition: 0
      });

      var updatedBook = Object.assign({}, activeBook, { chapters: updatedChapters });
      cloud.saveBook(updatedBook);
      setActiveBook(updatedBook);
    } catch (err) {
      alert("حدث خطأ أثناء التوليد: " + err.message);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // حفظ موضع استماع الملخص الصوتي للفصل
  var handleSaveChapterAudioPos = function(chapterIndex, sec) {
    if (!activeBook) return;
    var updatedChapters = (activeBook.chapters || []).slice();
    updatedChapters[chapterIndex] = Object.assign({}, updatedChapters[chapterIndex], {
      lastAudioPosition: sec
    });
    var updatedBook = Object.assign({}, activeBook, { chapters: updatedChapters });
    setActiveBook(updatedBook);
    cloud.saveBook(updatedBook);
  };

  var handleAutoFillWithAi = async function() {
    var query = (newTitle || (selectedFile ? selectedFile.name : "")).trim();
    if (!query) {
      alert("يرجى اختيار ملف أو كتابة اسم تقريبي للكتاب أولاً لكي يستطيع الذكاء الاصطناعي تحليله.");
      return;
    }

    setIsAiAnalyzingBook(true);
    try {
      var prompt = "أنت خبير في مراجع وكتب المشورة والتربية والنمو النفسي والروحي (مثل كتب بيتر سكزيرو، أوسم وصفي، هنري كلاود، جون تاونسند، إميل جورج، عادل حليم وغيرهم).\n" +
        "بناءً على هذا الاسم أو اسم الملف: '" + query + "':\n" +
        "المطلوب تحديد بدقة بيانات الكتاب وإرجاعها فقط بصيغة JSON نظيفة:\n" +
        "{\n" +
        '  "title": "اسم الكتاب الدقيق بالعربية",\n' +
        '  "author": "اسم الكاتب / المؤلف بالعربية",\n' +
        '  "totalPages": عدد الصفحات التقريبي المعتاد لهذا الكتاب (رقم صحيح),\n' +
        '  "chaptersCount": عدد فصول الكتاب المعتادة (رقم صحيح)\n' +
        "}\n" +
        "أرجع الـ JSON فقط بدون أي نصوص قبلية أو بعدية وبدون ماركداون.";

      var res = await ai.callGemini(prompt);
      var cleanJson = res.replace(/```json/gi, "").replace(/```/g, "").trim();
      var parsed = JSON.parse(cleanJson);

      if (parsed.title) setNewTitle(parsed.title);
      if (parsed.author) setNewAuthor(parsed.author);
      if (parsed.totalPages && Number(parsed.totalPages) > 0) setNewTotalPages(Number(parsed.totalPages));
      if (parsed.chaptersCount && Number(parsed.chaptersCount) > 0) setNewChaptersCount(Number(parsed.chaptersCount));
    } catch (err) {
      alert("تنبيه: تعذر إكمال التحليل التلقائي: " + err.message + " (تأكد من إدخال مفتاح الذكاء في الإعدادات أو كتابة اسم أوضح).");
    } finally {
      setIsAiAnalyzingBook(false);
    }
  };

  var processSelectedFile = function(file) {
    if (!file) return;
    setSelectedFile(file);
    var rawName = file.name.replace(/\.[^/.]+$/, "");
    if (!newTitle.trim()) {
      if (rawName.indexOf(" - ") !== -1) {
        var parts = rawName.split(" - ");
        setNewTitle(parts[0].trim());
        if (!newAuthor.trim() && parts[1]) {
          setNewAuthor(parts[1].trim());
        }
      } else if (rawName.indexOf(" _ ") !== -1) {
        var partsUnderscore = rawName.split(" _ ");
        setNewTitle(partsUnderscore[0].trim());
        if (!newAuthor.trim() && partsUnderscore[1]) {
          setNewAuthor(partsUnderscore[1].trim());
        }
      } else {
        setNewTitle(rawName);
      }
    }
  };

  var handleFileSelect = function(e) {
    var file = e.target.files && e.target.files[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  var handleAddBook = async function(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    var finalDriveUrl = newDriveUrl.trim();

    if (selectedFile) {
      try {
        setIsUploading(true);
        setUploadStatusText("جاري قراءة ملف الكتاب...");

        var base64Data = await new Promise(function(resolve, reject) {
          var reader = new FileReader();
          reader.onload = function() {
            var result = reader.result;
            var base64 = typeof result === "string" && result.includes(",") ? result.split(",")[1] : result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        setUploadStatusText("جاري رفع الكتاب إلى التخزين السحابي...");

        var response = await fetch(cfg.driveUploadEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            mimeType: selectedFile.type || "application/pdf",
            base64Data: base64Data
          })
        });

        var resData = await response.json();
        if (resData.status === "success" && (resData.fileUrl || resData.fileId)) {
          finalDriveUrl = resData.fileUrl || ("https://drive.google.com/file/d/" + resData.fileId + "/view");
        } else {
          throw new Error(resData.message || "تعذر إكمال رفع الكتاب");
        }
      } catch (err) {
        alert("تنبيه: حدث خطأ أثناء رفع الكتاب: " + err.message);
        setIsUploading(false);
        setUploadStatusText("");
        return;
      }
    }

    // تجهيز مصفوفة الفصول الافتراضية مع تضمين المقدمة
    var chapters = [];
    if (includeIntro) {
      chapters.push({
        number: 0,
        title: "المقدمة والمدخل",
        summaryText: "",
        audioScript: "",
        hasAudio: false,
        lastAudioPosition: 0
      });
    }

    var count = parseInt(newChaptersCount) || 5;
    for (var i = 1; i <= count; i++) {
      chapters.push({
        number: i,
        title: "الفصل " + i,
        summaryText: "",
        audioScript: "",
        hasAudio: false,
        lastAudioPosition: 0
      });
    }

    var newB = {
      id: "book-" + Date.now(),
      title: newTitle.trim(),
      author: newAuthor.trim() || "غير محدد",
      coverUrl: (newCoverUrl || "").trim(),
      totalPages: parseInt(newTotalPages) || 300,
      currentPage: 1,
      driveUrl: finalDriveUrl,
      chapters: chapters
    };

    cloud.saveBook(newB);
    setShowAddModal(false);
    setIsUploading(false);
    setSelectedFile(null);
    setNewTitle("");
    setNewAuthor("");
    setNewCoverUrl("");
    setNewDriveUrl("");
  };

  return React.createElement(
    "div",
    { className: "space-y-6 pb-12" },

    // ترويسة
    React.createElement(
      "div",
      { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm" },
      React.createElement(
        "div",
        null,
        React.createElement("h2", { className: "text-xl font-bold text-slate-900 dark:text-white" }, "المراجع والكتب الدراسية"),
        React.createElement("p", { className: "text-xs text-slate-500 mt-1" }, "مطالعة كتب الـ PDF مع حفظ الصفحة والملخصات الصوتية والنصية لكل فصل")
      ),
      currentUser.role === "admin" && React.createElement(
        "button",
        {
          onClick: function() { setShowAddModal(true); },
          className: "bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-md flex items-center gap-2"
        },
        React.createElement("span", null, "➕"),
        React.createElement("span", null, "إضافة مرجع جديد")
      )
    ),

    // شريط اختيار الكتاب السريع في حال كان هناك كتاب مفتوح ويوجد عدة مراجع
    activeBook && books.length > 1 && React.createElement(
      "div",
      { className: "flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin" },
      books.map(function(b) {
        var isSelected = activeBook && activeBook.id === b.id;
        return React.createElement(
          "button",
          {
            key: b.id,
            onClick: function() {
              stopAudioPlayback();
              setActiveBook(b);
            },
            className: "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all " +
              (isSelected
                ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50")
          },
          React.createElement("span", null, "📖"),
          React.createElement("span", null, b.title)
        );
      })
    ),

    // الكتاب النشط أو معرض الكتب والمراجع
    activeBook ? React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6" },

      // رأس الكتاب وزر العودة للمعرض والتحكم بالصفحات
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" },
        React.createElement(
          "div",
          { className: "flex items-center gap-3" },
          // زر العودة لقائمة الكتب
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() {
                stopAudioPlayback();
                setActiveBook(null);
              },
              title: "الرجوع لقائمة الكتب والمراجع",
              className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
            },
            React.createElement("span", null, "←"),
            React.createElement("span", null, "كل الكتب")
          ),
          React.createElement(
            "div",
            null,
            React.createElement("h3", { className: "text-lg font-bold text-slate-900 dark:text-white" }, activeBook.title),
            React.createElement("p", { className: "text-xs text-slate-500" }, "المؤلف: " + activeBook.author + " • إجمالي الصفحات: " + activeBook.totalPages + " صفحة")
          )
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl" },
          React.createElement("button", {
            onClick: function() { handlePageChange((activeBook.currentPage || 1) - 1); },
            className: "w-8 h-8 rounded-xl bg-white dark:bg-slate-700 font-bold flex items-center justify-center shadow-sm"
          }, "◀"),
          React.createElement("div", { className: "px-3 text-center" },
            React.createElement("span", { className: "text-xs text-slate-400 block" }, "صفحة"),
            React.createElement("span", { className: "text-base font-extrabold text-emerald-600 dark:text-emerald-400" }, activeBook.currentPage || 1)
          ),
          React.createElement("button", {
            onClick: function() { handlePageChange((activeBook.currentPage || 1) + 1); },
            className: "w-8 h-8 rounded-xl bg-white dark:bg-slate-700 font-bold flex items-center justify-center shadow-sm"
          }, "▶")
        )
      ),

      // عارض الـ PDF
      activeBook.driveUrl && React.createElement(
        "div",
        { className: "w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 h-[500px] relative" },
        React.createElement("iframe", {
          src: utils.getDrivePreviewUrl(activeBook.driveUrl),
          className: "w-full h-full border-0",
          title: activeBook.title
        })
      ),

      // قسم فصول الكتاب والملخصات الصوتية والنصية (Chapter Audio & Summary)
      React.createElement(
        "div",
        { className: "space-y-3 pt-2" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between" },
          React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, "فصول الكتاب والملخصات الصوتية والنصية"),
          !(activeBook.chapters || []).some(function(c) { return c.title && c.title.includes("المقدمة"); }) && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() {
                var updatedChapters = [{
                  number: 0,
                  title: "المقدمة والمدخل",
                  summaryText: "",
                  audioScript: "",
                  hasAudio: false,
                  lastAudioPosition: 0
                }].concat(activeBook.chapters || []);
                var updatedBook = Object.assign({}, activeBook, { chapters: updatedChapters });
                cloud.saveBook(updatedBook);
                setActiveBook(updatedBook);
              },
              className: "text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 transition-all shadow-xs"
            },
            "➕ إضافة ملخص المقدمة لهذا الكتاب"
          )
        ),
        React.createElement(
          "div",
          { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
          (activeBook.chapters || []).map(function(ch, idx) {
            var currentTab = activeTabByChapter[idx] || "written"; // 'written' or 'audio'
            var isSpeaking = speakingChapterIdx === idx;
            var hasSummary = !!(ch.summaryText || ch.audioScript);

            return React.createElement(
              "div",
              {
                key: idx,
                className: "p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3 shadow-xs"
              },
              // عنوان الفصل والشارات
              React.createElement(
                "div",
                { className: "flex items-center justify-between" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-900 dark:text-white" }, ch.title || ("الفصل " + (idx + 1))),
                  ch.number === 0 && React.createElement("span", { className: "text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md font-bold" }, "تمهيدي")
                ),
                ch.hasAudio && React.createElement("span", { className: "text-[11px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg font-bold" },
                  "جاهز بالذكاء ✨"
                )
              ),

              // أزرار الاختيار: مكتوب أو صوتي
              hasSummary && React.createElement(
                "div",
                { className: "flex items-center p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold" },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() {
                      setActiveTabByChapter(Object.assign({}, activeTabByChapter, { [idx]: "written" }));
                    },
                    className: "flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 " +
                      (currentTab === "written"
                        ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900")
                  },
                  React.createElement("span", null, "📖"),
                  React.createElement("span", null, "ملخص مكتوب")
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() {
                      setActiveTabByChapter(Object.assign({}, activeTabByChapter, { [idx]: "audio" }));
                    },
                    className: "flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 " +
                      (currentTab === "audio"
                        ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900")
                  },
                  React.createElement("span", null, "🎙️"),
                  React.createElement("span", null, "ملخص صوتي مسموع")
                )
              ),

              // نصوص الملخص أو زر التوليد
              hasSummary ? React.createElement(
                "div",
                { className: "space-y-3" },
                currentTab === "written" ? React.createElement(
                  "div",
                  { className: "text-xs text-slate-600 dark:text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 leading-relaxed font-normal" },
                  ch.summaryText || "لا يوجد نص ملخص مكتوب متاح"
                ) : React.createElement(
                  "div",
                  { className: "space-y-2.5" },
                  React.createElement(
                    "div",
                    { className: "text-xs text-slate-600 dark:text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 leading-relaxed font-normal" },
                    cleanSpokenText(ch.audioScript || ch.summaryText)
                  ),
                  // مشغل صوتي تفاعلي متكامل (شريط تشغيل + أوقات + اختيار الصوت + سرعات)
                  React.createElement(
                    "div",
                    { className: "p-3.5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/70 rounded-2xl border border-slate-700/60 dark:border-emerald-800/40 shadow-md space-y-3 text-xs" },
                    
                    // شريط العنوان وحالة التشغيل واختيار الصوت
                    React.createElement(
                      "div",
                      { className: "flex flex-wrap items-center justify-between gap-2" },
                      React.createElement(
                        "div",
                        { className: "flex items-center gap-1.5" },
                        React.createElement("span", { className: "text-base" }, isSpeaking ? (isAudioPaused ? "⏸️" : "🔊") : "🎧"),
                        React.createElement("span", { className: "font-bold text-xs" }, isSpeaking ? (isAudioPaused ? "متوقف مؤقتاً" : "جاري الاستماع الآن") : "مشغل الملخص الصوتي"),
                        isSpeaking && audioProgress.total > 0 && React.createElement(
                          "span",
                          { className: "text-[11px] bg-slate-800/90 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-slate-700" },
                          audioProgress.current + " / " + audioProgress.total
                        )
                      ),

                      // أدوات الجانب الأيسر: زر الإنهاء
                      React.createElement(
                        "div",
                        { className: "flex items-center gap-2 mr-auto" },
                        // زر إنهاء الاستماع
                        isSpeaking && React.createElement(
                          "button",
                          {
                            type: "button",
                            onClick: stopAudioPlayback,
                            className: "text-[11px] text-rose-300 hover:text-white font-medium px-2 py-1 rounded-lg bg-rose-950/60 border border-rose-800/60 transition-all active:scale-95"
                          },
                          "⏹️ إنهاء"
                        )
                      )
                    ),

                    // شريط التراك التفاعلي (Track Progress Bar + أوقات المنقضي والمتبقي)
                    React.createElement(
                      "div",
                      { className: "space-y-1 pt-1" },
                      React.createElement(
                        "div",
                        { className: "relative flex items-center" },
                        React.createElement("input", {
                          type: "range",
                          min: "0",
                          max: "1",
                          step: "0.01",
                          value: (audioProgress.total > 0 ? (audioProgress.current / audioProgress.total) : 0),
                          onChange: handleAudioProgressSeek,
                          disabled: !isSpeaking,
                          className: "w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:h-2 transition-all disabled:opacity-40"
                        })
                      ),
                      // عرض: الوقت المنقضي - مدة التراك - الوقت المتبقي
                      React.createElement(
                        "div",
                        { className: "flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5" },
                        React.createElement(
                          "span",
                          { className: "text-emerald-400 font-semibold" },
                          "مضى: " + utils.formatDuration(audioElapsedSec)
                        ),
                        React.createElement(
                          "span",
                          { className: "text-slate-300" },
                          "مدة الملخص: " + utils.formatDuration(audioDurationSec)
                        ),
                        React.createElement(
                          "span",
                          { className: "text-amber-400 font-semibold" },
                          "متبقي: " + utils.formatDuration(Math.max(0, audioDurationSec - audioElapsedSec))
                        )
                      )
                    ),

                    // شريط أزرار التحكم (ترجيع، تشغيل/إيقاف، تقديم، تسريع)
                    React.createElement(
                      "div",
                      { className: "flex flex-wrap items-center justify-between pt-2 gap-2 border-t border-slate-700/60" },
                      
                      // مجموعة أزرار المشغل
                      React.createElement(
                        "div",
                        { className: "flex items-center gap-1.5" },
                        // زر ترجيع 10 ثوانٍ (جملة للخلف)
                        React.createElement(
                          "button",
                          {
                            type: "button",
                            onClick: handleAudioSeekBackward,
                            disabled: !isSpeaking,
                            title: "تخطي جملة للخلف",
                            className: "px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-all active:scale-95 flex items-center gap-1"
                          },
                          React.createElement("span", null, "⏪"),
                          React.createElement("span", { className: "text-[11px] font-mono" }, "10ث")
                        ),

                        // زر تشغيل / إيقاف مؤقت الرئيسي
                        React.createElement(
                          "button",
                          {
                            type: "button",
                            onClick: function() { handleToggleSpeech(idx, ch.audioScript || ch.summaryText); },
                            className: "px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 " +
                              (isSpeaking
                                ? (isAudioPaused ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse")
                                : "bg-emerald-600 hover:bg-emerald-700 text-white")
                          },
                          React.createElement("span", null, isSpeaking ? (isAudioPaused ? "▶️ استئناف" : "⏸️ إيقاف مؤقت") : "▶️ بدء الاستماع")
                        ),

                        // زر تقديم 10 ثوانٍ (جملة للأمام)
                        React.createElement(
                          "button",
                          {
                            type: "button",
                            onClick: handleAudioSeekForward,
                            disabled: !isSpeaking,
                            title: "تخطي جملة للأمام",
                            className: "px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-all active:scale-95 flex items-center gap-1"
                          },
                          React.createElement("span", { className: "text-[11px] font-mono" }, "10ث"),
                          React.createElement("span", null, "⏩")
                        )
                      ),

                      // خيارات السرعة (0.85x, 1x, 1.25x, 1.5x)
                      React.createElement(
                        "div",
                        { className: "flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60" },
                        [0.85, 1.0, 1.25, 1.5].map(function(speed) {
                          var isActive = audioPlaybackRate === speed;
                          return React.createElement(
                            "button",
                            {
                              key: speed,
                              type: "button",
                              onClick: function() { handleAudioSpeedChange(speed); },
                              className: "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all " +
                                (isActive
                                  ? "bg-emerald-500 text-slate-950 shadow-xs"
                                  : "text-slate-400 hover:text-white")
                            },
                            speed + "x"
                          );
                        })
                      )
                    )
                  )
                ),
                currentUser.role === "admin" && React.createElement(
                  "div",
                  { className: "flex justify-end pt-1" },
                  React.createElement(
                    "button",
                    {
                      onClick: function() { handleGenerateChapterSummary(idx); },
                      disabled: isAiGenerating,
                      className: "text-[11px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline font-medium"
                    },
                    "إعادة توليد وتحديث الملخص"
                  )
                )
              ) : React.createElement(
                "div",
                { className: "text-xs text-slate-400 py-3 flex items-center justify-between" },
                React.createElement("span", null, "لم يتم إعداد ملخص هذا الجزء بعد"),
                currentUser.role === "admin" && React.createElement("button", {
                  onClick: function() { handleGenerateChapterSummary(idx); },
                  disabled: isAiGenerating,
                  className: "text-xs px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                },
                React.createElement("span", null, isAiGenerating ? "⏳" : "✨"),
                React.createElement("span", null, isAiGenerating ? "جاري التوليد..." : "توليد الملخص (صوتي ومكتوب)")
                )
              )
            );
          })
        )
      )
    ) : (books.length > 0 ? React.createElement(
      "div",
      { className: "space-y-4" },
      // ترويسة رف الكتب
      React.createElement(
        "div",
        { className: "flex items-center justify-between px-1" },
        React.createElement("h3", { className: "text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2" },
          React.createElement("span", null, "📚"),
          React.createElement("span", null, "رف الكتب والمراجع المعتمدة (" + books.length + ")")
        ),
        React.createElement("span", { className: "text-xs text-slate-400" }, "اضغط على أي كتاب لفتحه وبدء القراءة والاستماع")
      ),

      // شبكة بطاقات الكتب (Book Cover Cards Grid)
      React.createElement(
        "div",
        { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" },
        books.map(function(b, bIdx) {
          // ألوان خلفيات مميزة أنيقة للأغلفة الافتراضية
          var coverPalettes = [
            "from-emerald-800 via-teal-900 to-slate-900",
            "from-indigo-800 via-purple-900 to-slate-900",
            "from-amber-700 via-stone-800 to-slate-900",
            "from-blue-800 via-cyan-900 to-slate-900",
            "from-rose-800 via-slate-900 to-slate-950"
          ];
          var palette = coverPalettes[bIdx % coverPalettes.length];

          return React.createElement(
            "div",
            {
              key: b.id,
              onClick: function() {
                stopAudioPlayback();
                setActiveBook(b);
              },
              className: "group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs hover:shadow-xl hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
            },

            // غلاف الكتاب (Image or Styled Book Spine Cover)
            React.createElement(
              "div",
              {
                className: "w-full aspect-[3/4] rounded-xl overflow-hidden relative shadow-md mb-3 flex flex-col justify-between p-3.5 bg-gradient-to-br " + palette
              },
              b.coverUrl ? React.createElement("img", {
                src: b.coverUrl,
                alt: b.title,
                className: "absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              }) : [
                // تصميم كتاب فخم في حال عدم وجود صورة غلاف خارجية
                React.createElement(
                  "div",
                  { key: "top", className: "flex items-center justify-between text-white/70 text-[10px]" },
                  React.createElement("span", { className: "font-mono" }, "مرجع دراسي"),
                  React.createElement("span", null, "📖")
                ),
                React.createElement(
                  "div",
                  { key: "mid", className: "text-center my-auto px-1" },
                  React.createElement("div", { className: "text-2xl mb-1.5 transform group-hover:scale-110 transition-transform" }, "📕"),
                  React.createElement("h4", { className: "font-extrabold text-white text-xs leading-snug line-clamp-3 text-shadow" }, b.title)
                ),
                React.createElement(
                  "div",
                  { key: "bot", className: "text-center border-t border-white/20 pt-1.5" },
                  React.createElement("p", { className: "text-[10px] text-emerald-300 font-medium truncate" }, b.author || "معهد المشورة")
                )
              ],
              // شارة عدد الفصول
              React.createElement(
                "span",
                {
                  className: "absolute top-2 left-2 text-[9px] font-bold bg-slate-950/80 text-emerald-400 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-700/50"
                },
                ((b.chapters || []).length) + " فصول"
              )
            ),

            // معلومات الكتاب أسفل الغلاف
            React.createElement(
              "div",
              { className: "space-y-1 text-right px-0.5" },
              React.createElement("h4", { className: "font-bold text-xs text-slate-900 dark:text-white line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" }, b.title),
              React.createElement("p", { className: "text-[11px] text-slate-500 truncate" }, "✍️ " + (b.author || "غير محدد")),
              React.createElement(
                "div",
                { className: "flex items-center justify-between pt-1 text-[10px] text-slate-400" },
                React.createElement("span", null, (b.totalPages || 0) + " ص"),
                React.createElement("span", { className: "text-emerald-600 dark:text-emerald-400 font-bold group-hover:underline" }, "فتح الكتاب ◀")
              )
            )
          );
        })
      )
    ) : React.createElement(
      "div",
      { className: "p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 space-y-3" },
      React.createElement("div", { className: "text-3xl" }, "📚"),
      React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "المكتبة جاهزة لاستقبال الكتب والمراجع"),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto" }, "اضغط على زر 'إضافة مرجع جديد' لرفع كتابك الأول بصيغة PDF وتجهيز فصوله.")
    )),

    // نافذة إضافة مرجع جديد
    showAddModal && React.createElement(
      "div",
      { className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b pb-3" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "إضافة مرجع أو كتاب دراسي"),
          !isUploading && React.createElement("button", { onClick: function() { setShowAddModal(false); }, className: "text-slate-400" }, "✕")
        ),
        React.createElement(
          "form",
          { onSubmit: handleAddBook, className: "space-y-3" },
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
          isUploading && React.createElement("div", { className: "p-2.5 bg-slate-900 text-white text-center text-xs rounded-xl animate-pulse" }, uploadStatusText),

          // اسم الكتاب والمؤلف / الكاتب
          React.createElement(
            "div",
            { className: "space-y-3 pt-1" },
            React.createElement(
              "div",
              null,
              React.createElement(
                "div",
                { className: "flex items-center justify-between mb-1" },
                React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "اسم الكتاب / المرجع"),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: handleAutoFillWithAi,
                    disabled: isAiAnalyzingBook || isUploading,
                    className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
                  },
                  React.createElement("span", null, isAiAnalyzingBook ? "⏳" : "✨"),
                  React.createElement("span", null, isAiAnalyzingBook ? "جاري الاستنتاج بالذكاء..." : "استكمال البيانات بالـ AI")
                )
              ),
              React.createElement("input", {
                type: "text",
                required: true,
                value: newTitle,
                onChange: function(e) { setNewTitle(e.target.value); },
                placeholder: "مثال: الروحانية الناضجة وجدانياً، فخاخ العلاقات...",
                className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
              }),
              React.createElement("p", { className: "text-[10px] text-slate-400 mt-1" }, "💡 اكتب الاسم أو اختر ملفاً ثم اضغط 'استكمال البيانات بالـ AI' ليقوم باستخراج الكاتب، عدد الصفحات، وعدد الفصول تلقائياً.")
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
                placeholder: "مثال: د. أوسم وصفي، د. إميل جورج، د. عادل حليم...",
                className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              })
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "رابط صورة غلاف الكتاب (اختياري)"),
              React.createElement("input", {
                type: "url",
                value: newCoverUrl,
                onChange: function(e) { setNewCoverUrl(e.target.value); },
                placeholder: "https://... صورة غلاف الكتاب أو اتركه لاستخدام غلاف افتراضي أنيق",
                className: "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              })
            )
          ),

          // إجمالي الصفحات وعدد الفصول
          React.createElement(
            "div",
            { className: "grid grid-cols-2 gap-3" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-semibold text-slate-500 mb-1" }, "إجمالي الصفحات التقريبي"),
              React.createElement("input", {
                type: "number",
                value: newTotalPages,
                onChange: function(e) { setNewTotalPages(e.target.value); },
                className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              })
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-semibold text-slate-500 mb-1" }, "عدد الفصول للتقسيم"),
              React.createElement("input", {
                type: "number",
                value: newChaptersCount,
                onChange: function(e) { setNewChaptersCount(e.target.value); },
                className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              })
            )
          ),
          React.createElement(
            "label",
            { className: "flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer text-xs text-slate-700 dark:text-slate-300" },
            React.createElement("input", {
              type: "checkbox",
              checked: includeIntro,
              onChange: function(e) { setIncludeIntro(e.target.checked); },
              className: "rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            }),
            React.createElement("span", { className: "font-medium" }, "تضمين قسم تمهيدي لـ 'المقدمة والمدخل' قبل الفصول")
          ),
          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-2" },
            !isUploading && React.createElement("button", { type: "button", onClick: function() { setShowAddModal(false); }, className: "px-4 py-2 text-xs" }, "إلغاء"),
            React.createElement("button", {
              type: "submit",
              disabled: isUploading,
              className: "px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white"
            }, isUploading ? "جاري الرفع..." : "حفظ المرجع وتجهيز الفصول")
          )
        )
      )
    )
  );
};
