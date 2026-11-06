// نافذة مشغل المحاضرة التفاعلي بجميع ألسنتها مع أزرار التحكم والتنقل
window.LectureViewerModal = function(props) {
  var activeLecture = props.activeLecture;
  var onClose = props.onClose;
  var currentUser = props.currentUser || {};
  var utils = props.utils || window.APP_UTILS;
  var cloud = props.cloud || window.CloudSyncService;
  var ai = props.ai || window.GeminiAIService;
  var itemSeqInfo = props.itemSeqInfo || {};
  var isItemExam = props.isItemExam;
  var getLectureStatus = props.getLectureStatus;
  var openEditModal = props.openEditModal;
  var handleDeleteLecture = props.handleDeleteLecture;
  var handleSavePosition = props.handleSavePosition;
  var filteredLectures = props.filteredLectures || [];
  var onSelectLecture = props.onSelectLecture;

  var [activeSubTab, setActiveSubTab] = React.useState("media"); // 'media', 'summary', 'transcript', 'slides', 'mindmap', 'quiz', 'handout', 'notes'
  var [isDisclaimerDismissed, setIsDisclaimerDismissed] = React.useState(false);
  var [mediaStartSeconds, setMediaStartSeconds] = React.useState(null);
  var [activeJumpTimestamp, setActiveJumpTimestamp] = React.useState("");

  React.useEffect(function() {
    setIsDisclaimerDismissed(false);
    setMediaStartSeconds(null);
    setActiveJumpTimestamp("");
  }, [activeLecture ? activeLecture.id : null]);
  var [showPackageModal, setShowPackageModal] = React.useState(false);
  var [showPublishModal, setShowPublishModal] = React.useState(false);
  var [genSummaryPages, setGenSummaryPages] = React.useState(function() {
    return (utils && utils.getLocal) ? (parseInt(utils.getLocal("counsel_gen_summary_pages", 5), 10) || 5) : 5;
  });
  var [genSlidesCount, setGenSlidesCount] = React.useState(function() {
    return (utils && utils.getLocal) ? (parseInt(utils.getLocal("counsel_gen_slides_count", 15), 10) || 15) : 15;
  });
  var [genQuizCount, setGenQuizCount] = React.useState(function() {
    return (utils && utils.getLocal) ? (parseInt(utils.getLocal("counsel_gen_quiz_count", 10), 10) || 10) : 10;
  });
  var [genCustomPrompt, setGenCustomPrompt] = React.useState("");
  var [genSelected, setGenSelected] = React.useState({ transcript: true, summary: true, visuals: true, quiz: true });
  var [isFetchingYouTubeTranscript, setIsFetchingYouTubeTranscript] = React.useState(false);
  var [packageGenStatus, setPackageGenStatus] = React.useState("");
  var [aiEditTarget, setAiEditTarget] = React.useState(null);
  var [aiEditPrompt, setAiEditPrompt] = React.useState("");
  var [isRefining, setIsRefining] = React.useState(false);
  var [isAiGenerating, setIsAiGenerating] = React.useState(false);
  var [quizUserAnswers, setQuizUserAnswers] = React.useState({});
  var [quizSubmitted, setQuizSubmitted] = React.useState(false);
  var [selectedHandoutIndex, setSelectedHandoutIndex] = React.useState(0);
  var [isHandoutFullScreen, setIsHandoutFullScreen] = React.useState(false);
  var [handoutRotation, setHandoutRotation] = React.useState(0); // 0, 90, 180, 270
  var [handoutZoom, setHandoutZoom] = React.useState(100); // 100%, 125%, 150%, 175%, 200%
  var [handoutCurrentPage, setHandoutCurrentPage] = React.useState(function() {
    var saved = utils.getLocal ? utils.getLocal("handout_page_" + (activeLecture ? activeLecture.id : ""), 1) : 1;
    return parseInt(saved) || 1;
  });
  // حالة وحجم خط القراءة لجميع أركان المحاضرة
  var [readingFontSize, setReadingFontSize] = React.useState(function() {
    return (utils.getLocal ? utils.getLocal("counsel_reader_font_size", "md") : "md");
  });

  var handleSetFontSize = function(sz) {
    setReadingFontSize(sz);
    if (utils.setLocal) utils.setLocal("counsel_reader_font_size", sz);
  };

  var fontPixelSize = (readingFontSize === "sm")
    ? "14px"
    : (readingFontSize === "lg")
      ? "18px"
      : (readingFontSize === "xl")
        ? "21px"
        : "16px";

  var fontTextClass = (readingFontSize === "sm")
    ? "text-xs sm:text-sm"
    : (readingFontSize === "lg")
      ? "text-base sm:text-lg"
      : (readingFontSize === "xl")
        ? "text-lg sm:text-xl"
        : "text-sm sm:text-base";

  var renderFontSizeBar = function() {
    return React.createElement(
      "div",
      { className: "flex items-center gap-1.5" },
      React.createElement("span", { className: "text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1" },
        React.createElement("span", null, "🔍"),
        React.createElement("span", null, "حجم الخط:")
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs" },
        [
          { id: "sm", label: "A-", title: "خط مدمج (14 بكسل)" },
          { id: "md", label: "عادي", title: "خط عادي قياسي (16 بكسل)" },
          { id: "lg", label: "A+", title: "خط كبير ومريح (18 بكسل)" },
          { id: "xl", label: "A++", title: "خط كبير جداً (20 بكسل)" }
        ].map(function(fBtn) {
          var isAct = readingFontSize === fBtn.id;
          return React.createElement(
            "button",
            {
              key: fBtn.id,
              type: "button",
              onClick: function() { handleSetFontSize(fBtn.id); },
              title: fBtn.title,
              className: "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer " +
                (isAct
                  ? "bg-indigo-600 text-white shadow-2xs scale-102"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")
            },
            fBtn.label
          );
        })
      )
    );
  };

  var [quickNoteText, setQuickNoteText] = React.useState("");
  var [lectureNotesList, setLectureNotesList] = React.useState([]);
  var [isSavingQuickNote, setIsSavingQuickNote] = React.useState(false);
  var [noteSavedToast, setNoteSavedToast] = React.useState(false);

  // حالة تعديل ولصق التفريغ النصي يدوياً للمسؤول
  var [isEditingTranscript, setIsEditingTranscript] = React.useState(false);
  var [editTranscriptText, setEditTranscriptText] = React.useState("");

  // إعادة ضبط إجابات الكويز والهاند آوت وتحميل الملاحظات عند تغيير المحاضرة
  React.useEffect(function() {
    setQuizUserAnswers({});
    setQuizSubmitted(false);
    setSelectedHandoutIndex(0);
    setIsHandoutFullScreen(false);
    setHandoutRotation(0);
    setHandoutZoom(100);
    setQuickNoteText("");
    if (activeLecture && activeLecture.id) {
      if (utils.getLocal) {
        var saved = utils.getLocal("handout_page_" + activeLecture.id, 1);
        setHandoutCurrentPage(parseInt(saved) || 1);

        var userIdentifier = currentUser ? (currentUser.id || currentUser.email || "user") : "guest";
        var userKey = "counsel_study_personal_notes_" + userIdentifier;
        var allNotes = utils.getLocal(userKey, []) || [];
        var matching = allNotes.filter(function(n) {
          return (n.lectureId && n.lectureId === activeLecture.id) || (n.lectureRef && n.lectureRef === activeLecture.title);
        });
        setLectureNotesList(matching);
      }
    }
  }, [activeLecture ? activeLecture.id : null]);

  var handleSaveQuickNote = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!quickNoteText.trim() || !activeLecture) return;
    setIsSavingQuickNote(true);

    var userIdentifier = currentUser ? (currentUser.id || currentUser.email || "user") : "guest";
    var userKey = "counsel_study_personal_notes_" + userIdentifier;
    var allN = utils.getLocal ? utils.getLocal(userKey, []) : [];

    var newNote = {
      id: "note-" + Date.now(),
      title: "خاطرة: " + (activeLecture.title || "المحاضرة"),
      date: new Date().toISOString().split("T")[0],
      lectureRef: activeLecture.title || "محاضرة",
      lectureId: activeLecture.id || "",
      content: quickNoteText.trim(),
      userId: userIdentifier
    };

    var updated = [newNote].concat(allN);
    if (utils.setLocal) utils.setLocal(userKey, updated);
    if (cloud && cloud.saveNote) cloud.saveNote(newNote, currentUser);

    setLectureNotesList([newNote].concat(lectureNotesList));
    setQuickNoteText("");
    setIsSavingQuickNote(false);
    setNoteSavedToast(true);
    setTimeout(function() { setNoteSavedToast(false); }, 3000);
  };

  var handleHandoutPageChange = function(newPage) {
    var p = Math.max(1, newPage);
    setHandoutCurrentPage(p);
    if (activeLecture && activeLecture.id && utils.setLocal) {
      utils.setLocal("handout_page_" + activeLecture.id, p);
    }
  };

  var handoutScrollContainerRef = React.useRef(null);

  var handleRotateHandout = function() {
    setHandoutRotation(function(prev) { return (prev + 90) % 360; });
  };

  var handleHandoutPageUp = function() {
    if (handoutScrollContainerRef.current) {
      handoutScrollContainerRef.current.scrollBy({ top: -window.innerHeight * 0.8, behavior: "smooth" });
    }
  };

  var handleHandoutPageDown = function() {
    if (handoutScrollContainerRef.current) {
      handoutScrollContainerRef.current.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
    }
  };

  if (!activeLecture) return null;

  var st = getLectureStatus ? getLectureStatus(activeLecture) : {};
  var actSeq = itemSeqInfo[activeLecture.id] || { isExam: isItemExam && isItemExam(activeLecture), num: 1, titleBadge: "#1", fullLabel: "المحاضرة" };

  // إعادة توليد الدليل الدراسي المصور بأسلوب NotebookLM المعمق والمخططات المدمجة
  var handleRegenerateSummaryOnly = async function() {
    if (!activeLecture || currentUser.role !== "admin") return;
    var pages = parseInt(genSummaryPages, 10) || 5;
    var confirmMsg = "هل تريد إعادة بناء الدليل الدراسي المصور (الملخص والمخططات التفاعلية المدمجة - " + pages + " صفحات) بدقة من صلب تفريغ المحاضرة؟";
    if (!window.confirm(confirmMsg)) return;

    var content = (activeLecture.transcript || activeLecture.transcriptText || "").trim();
    if (typeof content === "string") {
      content = content
        .replace(/محاضرة\s+أونلاين\s+عبر\s+زووم\s*\([^)]*\)\s*[-–—]?/gi, "")
        .replace(/عبر\s+زووم/gi, "")
        .replace(/\(من\s+\d+\s+إلى\s+\d+\s+(مساءً|صباحاً|ظهراً)\)/gi, "")
        .trim();
    }
    if (!content || content.length < 100) {
      alert("⚠️ تنبيه أمانة علمية:\n\nلا يمكن بناء الدليل الدراسي المصور لعدم توفر تفريغ نصي مسجل للمحاضرة.\n\nيرجى فتح تبويب (📜 تفريغ المحاضرة من الفيديو) وتوفير التفريغ أولاً عبر جلبه من يوتيوب أو لصقه يدوياً.");
      return;
    }

    setIsAiGenerating(true);
    setPackageGenStatus("جاري صياغة الدليل الدراسي المصور وبناء المخططات البصرية سياقياً...");
    try {
      var summaryRes = await window.EducationalAIService.generateSummaryOnly(
        activeLecture.title,
        content,
        pages
      );
      var updated = Object.assign({}, activeLecture, {
        summaryData: summaryRes,
        summaryDataJson: JSON.stringify(summaryRes)
      });
      await cloud.saveLecture(updated);
      if (onSelectLecture) onSelectLecture(updated);
      alert("تمت إعادة بناء الدليل الدراسي المصور بنجاح مع المخططات البصرية المدمجة!");
    } catch (err) {
      alert("خطأ أثناء إعادة بناء الدليل المصور: " + err.message);
    } finally {
      setIsAiGenerating(false);
      setPackageGenStatus("");
    }
  };

  // إعادة توليد الكويز فقط بالمعايير الصارمة الجديدة والاقتباسات المرجعية
  var handleRegenerateQuizOnly = async function() {
    if (!activeLecture || currentUser.role !== "admin") return;
    var currentQCount = (Array.isArray(activeLecture.quizQuestions) && activeLecture.quizQuestions.length > 0)
      ? activeLecture.quizQuestions.length
      : (parseInt(genQuizCount, 10) || 10);
    var confirmMsg = "هل تريد إعادة استخراج وتوليد أسئلة الكويز (" + currentQCount + " سؤال) بالمعايير الصارمة الجديدة مع المقتطفات المرجعية من صلب تفريغ المحاضرة؟";
    if (!window.confirm(confirmMsg)) return;

    var content = (activeLecture.transcript || activeLecture.transcriptText || "").trim();
    if (typeof content === "string") {
      content = content
        .replace(/محاضرة\s+أونلاين\s+عبر\s+زووم\s*\([^)]*\)\s*[-–—]?/gi, "")
        .replace(/عبر\s+زووم/gi, "")
        .replace(/\(من\s+\d+\s+إلى\s+\d+\s+(مساءً|صباحاً|ظهراً)\)/gi, "")
        .trim();
    }
    if (!content || content.length < 100) {
      alert("⚠️ تنبيه أمانة علمية:\n\nلا يمكن استخراج وتوليد أسئلة الكويز لعدم توفر تفريغ نصي مسجل للمحاضرة.\n\nيرجى فتح تبويب (📜 تفريغ المحاضرة من الفيديو) وتوفير التفريغ أولاً عبر جلبه من يوتيوب أو لصقه يدوياً.");
      return;
    }

    setIsAiGenerating(true);
    setPackageGenStatus("جاري استخراج أسئلة الكويز المقتبسة بدقة...");
    try {
      var quizRes = await window.EducationalAIService.generateQuizOnly(
        activeLecture.title,
        content,
        currentQCount
      );
      var questions = Array.isArray(quizRes.questions) ? quizRes.questions : (Array.isArray(quizRes) ? quizRes : []);
      
      // التخيير الصريح للمستخدم في حال كان العدد المستخرج أقل من المطلوب
      if (questions.length < currentQCount) {
        var keepIncomplete = window.confirm(
          "تنبيه حول عدد أسئلة الكويز:\n\n" +
          "تم استخراج وتوثيق " + questions.length + " سؤالاً بنجاح من أصل " + currentQCount + " سؤالاً طُلبت.\n\n" +
          "• اضغط (موافق / OK) لاعتماد وحفظ هذه الأسئلة (" + questions.length + " سؤال).\n" +
          "• اضغط (إلغاء / Cancel) لعدم الحفظ وإعادة المحاولة لتوليد العدد كاملاً (" + currentQCount + " سؤال)."
        );
        if (!keepIncomplete) {
          setIsAiGenerating(false);
          setPackageGenStatus("");
          return;
        }
      }

      var updated = Object.assign({}, activeLecture, {
        quizQuestions: questions
      });
      await cloud.saveLecture(updated);
      if (onSelectLecture) onSelectLecture(updated);
      alert("تم اعتماد أسئلة الكويز بنجاح (" + questions.length + " سؤال) مع المقتطفات المرجعية وزر المساعدة!");
    } catch (err) {
      alert("خطأ أثناء إعادة توليد الكويز: " + err.message);
    } finally {
      setIsAiGenerating(false);
      setPackageGenStatus("");
    }
  };

  var handleGenerateSummary = handleRegenerateSummaryOnly;

  // فحص حالة المسودة لكل ركن
  var getIsDraft = function(comp) {
    if (!activeLecture) return false;
    var ps = activeLecture.publishStatus || {};
    if (ps[comp] !== undefined) return !ps[comp];
    if (comp === "quiz" && activeLecture.quizQuestions && activeLecture.quizQuestions.isPublished !== undefined) {
      return !activeLecture.quizQuestions.isPublished;
    }
    if (comp === "summary" && activeLecture.summaryData && activeLecture.summaryData.isPublished !== undefined) {
      return !activeLecture.summaryData.isPublished;
    }
    if (comp === "visuals" && activeLecture.visualsData && activeLecture.visualsData.isPublished !== undefined) {
      return !activeLecture.visualsData.isPublished;
    }
    return false;
  };

  // تبديل حالة النشر لركن محدد (نشر أو حجب كمسودة)
  var handlePublishToggle = function(comp, shouldPublish) {
    if (!activeLecture || currentUser.role !== "admin") return;
    var ps = Object.assign({}, activeLecture.publishStatus || {});
    ps[comp] = shouldPublish;
    var updated = Object.assign({}, activeLecture, { publishStatus: ps });
    if (comp === "quiz" && updated.quizQuestions) updated.quizQuestions.isPublished = shouldPublish;
    if (comp === "summary" && updated.summaryData) updated.summaryData.isPublished = shouldPublish;
    if (comp === "visuals" && updated.visualsData) updated.visualsData.isPublished = shouldPublish;
    if (cloud && cloud.saveLecture) cloud.saveLecture(updated);
    if (onSelectLecture) onSelectLecture(updated);
  };

  // نشر الحزمة كاملة لجميع الطلاب بنقرة واحدة
  var handlePublishAll = function() {
    if (!activeLecture || currentUser.role !== "admin") return;
    var ps = { transcript: true, summary: true, visuals: true, quiz: true };
    var updated = Object.assign({}, activeLecture, { publishStatus: ps });
    if (updated.quizQuestions) updated.quizQuestions.isPublished = true;
    if (updated.summaryData) updated.summaryData.isPublished = true;
    if (updated.visualsData) updated.visualsData.isPublished = true;
    if (cloud && cloud.saveLecture) cloud.saveLecture(updated);
    if (onSelectLecture) onSelectLecture(updated);
    alert("تم اعتماد ونشر الحزمة التعليمية كاملة لجميع الطلاب بنجاح! 🚀");
  };

  // حجب الحزمة بالكامل عن الطلاب وتحويلها لمسودة للمراجعة بنقرة واحدة
  var handleUnpublishAll = function() {
    if (!activeLecture || currentUser.role !== "admin") return;
    if (!window.confirm("هل تريد حجب الحزمة التعليمية بالكامل عن الطلاب وتحويل كافة الأركان إلى مسودة خاصة للمراجعة؟\n\n(سيبقى المحتوى محفوظاً بالكامل للمسؤولين ولن يظهر للطلاب حتى تعيد نشره).")) return;
    var ps = { transcript: false, summary: false, visuals: false, quiz: false };
    var updated = Object.assign({}, activeLecture, { publishStatus: ps });
    if (updated.quizQuestions) updated.quizQuestions.isPublished = false;
    if (updated.summaryData) updated.summaryData.isPublished = false;
    if (updated.visualsData) updated.visualsData.isPublished = false;
    if (cloud && cloud.saveLecture) cloud.saveLecture(updated);
    if (onSelectLecture) onSelectLecture(updated);
    alert("تم حجب الحزمة التعليمية عن الطلاب بنجاح وتحويل كافة الأركان إلى مسودة خاصة للمراجعة والتدقيق! 🔒");
  };

  // توليد الحزمة التعليمية الشاملة بالأرقام المرنة
  // دالة جلب التفريغ الحرفي المعتمد عبر Google Antigravity
  var fetchTranscriptSmart = function(mediaUrl) {
    return new Promise(function(resolve, reject) {
      reject(new Error("نظراً لقيود الخصوصية والحماية في يوتيوب، يتم استخراج التفريغ الحرفي وتدقيقه حصرياً عبر Google Antigravity لضمان أعلى دقة علمية."));
    });
  };

  // جلب تفريغ المحاضرة الحرفي وتوجيه المستخدم لمساعد Google Antigravity
  var handleFetchYouTubeTranscriptDirectly = async function() {
    if (!activeLecture || !activeLecture.mediaUrl) {
      alert("🎙️ استخراج وتدقيق التفريغ الحرفي للمحاضرة:\n\nهذه المحاضرة لا تحتوي على رابط فيديو يوتيوب مسجل في بياناتها حتى الآن.\n\nبمجرد توفر رابط الفيديو، كل ما عليك هو إرساله في محادثة Google Antigravity، وسيتولى استخراج النص الحرفي كاملاً بالدقائق والثواني ورفعه للمنصة فوراً.");
      return;
    }

    var videoUrl = activeLecture.mediaUrl;
    var copyNotice = "";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(videoUrl);
        copyNotice = "\n\n📋 تم نسخ رابط الفيديو تلقائياً إلى الحافظة (Clipboard)، يمكنك لصقه مباشرة في محادثة Antigravity بمجرد الضغط على Ctrl + V.";
      } catch (e) {}
    }

    var msg = "🎙️ استخراج وتدقيق التفريغ الحرفي للمحاضرة:\n\n" +
      "نظراً لقيود الخصوصية والحماية المفروضة من موقع يوتيوب، يتم استخراج التفريغ الحرفي وتدقيقه بأعلى دقة عبر:\n" +
      "Google Antigravity\n\n" +
      "كل ما عليك هو إرسال رابط المحاضرة في محادثة Antigravity، وسيتولى استخراج النص الحرفي كاملاً بالدقائق والثواني ورفعه للمنصة فوراً." +
      copyNotice;

    alert(msg);
  };
  // توليد المخططات البصرية التفاعلية بالذكاء الاصطناعي بأسلوب NotebookLM
  var handleGenerateVisualsDirectly = async function() {
    if (!window.EducationalAIService || currentUser.role !== "admin") return;
    setIsAiGenerating(true);
    setPackageGenStatus("جاري استخراج المخططات البصرية المعمقة بأسلوب NotebookLM وتحليل المحاضرة...");
    try {
      var sourceContent = (activeLecture.transcript || activeLecture.transcriptText || "").trim();

      // محاولة استخراج تفريغ اليوتيوب تلقائياً إن لم يكن موجوداً
      if (!sourceContent && activeLecture.mediaUrl) {
        try {
          setPackageGenStatus("جاري فحص وجلب تفريغ فيديو اليوتيوب للمحاضرة...");
          var transData = await fetchTranscriptSmart(activeLecture.mediaUrl);
          if (transData.success && transData.transcript) {
            activeLecture.transcript = transData.transcript;
            activeLecture.transcriptText = transData.transcriptText || transData.transcript;
            sourceContent = transData.transcript.trim();
          }
        } catch(tErr) {
          console.warn("Transcript auto-fetch skipped:", tErr);
        } finally {
          setPackageGenStatus("");
        }
      }

      if (typeof sourceContent === "string") {
        sourceContent = sourceContent
          .replace(/محاضرة\s+أونلاين\s+عبر\s+زووم\s*\([^)]*\)\s*[-–—]?/gi, "")
          .replace(/عبر\s+زووم/gi, "")
          .replace(/\(من\s+\d+\s+إلى\s+\d+\s+(مساءً|صباحاً|ظهراً)\)/gi, "")
          .trim();
      }

      if (!sourceContent || sourceContent.length < 100) {
        alert("⚠️ تنبيه أمانة علمية:\n\nلا يمكن استخراج المخططات البصرية لعدم توفر تفريغ نصي مسجل للمحاضرة.\n\nيرجى توفير تفريغ المحاضرة أولاً.");
        return;
      }

      var parsed = await window.EducationalAIService.generateVisualsOnly(
        activeLecture.title,
        sourceContent,
        genCustomPrompt || ""
      );

      var updated = Object.assign({}, activeLecture, {
        visualsData: parsed,
        visualsDataJson: JSON.stringify(parsed)
      });
      if (cloud && cloud.saveLecture) {
        await cloud.saveLecture(updated);
      }
      if (onSelectLecture) onSelectLecture(updated);
      alert("✅ تم استخراج وتحديث المخططات البصرية الشاملة بنجاح!");
    } catch(err) {
      alert("خطأ أثناء استخراج المخططات: " + (err && err.message ? err.message : err));
    } finally {
      setIsAiGenerating(false);
      setPackageGenStatus("");
    }
  };

  var handleGenerateFullPackage = async function() {
    if (!window.EducationalAIService) {
      alert("خدمة الذكاء الاصطناعي التعليمية قيد التهيئة...");
      return;
    }
    setIsAiGenerating(true);
    setPackageGenStatus("جاري استماع النموذج وتحليل المحاضرة وتوليد الأركان المحددة بالذكاء الاصطناعي...");
    try {
      var sourceContent = (activeLecture.transcript || activeLecture.transcriptText || "").trim();

      // محاولة استخراج تفريغ اليوتيوب تلقائياً إن لم يكن موجوداً
      if (!sourceContent && activeLecture.mediaUrl) {
        try {
          setPackageGenStatus("جاري فحص وجلب تفريغ فيديو اليوتيوب للمحاضرة...");
          var transData = await fetchTranscriptSmart(activeLecture.mediaUrl);
          if (transData.success && transData.transcript) {
            activeLecture.transcript = transData.transcript;
            activeLecture.transcriptText = transData.transcriptText || transData.transcript;
            sourceContent = transData.transcript.trim();
          }
        } catch(tErr) {
          console.warn("Transcript auto-fetch in full package skipped:", tErr);
        } finally {
          setPackageGenStatus("");
        }
      }

      if (typeof sourceContent === "string") {
        sourceContent = sourceContent
          .replace(/محاضرة\s+أونلاين\s+عبر\s+زووم\s*\([^)]*\)\s*[-–—]?/gi, "")
          .replace(/عبر\s+زووم/gi, "")
          .replace(/\(من\s+\d+\s+إلى\s+\d+\s+(مساءً|صباحاً|ظهراً)\)/gi, "")
          .trim();
      }

      if (!sourceContent || sourceContent.length < 100) {
        alert("⚠️ تنبيه أمانة علمية صارم:\n\nلا يمكن توليد الحزمة التعليمية (الدليل الدراسي، المخططات، الكويز) لعدم توفر تفريغ نصي مسجل للمحاضرة.\n\nيرجى فتح تبويب (📜 تفريغ المحاضرة من الفيديو) ثم استخدام زر (كتابة أو لصق تفريغ يدوي) أو جلب التفريغ من يوتيوب أولاً لضمان عدم تأليف معلومات وهمية من خارج المحاضرة.");
        return;
      }
      var currentWorkingLecture = Object.assign({}, activeLecture);

      var result = await window.EducationalAIService.generateCompletePackage(
        activeLecture.title,
        sourceContent,
        {
          summaryPages: parseInt(genSummaryPages, 10) || 5,
          slidesCount: parseInt(genSlidesCount, 10) || 15,
          quizCount: parseInt(genQuizCount, 10) || 10,
          customInstructions: genCustomPrompt,
          selectedComponents: genSelected,
          // حفظ مرحلي فوري أولاً بأول لضمان عدم ضياع أي مجهود مهما حدث
          onStepSuccess: async function(step, data) {
            if (step === "summary" && data.summary) {
              setPackageGenStatus("جاري حفظ الدليل الدراسي والمخططات البصرية سحابياً...");
              if (!currentWorkingLecture.publishStatus) {
                currentWorkingLecture.publishStatus = { summary: false, slides: false, mindMap: false, quiz: false };
              }
              currentWorkingLecture.summaryData = data.summary;
              currentWorkingLecture.summaryDataJson = JSON.stringify(data.summary);
              if (data.visuals) {
                currentWorkingLecture.visualsData = data.visuals;
                currentWorkingLecture.visualsDataJson = JSON.stringify(data.visuals);
              }
              var fullSummaryText = (data.summary.overview ? (data.summary.overview + "\n\n") : "");
              if (Array.isArray(data.summary.learningObjectives) && data.summary.learningObjectives.length > 0) {
                fullSummaryText += "🎯 أهداف التعلم:\n" + data.summary.learningObjectives.map(function(o) { return "• " + o; }).join("\n") + "\n\n";
              }
              if (Array.isArray(data.summary.sections)) {
                data.summary.sections.forEach(function(sec) {
                  fullSummaryText += "📌 " + sec.title + ":\n" + sec.content + "\n";
                  if (Array.isArray(sec.keyPoints) && sec.keyPoints.length > 0) {
                    fullSummaryText += sec.keyPoints.map(function(kp) { return "  - " + kp; }).join("\n") + "\n";
                  }
                  fullSummaryText += "\n";
                });
              }
              if (Array.isArray(data.summary.keyTakeaways) && data.summary.keyTakeaways.length > 0) {
                fullSummaryText += "🌟 خلاصات ونقاط جوهرية:\n" + data.summary.keyTakeaways.map(function(kt) { return "• " + kt; }).join("\n") + "\n\n";
              }
              if (Array.isArray(data.summary.glossary) && data.summary.glossary.length > 0) {
                fullSummaryText += "📖 معجم المصطلحات والمفاهيم المفتاحية:\n" + data.summary.glossary.map(function(g) { return "• " + (g.term || "") + ": " + (g.definition || ""); }).join("\n") + "\n\n";
              }
              if (Array.isArray(data.summary.reflectionQuestions) && data.summary.reflectionQuestions.length > 0) {
                fullSummaryText += "❓ أسئلة للتأمل والتقييم الذاتي:\n" + data.summary.reflectionQuestions.map(function(q) { return "• " + q; }).join("\n") + "\n\n";
              }
              currentWorkingLecture.writtenSummary = fullSummaryText.trim();
              currentWorkingLecture.publishStatus.summary = false;
              if (cloud && cloud.saveLecture) {
                await cloud.saveLecture(currentWorkingLecture);
              }
              if (onSelectLecture) onSelectLecture(currentWorkingLecture);
            }
          }
        },
        function(percent, msg) {
          setPackageGenStatus(msg);
        }
      );

      var updated = Object.assign({}, currentWorkingLecture);
      if (!updated.publishStatus) {
        updated.publishStatus = { summary: false, slides: false, mindMap: false, quiz: false };
      }

      if (result.summary && !updated.summaryData) {
        updated.summaryData = result.summary;
        updated.summaryDataJson = JSON.stringify(result.summary);
      }
      if (result.visuals && !updated.visualsData) {
        updated.visualsData = result.visuals;
        updated.visualsDataJson = JSON.stringify(result.visuals);
      }

      if (result.quiz && Array.isArray(result.quiz.questions)) {
        var requestedQuizCount = parseInt(genQuizCount, 10) || 10;
        if (result.quiz.questions.length < requestedQuizCount) {
          var keepIncompletePkg = window.confirm(
            "تنبيه حول عدد أسئلة الكويز في الحزمة الشاملة:\n\n" +
            "تم استخراج " + result.quiz.questions.length + " سؤالاً من أصل " + requestedQuizCount + " سؤالاً طُلبت.\n\n" +
            "• اضغط (موافق / OK) لاعتماد وحفظ هذه الأسئلة ضمن الحزمة.\n" +
            "• اضغط (إلغاء / Cancel) للاحتفاظ بالأسئلة الحالية وعدم استبدالها بعدد ناقص."
          );
          if (keepIncompletePkg) {
            updated.quizQuestions = result.quiz.questions;
            updated.publishStatus.quiz = false;
          }
        } else {
          updated.quizQuestions = result.quiz.questions;
          updated.publishStatus.quiz = false;
        }
      }

      // 5. جلب تفريغ المحاضرة من فيديو اليوتيوب إذا كان الخيار محدداً
      if (genSelected.transcript !== false && activeLecture.mediaUrl) {
        setPackageGenStatus("جاري استخراج وتنسيق تفريغ المحاضرة من فيديو اليوتيوب بالكامل...");
        try {
          var transData = await fetchTranscriptSmart(activeLecture.mediaUrl);
          if (transData.success && transData.transcript) {
            updated.transcript = transData.transcript;
            updated.transcriptText = transData.transcriptText || transData.transcript;
            if (updated.publishStatus) updated.publishStatus.transcript = false;
          }
        } catch (tErr) {
          console.warn("Failed to fetch YouTube transcript in package generator:", tErr);
        }
      }

      if (cloud && cloud.saveLecture) {
        await cloud.saveLecture(updated);
      }
      if (onSelectLecture) onSelectLecture(updated);
      setShowPackageModal(false);

      if (result.quizError) {
        alert(
          "✅ تم بنجاح توليد وحفظ الدليل الدراسي المصور والمخططات البصرية سحابياً دون أي نقص!\n\n" +
          "⚠️ تعذر استخراج أسئلة الكويز مؤقتاً (" + result.quizError + ").\n\n" +
          "💡 كافة بياناتك السابقة والجديدة محفوظة بالكامل. يمكنك الدخول لتبويب [الاختبار التفاعلي] والضغط على [إعادة استخراج وتوليد الكويز] لتوليده بمفرده في ثوانٍ دون إعادة الحزمة بأكملها."
        );
      } else {
        alert("✅ تم توليد وحفظ الحزمة التعليمية الشاملة بنجاح 100%! تم حفظ كافة الأركان كمسودة للمراجعة والاعتماد.");
      }
    } catch (err) {
      alert("خطأ أثناء توليد الحزمة: " + err.message);
    } finally {
      setIsAiGenerating(false);
      setPackageGenStatus("");
    }
  };

  // مسح وتصفير الحزمة التعليمية المولدة بالكامل للبدء من جديد
  var handleClearAiPackage = async function() {
    if (!activeLecture || currentUser.role !== "admin") return;
    var confirmMsg = "هل أنت متأكد من مسح الحزمة التعليمية المولدة لهذه المحاضرة للبدء من جديد؟\n\n" +
      "⚠️ سيتم تصفير: الملخص المكتوب، شرائح العرض، الخريطة الذهنية، الكويز، والتفريغ النصي.\n" +
      "✅ ستبقى كافة بيانات المحاضرة الأساسية وروابط الفيديو واليوتيوب والمذكرات محفوظة بالكامل دون مساس.";
    if (!window.confirm(confirmMsg)) return;

    var updated = Object.assign({}, activeLecture, {
      writtenSummary: "",
      summaryData: null,
      summaryDataJson: "",
      visualsData: null,
      visualsDataJson: "",
      presentationSlides: null,
      slidesData: null,
      slidesDataJson: "",
      mindMapData: null,
      mindMapDataJson: "",
      quizQuestions: [],
      transcript: "",
      transcriptText: "",
      publishStatus: { summary: false, visuals: false, quiz: false, transcript: false }
    });

    try {
      if (cloud && cloud.saveLecture) {
        await cloud.saveLecture(updated);
      }
      if (onSelectLecture) onSelectLecture(updated);
      alert("تم مسح الحزمة التعليمية بنجاح! أصبحت المحاضرة الآن خالية من أي محتوى آلي سابق ويمكنك إعادة توليدها في أي وقت.");
    } catch (err) {
      alert("حدث خطأ أثناء مسح الحزمة: " + (err && err.message ? err.message : err));
    }
  };

  // تطبيق تعديل فردي بالذكاء الاصطناعي على ركن محدد
  var handleApplyRefinement = async function() {
    if (!aiEditTarget || !aiEditPrompt.trim()) return;
    setIsRefining(true);
    try {
      var currentData = null;
      if (aiEditTarget === "slides") currentData = activeLecture.presentationSlides;
      else if (aiEditTarget === "mindMap") currentData = activeLecture.mindMapData;
      else if (aiEditTarget === "quiz") currentData = activeLecture.quizQuestions;
      else if (aiEditTarget === "summary") currentData = activeLecture.summaryData || activeLecture.writtenSummary;

      var refined = await window.EducationalAIService.refineComponent(
        aiEditTarget,
        currentData,
        activeLecture.title,
        activeLecture.notes || activeLecture.writtenSummary,
        aiEditPrompt
      );

      var updated = Object.assign({}, activeLecture);
      if (aiEditTarget === "slides") updated.presentationSlides = refined;
      else if (aiEditTarget === "mindMap") updated.mindMapData = refined;
      else if (aiEditTarget === "quiz") updated.quizQuestions = Array.isArray(refined.questions) ? refined.questions : (Array.isArray(refined) ? refined : [refined]);
      else if (aiEditTarget === "summary") {
        updated.summaryData = refined;
        if (refined.overview || refined.sections) {
          updated.writtenSummary = refined.overview || activeLecture.writtenSummary;
        }
      }

      var ps = Object.assign({}, updated.publishStatus || {});
      ps[aiEditTarget] = false;
      updated.publishStatus = ps;

      cloud.saveLecture(updated);
      if (onSelectLecture) onSelectLecture(updated);
      setAiEditTarget(null);
      setAiEditPrompt("");
      alert("تم تحديث الركن بالذكاء الاصطناعي بنجاح وحفظه كمسودة للمراجعة!");
    } catch (err) {
      alert("خطأ أثناء تعديل الركن: " + err.message);
    } finally {
      setIsRefining(false);
    }
  };
  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto",
      onClick: function(e) { if (e.target === e.currentTarget && onClose) onClose(); }
    },
    React.createElement(
      "div",
      {
        className: "bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 sm:space-y-4 max-h-[95vh] sm:max-h-[92vh] overflow-y-auto my-auto"
      },

      // رأس المحاضرة داخل النافذة
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4" },
        React.createElement(
          "div",
          null,
          React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-1" },
            activeLecture.subject && React.createElement("span", { className: "text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800" }, "📚 " + activeLecture.subject),
            React.createElement("span", { className: "text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg" }, "تاريخ: " + (activeLecture.date || "غير محدد")),
            actSeq.isExam
              ? React.createElement("span", { className: "text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800" }, "📝 امتحان وتقييم نهائي")
              : React.createElement("span", { className: "text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-lg" }, "المحاضرة رقم: " + actSeq.num),
            (activeLecture.sessionOrder && (activeLecture.sessionOrder > 1 || props.hasMultipleSessions)) && React.createElement(
              "span",
              { className: "text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800" },
              "الجلسة رقم: " + activeLecture.sessionOrder
            ),
            React.createElement("span", { className: "text-xs font-bold px-2.5 py-0.5 rounded-lg " + (st.badgeClass || "") }, st.label || "")
          ),
          React.createElement("h3", { className: "text-lg font-bold text-slate-900 dark:text-white" }, activeLecture.title),
          React.createElement("p", { className: "text-xs text-slate-500 mt-0.5" }, "المحاضر: " + activeLecture.speaker)
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2 flex-wrap" },
          renderFontSizeBar(),
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (openEditModal) openEditModal(activeLecture); },
              title: "تعديل المادة أو بيانات المحاضرة",
              className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 shadow-2xs cursor-pointer"
            },
            React.createElement("span", null, "✏️"),
            React.createElement("span", null, "تعديل")
          ),

          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (onClose) onClose(); },
              className: "px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
            },
            React.createElement("span", null, "✕"),
            React.createElement("span", null, "إغلاق والعودة للجدول")
          )
        )
      ),

      // شريط أزرار التحكم السريع للمسؤول
      currentUser.role === "admin" && React.createElement(
        "div",
        { className: "flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60" },
        React.createElement("span", { className: "text-xs font-bold text-slate-500 dark:text-slate-400 ml-1" }, "إدارة المحتوى:"),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (openEditModal) openEditModal(activeLecture, "all"); },
            className: "px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
          },
          "تعديل البيانات والروابط"
        ),
        props.onAddSession && React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { props.onAddSession(activeLecture); },
            className: "px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs border border-indigo-200 dark:border-indigo-900",
            title: "إضافة محاضرة أو جلسة تالية لنفس تاريخ هذا اليوم"
          },
          React.createElement("span", null, "➕"),
          React.createElement("span", null, "إضافة جلسة ثانية لهذا اليوم")
        ),
        currentUser.role === "admin" && React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { setShowPackageModal(true); },
            className: "px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          },
          React.createElement("span", null, "✨"),
          React.createElement("span", null, "توليد الحزمة التعليمية الشاملة")
        ),
        currentUser.role === "admin" && React.createElement(
          "div",
          { className: "flex items-center gap-1.5 flex-wrap" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handlePublishAll,
              title: "اعتماد ونشر كافة أركان الحزمة لجميع الطلاب دفعة واحدة",
              className: "px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            },
            React.createElement("span", null, "🚀"),
            React.createElement("span", null, "نشر الحزمة كاملة")
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleUnpublishAll,
              title: "حجب كافة أركان الحزمة عن الطلاب وتحويلها إلى مسودة خاصة للمراجعة والتدقيق",
              className: "px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            },
            React.createElement("span", null, "🔒"),
            React.createElement("span", null, "حجب الحزمة (مسودة)")
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setShowPublishModal(true); },
              title: "تخصيص حالة كل ركن على حدة (نشر أو حجب ركن معين للمراجعة)",
              className: "px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            },
            React.createElement("span", null, "⚙️"),
            React.createElement("span", null, "تخصيص نشر الأركان")
          )
        ),
        currentUser.role === "admin" && (activeLecture.writtenSummary || activeLecture.presentationSlides || activeLecture.slidesData || activeLecture.slidesDataJson || activeLecture.mindMapData || activeLecture.mindMapDataJson || (activeLecture.quizQuestions && activeLecture.quizQuestions.length > 0) || activeLecture.transcript || activeLecture.summaryData) && React.createElement(
          "button",
          {
            type: "button",
            onClick: handleClearAiPackage,
            className: "px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95",
            title: "مسح وتصفير الحزمة المولدة لهذه المحاضرة للبدء من جديد"
          },
          React.createElement("span", null, "🗑️"),
          React.createElement("span", null, "مسح الحزمة المولدة")
        ),
        activeLecture.zoomUrl && React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (props.handleClearZoom) props.handleClearZoom(activeLecture); },
            className: "px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs border border-amber-200 dark:border-amber-900",
            title: "مسح رابط الزوم فقط وإبقاء المحاضرة"
          },
          React.createElement("span", null, "🚫"),
          React.createElement("span", null, "مسح رابط الزوم")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (handleDeleteLecture) handleDeleteLecture(activeLecture); },
            className: "px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs border border-rose-200 dark:border-rose-900 mr-auto",
            title: "نقل المحاضرة كاملة إلى المحذوفات"
          },
          "حذف المحاضرة كاملة"
        )
      ),

      // كارت قاعة زوم المباشرة المستقل (يظهر في الأعلى بشكل بارز ومستقل عن مشغل الفيديو)
      activeLecture.zoomUrl && (function() {
        var cd = (utils && utils.getCountdownInfo) ? utils.getCountdownInfo(activeLecture.date, activeLecture.zoomTimeStr || activeLecture.startTime) : null;
        var isLive = cd && cd.status === "live";

        return React.createElement(
          "div",
          {
            className: "p-4 sm:p-5 rounded-2xl text-white shadow-lg border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 " +
              (isLive
                ? "bg-gradient-to-r from-rose-900 via-rose-800 to-red-900 border-rose-500/50"
                : "bg-gradient-to-r from-blue-900 to-indigo-900 border-blue-700/60")
          },
          React.createElement(
            "div",
            { className: "space-y-1.5" },
            React.createElement(
              "div",
              { className: "flex items-center gap-2 flex-wrap" },
              React.createElement("span", { className: "px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-[11px] font-bold text-blue-200" }, "🎥 بث زوم المباشر"),
              cd && React.createElement("span", { className: "text-xs font-mono font-bold text-amber-300" }, cd.label),
              activeLecture.zoomTimeStr && React.createElement("span", { className: "text-xs font-mono text-blue-200" }, "⏰ " + activeLecture.zoomTimeStr)
            ),
            React.createElement("h4", { className: "text-base font-bold text-white" }, "رابط قاعة الزوم متاح الآن لحضور المحاضرة"),
            React.createElement(
              "div",
              { className: "flex flex-wrap items-center gap-3 text-xs text-blue-200 pt-0.5" },
              activeLecture.meetingId && React.createElement(
                "span",
                {
                  onClick: function() {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(activeLecture.meetingId);
                      alert("تم نسخ Meeting ID: " + activeLecture.meetingId);
                    }
                  },
                  className: "cursor-pointer hover:underline bg-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono",
                  title: "اضغط للنسخ"
                },
                "ID: " + activeLecture.meetingId + " 📋"
              ),
              activeLecture.passcode && React.createElement(
                "span",
                {
                  onClick: function() {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(activeLecture.passcode);
                      alert("تم نسخ Passcode: " + activeLecture.passcode);
                    }
                  },
                  className: "cursor-pointer hover:underline bg-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono",
                  title: "اضغط للنسخ"
                },
                "Passcode: " + activeLecture.passcode + " 📋"
              )
            )
          ),
          React.createElement(
            "div",
            { className: "flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto shrink-0" },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() {
                  if (utils && utils.addToCalendarPrompt) {
                    utils.addToCalendarPrompt(activeLecture);
                  }
                },
                title: "إضافة للتقويم وتفعيل منبه الموبايل قبل المحاضرة بيوم وقبلها بربع ساعة",
                className: "w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/20 transition-all active:scale-95"
              },
              React.createElement("span", null, "📅"),
              React.createElement("span", null, "منبه التقويم")
            ),
            React.createElement(
              "a",
              {
                href: activeLecture.zoomUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:scale-102 transition-all active:scale-95 shrink-0"
              },
              React.createElement("span", { className: "text-base" }, "🚀"),
              React.createElement("span", null, isLive ? "دخول زوم الآن" : "دخول زوم المباشر")
            )
          )
        );
      })(),

      // الألسنة الداخلية الخمسة بتصميم نظيف
      React.createElement(
        "div",
        { className: "flex border-b border-slate-200 dark:border-slate-800 gap-4 sm:gap-6 overflow-x-auto scrollbar-thin pb-0.5" },
        [
          { id: "media", label: "📺 مشاهدة المحاضرة" },
          { id: "transcript", label: "📜 تفريغ المحاضرة من الفيديو", isDraft: getIsDraft("transcript") },
          { id: "summary", label: "📄 الدليل الدراسي المصور", isDraft: getIsDraft("summary") },
          { id: "quiz", label: "📝 الاختبار التفاعلي", isDraft: getIsDraft("quiz") },
          { id: "handout", label: "📁 المرفقات والملفات" },
          { id: "notes", label: "✍️ الملاحظات" }
        ].filter(function(tab) {
          if (currentUser.role === "admin") return true;
          if (tab.id === "media" || tab.id === "handout" || tab.id === "notes") return true;
          return !tab.isDraft;
        }).map(function(tab) {
          var isCurrent = activeSubTab === tab.id;
          return React.createElement(
            "button",
            {
              key: tab.id,
              onClick: function() { setActiveSubTab(tab.id); },
              className: "pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer " +
                (isCurrent ? "border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")
            },
            React.createElement("span", null, tab.label),
            currentUser.role === "admin" && tab.isDraft !== undefined && React.createElement(
              "span",
              {
                className: "px-1.5 py-0.2 rounded-md text-[10px] font-black transition-all " +
                  (tab.isDraft
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60"
                    : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60")
              },
              tab.isDraft ? "🔒 مسودة" : "✓ منشور"
            )
          );
        })
      ),

      // شريط التنبيه وإخلاء المسؤولية للحزمة الذكية (الملخص الموسع، شرائح العرض، الخريطة الذهنية، الاختبار التفاعلي)
      (activeSubTab === "summary" || activeSubTab === "quiz") && !isDisclaimerDismissed && React.createElement(
        "div",
        {
          className: "flex items-start sm:items-center justify-between gap-3 p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 dark:border-amber-400/20 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium transition-all shadow-xs animate-fadeIn"
        },
        React.createElement(
          "div",
          { className: "flex items-start sm:items-center gap-2 sm:gap-2.5 flex-1 leading-relaxed" },
          React.createElement("span", { className: "text-base sm:text-lg shrink-0 mt-0.5 sm:mt-0" }, "💡"),
          React.createElement(
            "p",
            null,
            React.createElement("strong", { className: "font-black ml-1 text-amber-800 dark:text-amber-300" }, "تنبيه استرشادي:"),
            "هذه الملخصات والأدوات الذكية أُنشئت آلياً للمساعدة في المراجعة السريعة وترتيب الأفكار، ولا تغني بأي حال عن الرجوع للمحاضرة الأصلية والمرجع المعتمد."
          )
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { setIsDisclaimerDismissed(true); },
            title: "إخفاء التنبيه لهذه الجلسة",
            className: "p-1.5 rounded-xl text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 hover:bg-amber-500/20 dark:hover:bg-amber-400/20 transition-all shrink-0 cursor-pointer flex items-center justify-center",
            "aria-label": "إغلاق التنبيه"
          },
          React.createElement(
            "svg",
            { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2.5" },
            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" })
          )
        )
      ),

      // 1. تبويب الفيديو والمشغل
      activeSubTab === "media" && React.createElement(
        "div",
        { className: "space-y-4" },

        activeLecture.mediaUrl ? React.createElement(
          "div",
          { className: "space-y-2.5" },
          mediaStartSeconds !== null && mediaStartSeconds > 0 && React.createElement(
            "div",
            { className: "p-2.5 px-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 animate-fadeIn" },
            React.createElement("span", { className: "flex items-center gap-1.5" },
              React.createElement("span", null, "🎯"),
              React.createElement("span", null, "تم توجيه المشغل تلقائياً لموضع إجابة السؤال عند: " + (activeJumpTimestamp || (mediaStartSeconds + " ثانية")))
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setMediaStartSeconds(null); setActiveJumpTimestamp(""); },
                className: "px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-[11px] text-amber-900 dark:text-amber-100 hover:bg-amber-50 dark:hover:bg-slate-700 font-bold transition-all cursor-pointer"
              },
              "إعادة الفيديو من البداية ⏪"
            )
          ),
          React.createElement(
            "div",
            { className: "w-full rounded-2xl overflow-hidden bg-slate-950 aspect-video md:aspect-[21/9] flex items-center justify-center relative shadow-inner" },
            React.createElement("iframe", {
              key: "media-player-" + (mediaStartSeconds !== null ? mediaStartSeconds : "default"),
              src: (function() {
                var baseEmbed = utils.getMediaEmbedUrl(activeLecture.mediaUrl);
                if (mediaStartSeconds !== null && mediaStartSeconds >= 0) {
                  var sep = baseEmbed.indexOf("?") >= 0 ? "&" : "?";
                  return baseEmbed + sep + "start=" + mediaStartSeconds + "&autoplay=1";
                }
                return baseEmbed;
              })(),
              className: "w-full h-full border-0",
              allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
              allowFullScreen: true
            })
          )
        ) : (function() {
          return React.createElement(
            "div",
            { className: "p-8 md:p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
            React.createElement("div", { className: "text-3xl" }, st.type === "upcoming" ? "⏳" : "🎬"),
            React.createElement("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200" },
              st.type === "upcoming"
                ? "محاضرة قادمة مجدولة بتاريخ: " + (activeLecture.date || "قريباً")
                : "تسجيل المحاضرة غير متوفر حالياً"
            ),
            React.createElement("p", { className: "text-xs text-slate-500 max-w-md mx-auto leading-relaxed" },
              st.type === "upcoming"
                ? "ستقام المحاضرة في موعدها المحدد، وسيتم رفع التسجيل وروابط المشاهدة فور انتهاء الجلسة."
                : "جاري تجهيز ورفع تسجيل المحاضرة من قبل الإدارة وسيكون متاحاً هنا فور توفره."
            ),
            currentUser.role === "admin" && React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { if (openEditModal) openEditModal(activeLecture, "video"); },
                className: "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm hover:scale-102 transition-all mt-2"
              },
              "📺 إضافة أو تعديل رابط الفيديو الآن"
            )
          );
        })(),
        // أزرار التحكم
        React.createElement(
          "div",
          { className: "flex items-center justify-between text-xs pt-1" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("button", {
              onClick: function() { if (handleSavePosition) handleSavePosition(Math.max(0, (activeLecture.lastPosition || 0) - 15)); },
              className: "px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
            }, "◀ 15 ثانية"),
            React.createElement("button", {
              onClick: function() { if (handleSavePosition) handleSavePosition((activeLecture.lastPosition || 0) + 15); },
              className: "px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
            }, "15 ثانية ▶")
          ),
          React.createElement("span", { className: "text-slate-400" }, "يتم حفظ واستئناف موضع التوقف تلقائياً")
        )
      ),

        // 2. تبويب الهاند آوت والمرفقات (PDF / PPT)
        activeSubTab === "handout" && (function() {
          var handoutsList = [];
          if (Array.isArray(activeLecture.handouts) && activeLecture.handouts.length > 0) {
            handoutsList = activeLecture.handouts.filter(function(h) { return h && (h.url || h.name); });
          } else if (activeLecture.handoutUrl) {
            handoutsList = [{
              id: "legacy",
              name: activeLecture.handoutName || "ملف الهاند آوت للمحاضرة",
              url: activeLecture.handoutUrl
            }];
          }

          var activeIdx = Math.min(Math.max(0, selectedHandoutIndex), Math.max(0, handoutsList.length - 1));
          var currentHandout = handoutsList[activeIdx] || null;

          return React.createElement(
            "div",
            { className: "space-y-4" },
            currentUser.role === "admin" && React.createElement(
              "div",
              { className: "flex items-center justify-between p-3 rounded-2xl bg-indigo-50/60 dark:bg-slate-800/40 border border-indigo-100 dark:border-slate-800" },
              React.createElement("div", { className: "text-xs text-indigo-900 dark:text-indigo-200 font-bold flex items-center gap-1.5" },
                React.createElement("span", null, "📂"),
                React.createElement("span", null, "إدارة هاند آوت المحاضرة (" + (handoutsList.length > 0 ? (handoutsList.length + " ملفات مرفقة") : "ملف PDF أو عرض تقديمي") + ")")
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { if (openEditModal) openEditModal(activeLecture, "handout"); },
                  className: "px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1 shadow-sm"
                },
                React.createElement("span", null, "⬆️"),
                React.createElement("span", null, handoutsList.length > 0 ? "إدارة ورفع المزيد" : "رفع هاند آوت جديد")
              )
            ),
            handoutsList.length > 0 ? React.createElement(
              "div",
              { className: "space-y-3" },
              // شريط التنقل بين ملفات الهاند آوت إذا وُجد أكثر من ملف
              handoutsList.length > 1 && React.createElement(
                "div",
                { className: "flex items-center gap-2 overflow-x-auto pb-1 p-1.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60" },
                handoutsList.map(function(item, idx) {
                  var isSelected = idx === activeIdx;
                  return React.createElement(
                    "button",
                    {
                      key: item.id || idx,
                      type: "button",
                      onClick: function() { setSelectedHandoutIndex(idx); },
                      className: "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 " + (
                        isSelected
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/80"
                      )
                    },
                    React.createElement("span", null, "📄"),
                    React.createElement("span", { className: "max-w-[180px] truncate" }, item.name || ("ملف " + (idx + 1))),
                    React.createElement("span", { className: "text-[10px] opacity-70 px-1.5 py-0.2 bg-black/10 dark:bg-white/10 rounded-full" }, idx + 1)
                  );
                })
              ),
              // بطاقة الملف النشط وروابط الفتح/التحميل
              currentHandout && React.createElement(
                "div",
                { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-3 min-w-0" },
                  React.createElement("div", { className: "w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0" }, "📄"),
                  React.createElement(
                    "div",
                    { className: "min-w-0" },
                    React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white truncate" }, currentHandout.name || "ملف الهاند آوت والعرض التقديمي للمحاضرة"),
                    React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" },
                      handoutsList.length > 1 ? ("الملف " + (activeIdx + 1) + " من أصل " + handoutsList.length + " - متاح للتحميل والقراءة المباشرة") : "متاح للتحميل والقراءة المباشرة أثناء متابعة المحاضرة"
                    )
                  )
                ),
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2 w-full sm:w-auto shrink-0" },
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: function() { setIsHandoutFullScreen(true); },
                      className: "flex-1 sm:flex-none text-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                    },
                    React.createElement("span", null, "⛶"),
                    React.createElement("span", null, "قراءة بملء الشاشة في التطبيق")
                  ),
                  handoutCurrentPage > 1 && React.createElement(
                    "span",
                    { className: "text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" },
                    "🔖 صفحة " + handoutCurrentPage
                  ),
                  React.createElement(
                    "a",
                    {
                      href: currentHandout.url,
                      download: true,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className: "px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
                    },
                    React.createElement("span", null, "⬇️"),
                    React.createElement("span", null, "تحميل")
                  )
                )
              ),
              // عارض الملفات المباشر المضمن
              currentHandout && currentHandout.url && React.createElement(
                "div",
                { className: "relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 aspect-[4/3] md:aspect-[16/10] shadow-inner flex items-center justify-center" },
                React.createElement("iframe", {
                  key: "tab-handout",
                  src: (function() {
                    var url = currentHandout.url;
                    if (url.includes("drive.google.com/file/d/")) {
                      return url.replace(/\/view(\?.*)?$/, "/preview");
                    }
                    return url;
                  })(),
                  className: "w-full h-full border-0",
                  title: currentHandout.name || "Handout Viewer"
                })
              ),
              // قائمة تنزيل سريعة لكافة الملفات إذا كان هناك أكثر من ملف
              handoutsList.length > 1 && React.createElement(
                "div",
                { className: "p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2" },
                React.createElement("div", { className: "text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "📥 قائمة جميع الملفات المرفقة للتحميل المباشر:"),
                React.createElement(
                  "div",
                  { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
                  handoutsList.map(function(h, i) {
                    return React.createElement(
                      "div",
                      { key: h.id || i, className: "flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs" },
                      React.createElement("span", { className: "font-medium text-slate-800 dark:text-slate-200 truncate pr-2" }, (i + 1) + ". " + (h.name || ("ملف " + (i + 1)))),
                      React.createElement(
                        "a",
                        {
                          href: h.url,
                          target: "_blank",
                          rel: "noopener noreferrer",
                          download: true,
                          className: "px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100 transition-colors shrink-0 flex items-center gap-1"
                        },
                        React.createElement("span", null, "⬇️"),
                        React.createElement("span", null, "تحميل")
                      )
                    );
                  })
                )
              )
            ) : React.createElement(
              "div",
              { className: "p-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
              React.createElement("div", { className: "text-3xl" }, "📂"),
              React.createElement("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200" }, "لم يتم إرفاق ملفات أو مذكرات لهذه المحاضرة بعد"),
              React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto leading-relaxed" },
                "في حال وفر المحاضر عرض تقديمي أو مذكرات ملحقة، سيتم رفعها هنا تلقائياً لتكون متاحة للقراءة والتحميل."
              ),
              currentUser.role === "admin" && React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { if (openEditModal) openEditModal(activeLecture, "handout"); },
                  className: "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm hover:scale-102 transition-all mt-2"
                },
                "⬆️ رفع ملفات أو مرفقات الآن"
              )
            )
          );
        })(),

      // 3. تبويب الدليل الدراسي المصور (الملخص الأكاديمي مع المخططات البصرية المدمجة سياقياً)
      activeSubTab === "summary" && (function() {
        var summaryData = (function() {
          var fromJson = null;
          if (activeLecture.summaryDataJson) {
            try { fromJson = JSON.parse(activeLecture.summaryDataJson); } catch(e) {}
          }
          var fromObj = activeLecture.summaryData;
          if (fromJson && Array.isArray(fromJson.sections)) {
            if (!fromObj || !Array.isArray(fromObj.sections) || fromJson.sections.length >= fromObj.sections.length) {
              return fromJson;
            }
          }
          return fromObj || fromJson || null;
        })();

        var legacyCharts = (activeLecture.visualsData && Array.isArray(activeLecture.visualsData.charts))
          ? activeLecture.visualsData.charts
          : (function() {
              try {
                var p = JSON.parse(activeLecture.visualsDataJson);
                return (p && Array.isArray(p.charts)) ? p.charts : [];
              } catch(e) { return []; }
            })();



        return React.createElement(
          "div",
          { className: "space-y-5 animate-in fade-in duration-200" },

          // خيارات المسؤول (نشر، تعديل، إعادة توليد)
          currentUser.role === "admin" && React.createElement(
            "div",
            { className: "flex items-center justify-end p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 gap-2 flex-wrap" },
              getIsDraft("summary") && React.createElement(
                "span",
                { className: "px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-black" },
                "🔒 مسودة"
              ),
              (activeLecture.writtenSummary || summaryData) && React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { handlePublishToggle("summary", getIsDraft("summary")); },
                  className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer " +
                    (getIsDraft("summary")
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800")
                },
                React.createElement("span", null, getIsDraft("summary") ? "🚀 نشر" : "🔒 حجب")
              ),
              React.createElement(
                "button",
                {
                  onClick: function() { if (openEditModal) openEditModal(activeLecture, "summary"); },
                  className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                },
                React.createElement("span", null, activeLecture.writtenSummary ? "✏️ تعديل" : "✍️ ملخص")
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: handleRegenerateSummaryOnly,
                  disabled: isAiGenerating,
                  className: "px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                },
                React.createElement("span", null, "🔄"),
                React.createElement("span", null, isAiGenerating ? "جاري التوليد..." : "إعادة التوليد")
              )
            ),

          // عرض الدليل الدراسي المنظم والمصور بأسلوب NotebookLM
          summaryData ? React.createElement(
            "div",
            { className: "space-y-6" },

            // 1. الملخص التنفيذي وسياق المحاضرة
            summaryData.overview && React.createElement(
              "div",
              { className: "p-5 sm:p-6 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 space-y-2.5" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-black text-sm" },
                React.createElement("span", { className: "text-lg" }, "📌"),
                React.createElement("span", null, "الملخص التنفيذي وسياق المحاضرة")
              ),
              React.createElement("p", { className: fontTextClass + " text-slate-700 dark:text-slate-300 leading-relaxed font-sans", style: { fontSize: fontPixelSize } }, summaryData.overview)
            ),

            // 2. أهداف التعلم
            Array.isArray(summaryData.learningObjectives) && summaryData.learningObjectives.length > 0 && React.createElement(
              "div",
              { className: "p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm" },
                React.createElement("span", null, "🎯"),
                React.createElement("span", null, "أهداف التعلم ومخرجات اللقاء:")
              ),
              React.createElement(
                "div",
                { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
                summaryData.learningObjectives.map(function(obj, oIdx) {
                  return React.createElement(
                    "div",
                    { key: oIdx, className: "flex items-start gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs" },
                    React.createElement("span", { className: "text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5" }, "✓"),
                    React.createElement("span", { className: "text-slate-700 dark:text-slate-300 leading-snug" }, obj)
                  );
                })
              )
            ),

            // 3. المحاور الدراسية التفصيلية وتتخللها المخططات البصرية في أماكنها
            Array.isArray(summaryData.sections) && React.createElement(
              "div",
              { className: "space-y-6 pt-2" },
              summaryData.sections.map(function(sec, sIdx) {
                // فحص ما إذا كان للمحور مخطط مدمج مباشرة، أو مخطط سابق متوافق بالترتيب
                var inlineChart = sec.visualDiagram || (legacyCharts && legacyCharts[sIdx]) || null;

                return React.createElement(
                  "div",
                  {
                    key: sIdx,
                    className: "p-5 sm:p-7 rounded-3xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 space-y-4"
                  },
                  // رأس المحور
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-2.5 pb-3 border-b border-slate-200/60 dark:border-slate-700/60" },
                    React.createElement("span", { className: "w-7 h-7 rounded-xl bg-indigo-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-2xs" }, sIdx + 1),
                    React.createElement("h4", { className: "text-sm sm:text-base font-black text-slate-900 dark:text-white" }, sec.title)
                  ),
                  // نص الشرح الأكاديمي بحجم الخط المختار
                  React.createElement(
                    "div",
                    { className: fontTextClass + " text-slate-800 dark:text-slate-200 leading-loose whitespace-pre-wrap font-sans select-text", style: { fontSize: fontPixelSize } },
                    sec.content
                  ),
                  // النقاط الجوهرية للمحور
                  Array.isArray(sec.keyPoints) && sec.keyPoints.length > 0 && React.createElement(
                    "div",
                    { className: "p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1.5" },
                    React.createElement("span", { className: "text-[11px] font-bold text-slate-500 block mb-1" }, "📌 نقاط جوهرية في هذا المحور:"),
                    React.createElement(
                      "ul",
                      { className: "space-y-1 text-xs text-slate-700 dark:text-slate-300" },
                      sec.keyPoints.map(function(kp, kIdx) {
                        return React.createElement(
                          "li",
                          { key: kIdx, className: "flex items-start gap-2" },
                          React.createElement("span", { className: "text-indigo-500 font-bold shrink-0 mt-0.5" }, "•"),
                          React.createElement("span", { className: "leading-relaxed" }, kp)
                        );
                      })
                    )
                  ),
                  // ════════════════════════════════════════════════
                  // المخطط البصري التفاعلي المدمج في موضعه الطبيعي
                  // ════════════════════════════════════════════════
                  inlineChart && window.SingleVisualChartCard && React.createElement(
                    "div",
                    { className: "pt-1" },
                    React.createElement(window.SingleVisualChartCard, { chart: inlineChart })
                  )
                );
              })
            ),

            // 4. الخلاصات العملية للمشير
            Array.isArray(summaryData.keyTakeaways) && summaryData.keyTakeaways.length > 0 && React.createElement(
              "div",
              { className: "p-5 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-3" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-black text-xs sm:text-sm" },
                React.createElement("span", null, "🌟"),
                React.createElement("span", null, "خلاصات عملية وتطبيقية للمشير في الخدمة والحياة:")
              ),
              React.createElement(
                "div",
                { className: "space-y-2 text-xs" },
                summaryData.keyTakeaways.map(function(kt, tIdx) {
                  return React.createElement(
                    "div",
                    { key: tIdx, className: "flex items-start gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30" },
                    React.createElement("span", { className: "text-emerald-600 font-bold shrink-0 mt-0.5" }, "★"),
                    React.createElement("span", { className: "text-slate-800 dark:text-slate-200 leading-relaxed" }, kt)
                  );
                })
              )
            ),

            // 5. معجم المفاهيم والمصطلحات
            Array.isArray(summaryData.glossary) && summaryData.glossary.length > 0 && React.createElement(
              "div",
              { className: "p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm" },
                React.createElement("span", null, "📖"),
                React.createElement("span", null, "معجم المصطلحات والمفاهيم المفتاحية:")
              ),
              React.createElement(
                "div",
                { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5" },
                summaryData.glossary.map(function(g, gIdx) {
                  return React.createElement(
                    "div",
                    { key: gIdx, className: "p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1 text-xs" },
                    React.createElement("span", { className: "font-black text-indigo-700 dark:text-indigo-400 block" }, g.term || ""),
                    React.createElement("p", { className: "text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]" }, g.definition || "")
                  );
                })
              )
            ),

            // 6. أسئلة للتأمل والتقييم الذاتي
            Array.isArray(summaryData.reflectionQuestions) && summaryData.reflectionQuestions.length > 0 && React.createElement(
              "div",
              { className: "p-5 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-3" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2 text-amber-950 dark:text-amber-200 font-black text-xs sm:text-sm" },
                React.createElement("span", null, "❓"),
                React.createElement("span", null, "أسئلة للتأمل والتقييم الذاتي وتطوير الخدمة:")
              ),
              React.createElement(
                "div",
                { className: "space-y-2 text-xs" },
                summaryData.reflectionQuestions.map(function(rq, qIdx) {
                  return React.createElement(
                    "div",
                    { key: qIdx, className: "flex items-start gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/30" },
                    React.createElement("span", { className: "text-amber-600 font-bold shrink-0 mt-0.5" }, "•"),
                    React.createElement("span", { className: "text-slate-800 dark:text-slate-200 leading-relaxed" }, rq)
                  );
                })
              )
            )
          ) : activeLecture.writtenSummary ? React.createElement(
            "div",
            { className: "space-y-6" },
            React.createElement(
              "div",
              { className: "p-6 sm:p-8 rounded-3xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 " + fontTextClass + " text-slate-800 dark:text-slate-200 leading-loose whitespace-pre-wrap font-sans select-text shadow-2xs", style: { fontSize: fontPixelSize } },
              activeLecture.writtenSummary
            ),
            // عرض المخططات السابقة تحت النص إن وجدت لضمان عدم ضياعها
            legacyCharts && legacyCharts.length > 0 && window.SingleVisualChartCard && React.createElement(
              "div",
              { className: "space-y-4 pt-2" },
              React.createElement("h4", { className: "text-xs font-black text-slate-700 dark:text-slate-300" }, "📊 المخططات والرسوم البصرية التوضيحية الملحقة:"),
              legacyCharts.map(function(c, idx) {
                return React.createElement(window.SingleVisualChartCard, { key: c.id || idx, chart: c });
              })
            )
          ) : React.createElement(
            "div",
            { className: "p-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-3" },
            React.createElement("div", { className: "text-3xl" }, "📄"),
            React.createElement("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200" }, "لا يوجد دليل دراسي مصور لهذه المحاضرة حتى الآن."),
            React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto leading-relaxed" },
              "يمكن استخراج وصياغة دليل دراسي مصور متكامل يجمع بين الشرح الأكاديمي والمخططات التفاعلية بالذكاء الاصطناعي."
            ),
            currentUser.role === "admin" && React.createElement(
              "div",
              { className: "pt-2 flex items-center justify-center gap-2" },
              React.createElement(
                "button",
                {
                  type: "button",
                  disabled: isAiGenerating,
                  onClick: handleGenerateSummary,
                  className: "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                },
                React.createElement("span", null, isAiGenerating ? "⏳" : "✨"),
                React.createElement("span", null, isAiGenerating ? "جاري بناء الدليل المصور..." : "توليد الدليل الدراسي المصور الآن")
              )
            )
          )
        );
      })(),

      // 4. تبويب الملخص الصوتي المسموع
      
      // تبويب تفريغ المحاضرة الكامل
      activeSubTab === "transcript" && React.createElement(
        "div",
        { className: "space-y-4 animate-in fade-in duration-200" },
        (function() {
          var transcriptText = activeLecture.transcript || activeLecture.transcriptText || "";
          var wordCount = transcriptText ? transcriptText.split(/\s+/).filter(Boolean).length : 0;
          return React.createElement(
            "div",
            { className: "space-y-3" },
            React.createElement(
              "div",
              { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2 flex-wrap" },
                currentUser.role === "admin" && (activeLecture.transcript || activeLecture.transcriptText) && React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { handlePublishToggle("transcript", getIsDraft("transcript")); },
                    className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer " +
                      (getIsDraft("transcript")
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800")
                  },
                  React.createElement("span", null, getIsDraft("transcript") ? "🚀 نشر التفريغ للطلاب" : "🔒 حجب التفريغ (مسودة)")
                ),
                React.createElement("span", { className: "text-xs font-bold text-slate-700 dark:text-slate-300" }, "📜 تفريغ المحاضرة الكامل من واقع الصوت"),
                wordCount > 0 && React.createElement(
                  "span",
                  { className: "px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-black" },
                  wordCount + " كلمة مسجلة"
                )
              ),
              React.createElement(
                "div",
                { className: "flex items-center gap-2 flex-wrap" },
                currentUser.role === "admin" && (activeLecture.transcript || activeLecture.transcriptText) && React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { handlePublishToggle("transcript", getIsDraft("transcript")); },
                    className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer " +
                      (getIsDraft("transcript")
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800")
                  },
                  React.createElement("span", null, getIsDraft("transcript") ? "🚀 نشر التفريغ للطلاب" : "🔒 حجب التفريغ (مسودة)")
                ),
                currentUser.role === "admin" && React.createElement(
                  "button",
                  {
                    type: "button",
                    disabled: isFetchingYouTubeTranscript,
                    onClick: handleFetchYouTubeTranscriptDirectly,
                    className: "px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                  },
                  React.createElement("span", null, isFetchingYouTubeTranscript ? "⏳" : "⚡"),
                  React.createElement("span", null, "جلب التفريغ عبر Google Antigravity")
                ),
                currentUser.role === "admin" && React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() {
                      setEditTranscriptText(transcriptText);
                      setIsEditingTranscript(true);
                    },
                    className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                  },
                  React.createElement("span", null, "✏️"),
                  React.createElement("span", null, transcriptText ? "تعديل التفريغ" : "كتابة / لصق تفريغ")
                ),
                wordCount > 0 && React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() {
                      navigator.clipboard.writeText(transcriptText);
                      alert("تم نسخ تفريغ المحاضرة بالكامل إلى الحافظة بنجاح!");
                    },
                    className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                  },
                  React.createElement("span", null, "📋"),
                  React.createElement("span", null, "نسخ النص كاملاً")
                )
              )
            ),
            transcriptText ? React.createElement(
              "div",
              { className: "p-6 sm:p-8 rounded-3xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 " + fontTextClass + " text-slate-800 dark:text-slate-200 leading-loose whitespace-pre-wrap font-sans select-text shadow-2xs", style: { fontSize: fontPixelSize } },
              transcriptText
            ) : React.createElement(
              "div",
              { className: "p-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-3" },
              React.createElement("div", { className: "text-3xl" }, "📜"),
              React.createElement("p", { className: "font-bold text-slate-600 dark:text-slate-300" }, "لا يوجد تفريغ نصي مسجل لهذه المحاضرة حتى الآن."),
              currentUser.role === "admin" && React.createElement(
                "div",
                { className: "flex flex-wrap items-center justify-center gap-3 pt-2" },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    disabled: isFetchingYouTubeTranscript,
                    onClick: handleFetchYouTubeTranscriptDirectly,
                    className: "px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md inline-flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                  },
                  React.createElement("span", null, "⚡"),
                  React.createElement("span", null, "جلب وتدقيق التفريغ عبر Google Antigravity")
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { setEditTranscriptText(""); setIsEditingTranscript(true); },
                    className: "px-4 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold shadow-2xs hover:bg-slate-100 inline-flex items-center gap-1.5 active:scale-95 transition-all"
                  },
                  React.createElement("span", null, "✍️"),
                  React.createElement("span", null, "كتابة أو لصق تفريغ يدوي")
                )
              )
            )
          );
        })()
      ),





      // 5. تبويب الكويز والاختبار التفاعلي
      activeSubTab === "quiz" && React.createElement(
        "div",
        { className: "space-y-4" },
        window.InteractiveQuizViewer ? React.createElement(
          window.InteractiveQuizViewer,
          {
            quiz: activeLecture.quizQuestions,
            isDraft: getIsDraft("quiz"),
            isAdmin: currentUser.role === "admin",
            isGenerating: isAiGenerating,
            generatingStatus: packageGenStatus,
            onPublishToggle: handlePublishToggle,
            onRequestEdit: function(comp) { setAiEditTarget(comp); },
            onUpdateQuiz: function(newQuestions) {
              var updated = Object.assign({}, activeLecture, { quizQuestions: newQuestions });
              cloud.saveLecture(updated);
              if (onSelectLecture) onSelectLecture(updated);
            },
            onRegenerateQuiz: handleRegenerateQuizOnly,
            mediaUrl: activeLecture.mediaUrl,
            onJumpToTimestamp: function(timeStr) {
              if (!timeStr) return;
              var sec = (utils && typeof utils.parseTimeToSeconds === "function")
                ? utils.parseTimeToSeconds(timeStr)
                : 0;
              if (sec <= 0) {
                var clean = timeStr.toString().replace(/[^0-9:]/g, "");
                var parts = clean.split(":").map(function(p) { return parseInt(p, 10) || 0; });
                if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
                else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
                else sec = parseInt(clean, 10) || 0;
              }

              setMediaStartSeconds(sec);
              setActiveJumpTimestamp(timeStr);
              setActiveSubTab("media");
            }
          }
        ) : 
        currentUser.role === "admin" && React.createElement(
          "div",
          { className: "flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800" },
          React.createElement("span", { className: "text-xs font-bold text-slate-600 dark:text-slate-300" }, "إدارة أسئلة الكويز الذاتي"),
          React.createElement(
            "button",
            {
              onClick: function() { if (openEditModal) openEditModal(activeLecture, "quiz"); },
              className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-100 flex items-center gap-1"
            },
            React.createElement("span", null, "📝"),
            React.createElement("span", null, (activeLecture.quizQuestions && activeLecture.quizQuestions.length > 0) ? "تعديل أسئلة الكويز" : "إضافة أسئلة كويز")
          )
        ),
        (activeLecture.quizQuestions && activeLecture.quizQuestions.length > 0) ? React.createElement(
          "div",
          { className: "space-y-4" },
          activeLecture.quizQuestions.map(function(q, qIdx) {
            var userAns = quizUserAnswers[qIdx];
            var isAnswered = userAns !== undefined;
            var isCorrect = userAns === q.correct;
            return React.createElement(
              "div",
              { key: qIdx, className: "p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3" },
              React.createElement(
                "div",
                { className: "flex items-start gap-2" },
                React.createElement("span", { className: "w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-emerald-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" }, qIdx + 1),
                React.createElement("h4", { className: "text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug" }, q.question)
              ),
              React.createElement(
                "div",
                { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1" },
                q.options.map(function(opt, oIdx) {
                  var selected = userAns === oIdx;
                  var showSuccess = quizSubmitted && oIdx === q.correct;
                  var showDanger = quizSubmitted && selected && !isCorrect;
                  var btnClass = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400";
                  if (selected && !quizSubmitted) btnClass = "border-slate-900 dark:border-emerald-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold ring-1 ring-slate-900 dark:ring-emerald-500";
                  if (showSuccess) btnClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold ring-1 ring-emerald-500";
                  if (showDanger) btnClass = "border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold ring-1 ring-rose-500";

                  return React.createElement(
                    "button",
                    {
                      key: oIdx,
                      type: "button",
                      disabled: quizSubmitted,
                      onClick: function() {
                        setQuizUserAnswers(function(prev) {
                          var n = Object.assign({}, prev);
                          n[qIdx] = oIdx;
                          return n;
                        });
                      },
                      className: "p-3 rounded-xl border text-right text-xs transition-all flex items-center gap-2 " + btnClass
                    },
                    React.createElement("span", { className: "w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0" },
                      String.fromCharCode(65 + oIdx)
                    ),
                    React.createElement("span", { className: "flex-1" }, opt)
                  );
                })
              ),
              quizSubmitted && q.explanation && React.createElement(
                "div",
                { className: "p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1" },
                React.createElement("span", { className: "font-bold text-slate-800 dark:text-slate-200 block" }, "💡 الشرح والتوضيح:"),
                React.createElement("p", null, q.explanation)
              )
            );
          }),
          React.createElement(
            "div",
            { className: "flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800" },
            !quizSubmitted ? React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setQuizSubmitted(true); },
                className: "px-6 py-2 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 text-xs font-bold hover:opacity-90 shadow-sm"
              },
              "تسليم الإجابات والتحقق ✓"
            ) : (function() {
              var total = activeLecture.quizQuestions.length;
              var score = 0;
              activeLecture.quizQuestions.forEach(function(q, i) {
                if (quizUserAnswers[i] === q.correct) score++;
              });
              var pct = Math.round((score / total) * 100);
              return React.createElement(
                "div",
                { className: "flex items-center gap-3" },
                React.createElement(
                  "div",
                  { className: "text-xs font-bold text-slate-800 dark:text-slate-200" },
                  "نتيجتك: " + score + " من " + total + " (" + pct + "%) " + (pct >= 70 ? "🎉 أحسنت عمل رائع!" : "💡 راجع الملاحظات وحاول مجدداً")
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() {
                      setQuizUserAnswers({});
                      setQuizSubmitted(false);
                    },
                    className: "px-4 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-slate-700 text-xs font-bold hover:bg-slate-800"
                  },
                  "🔄 إعادة حل الكويز"
                )
              );
            })()
          )
        ) : React.createElement(
          "div",
          { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs space-y-2" },
          React.createElement("p", null, "لم يتم وضع أسئلة كويز لهذه المحاضرة بعد."),
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (openEditModal) openEditModal(activeLecture, "quiz"); },
              className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm"
            },
            "📝 إعداد أسئلة الكويز الآن"
          )
        )
      ),

      // 6. تبويب تدوين الملاحظات السريعة للمحاضرة
      activeSubTab === "notes" && React.createElement(
        "div",
        { className: "space-y-4 animate-in fade-in duration-200" },
        // نموذج كتابة ملاحظة جديدة
        React.createElement(
          "div",
          { className: "p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3" },
          React.createElement(
            "div",
            { className: "flex items-center justify-between" },
            React.createElement("h4", { className: "text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5" },
              React.createElement("span", null, "✍️"),
              "تدوين فكرة أو ملخص لمحاضرة: " + activeLecture.title
            ),
            noteSavedToast && React.createElement("span", { className: "text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse" }, "✓ تم حفظ الملاحظة بنجاح!")
          ),
          React.createElement("textarea", {
            rows: 4,
            value: quickNoteText,
            onChange: function(e) { setQuickNoteText(e.target.value); },
            placeholder: "سجل أفكارك وتأملاتك العميقة أثناء استماعك للمحاضرة...",
            className: "w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
          }),
          React.createElement(
            "div",
            { className: "flex items-center justify-between pt-1" },
            React.createElement("span", { className: "text-[11px] text-slate-400" }, "تُحفظ تلقائياً في حسابك ومزامنة مع صفحة ملاحظاتي"),
            React.createElement("button", {
              type: "button",
              disabled: isSavingQuickNote || !quickNoteText.trim(),
              onClick: handleSaveQuickNote,
              className: "px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            },
              React.createElement("span", null, "💾"),
              React.createElement("span", null, isSavingQuickNote ? "جاري الحفظ..." : "حفظ الملاحظة")
            )
          )
        ),
        // قائمة الملاحظات السابقة المسجلة لهذه المحاضرة
        lectureNotesList.length > 0 ? React.createElement(
          "div",
          { className: "space-y-2 pt-2" },
          React.createElement("h5", { className: "text-xs font-bold text-slate-500 dark:text-slate-400" }, "ملاحظاتك المسجلة على هذه المحاضرة (" + lectureNotesList.length + "):"),
          lectureNotesList.map(function(n) {
            return React.createElement(
              "div",
              { key: n.id, className: "p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-2xs" },
              React.createElement(
                "div",
                { className: "flex items-center justify-between text-[11px] text-slate-400" },
                React.createElement("span", { className: "font-mono font-bold text-emerald-600 dark:text-emerald-400" }, n.date),
                React.createElement("button", {
                  type: "button",
                  onClick: function() {
                    var shareTxt = "📝 *" + (activeLecture.title || "محاضرة") + "*\n" + n.content;
                    var u = "https://api.whatsapp.com/send?text=" + encodeURIComponent(shareTxt);
                    window.open(u, "_blank");
                  },
                  className: "text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                }, "💬 مشاركة بالواتساب")
              ),
              React.createElement("p", { className: "text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap" }, n.content)
            );
          })
        ) : React.createElement(
          "div",
          { className: "p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl" },
          "لا توجد ملاحظات سابقة مسجلة على هذه المحاضرة بعد. ابدأ بكتابة أول فكرة أعلاه!"
        )
      ),

      // تذييل النافذة للتنقل بين المحاضرات
      (function() {
        var currentIdx = filteredLectures.findIndex(function(l) { return l.id === activeLecture.id; });
        var prevLec = currentIdx > 0 ? filteredLectures[currentIdx - 1] : null;
        var nextLec = currentIdx >= 0 && currentIdx < filteredLectures.length - 1 ? filteredLectures[currentIdx + 1] : null;
        return React.createElement(
          "div",
          { className: "flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs" },
          prevLec ? React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (onSelectLecture) onSelectLecture(prevLec); },
              className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all text-slate-700 dark:text-slate-200"
            },
            "◀ " + (itemSeqInfo[prevLec.id] ? itemSeqInfo[prevLec.id].titleBadge : "") + " " + prevLec.title
          ) : React.createElement("div"),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (onClose) onClose(); },
              className: "px-4 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 font-bold hover:opacity-90 transition-all text-xs"
            },
            "العودة للجدول الكامل ✓"
          ),
          nextLec ? React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (onSelectLecture) onSelectLecture(nextLec); },
              className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all text-slate-700 dark:text-slate-200"
            },
            nextLec.title + " " + (itemSeqInfo[nextLec.id] ? itemSeqInfo[nextLec.id].titleBadge : "") + " ▶"
          ) : React.createElement("div")
        );
      })()
    ),

    // عارض الهاند آوت بملء الشاشة المدمج في التطبيق مع شريط التقليب العائم وحفظ الموضع
    isHandoutFullScreen && (function() {
      var handoutsList = [];
      if (Array.isArray(activeLecture.handouts) && activeLecture.handouts.length > 0) {
        handoutsList = activeLecture.handouts.filter(function(h) { return h && (h.url || h.name); });
      } else if (activeLecture.handoutUrl) {
        handoutsList = [{ id: "legacy", name: activeLecture.handoutName || "ملف الهاند آوت", url: activeLecture.handoutUrl }];
      }
      var activeIdx = Math.min(Math.max(0, selectedHandoutIndex), Math.max(0, handoutsList.length - 1));
      var currentHandout = handoutsList[activeIdx] || null;
      if (!currentHandout || !currentHandout.url) return null;

      return React.createElement(
        "div",
        { className: "fixed inset-0 z-[70] bg-slate-950 flex flex-col font-cairo text-white animate-in fade-in duration-200" },
        // شريط ترويسة عارض الهاند آوت
        React.createElement(
          "div",
          { className: "h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 z-10" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2.5 min-w-0" },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setIsHandoutFullScreen(false); },
                className: "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm active:scale-95 transition-all"
              },
              "✕ رجوع للمحاضرة"
            ),
            React.createElement("div", { className: "min-w-0" },
              React.createElement("h4", { className: "text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md" }, currentHandout.name || activeLecture.title),
              React.createElement("p", { className: "text-[10px] text-slate-400 hidden sm:block truncate" }, (activeLecture.subject || "") + " • " + (activeLecture.speaker || ""))
            )
          ),
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement(
              "a",
              {
                href: currentHandout.url,
                download: true,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 shadow-sm active:scale-95"
              },
              React.createElement("span", null, "⬇️"),
              React.createElement("span", null, "تحميل")
            )
          )
        ),

        // مساحة عرض الـ PDF كاملة الشاشة داخل التطبيق مع دعم التدوير
        React.createElement(
          "div",
          {
            ref: handoutScrollContainerRef,
            className: "flex-1 w-full h-[calc(100vh-56px)] bg-slate-950 relative overflow-y-auto overflow-x-hidden flex items-start justify-center"
          },
          React.createElement("iframe", {
            key: "fullscreen-handout",
            src: (function() {
              var url = currentHandout.url;
              if (url.includes("drive.google.com/file/d/")) {
                return url.replace(/\/view(\?.*)?$/, "/preview");
              }
              return url;
            })(),
            className: "w-full h-full border-0 transition-transform duration-300",
            style: {
              transform: handoutRotation ? ("rotate(" + handoutRotation + "deg)") : "none",
              transformOrigin: "center center",
              minHeight: handoutRotation % 180 !== 0 ? "100vw" : "100%",
              minWidth: handoutRotation % 180 !== 0 ? "100vh" : "100%"
            },
            title: currentHandout.name || "Handout Fullscreen Viewer"
          }),

          // شريط الأدوات العائم الزجاجي الشفاف بمتناول الإبهام بالأسفل
          React.createElement(
            "div",
            {
              className: "fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/40 backdrop-blur-md text-white border border-white/15 shadow-2xl transition-all hover:bg-slate-950/60"
            },
            // زر التدوير 90 درجة
            React.createElement(
              "button",
              {
                type: "button",
                onClick: handleRotateHandout,
                title: "تدوير الصفحة 90 درجة",
                className: "px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-teal-300 font-bold flex items-center gap-1 active:scale-95 transition-all text-xs border border-white/10"
              },
              React.createElement("span", null, "🔄"),
              React.createElement("span", { className: "font-mono text-[11px]" }, handoutRotation + "°")
            ),
            // خط فاصل رفيع
            React.createElement("div", { className: "w-[1px] h-4 bg-white/20 mx-0.5" }),
            // زر الصفحة السابقة (Page Up)
            React.createElement(
              "button",
              {
                type: "button",
                onClick: handleHandoutPageUp,
                title: "الصفحة السابقة (Page Up)",
                className: "w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center active:scale-95 transition-all text-xs border border-white/10"
              },
              "▲"
            ),
            // نص أو أيقونة التصفح
            React.createElement(
              "span",
              { className: "text-[11px] font-bold text-slate-300 px-1 select-none" },
              "صفحة"
            ),
            // زر الصفحة التالية (Page Down)
            React.createElement(
              "button",
              {
                type: "button",
                onClick: handleHandoutPageDown,
                title: "الصفحة التالية (Page Down)",
                className: "w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center active:scale-95 transition-all text-xs border border-white/10"
              },
              "▼"
            )
          )
        )
      );
    })(),

    // نافذة توليد الحزمة التعليمية الشاملة بالأرقام المرنة
    // نافذة إدارة وتخصيص نشر أركان المحاضرة للطلاب
    showPublishModal && React.createElement(
      "div",
      {
        className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn",
        onClick: function(e) { if (e.target === e.currentTarget) setShowPublishModal(false); }
      },
      React.createElement(
        "div",
        {
          className: "relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 space-y-5 animate-scaleUp"
        },
        // رأس النافذة
        React.createElement(
          "div",
          { className: "flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2.5" },
            React.createElement("span", { className: "text-2xl" }, "⚙️"),
            React.createElement(
              "div",
              null,
              React.createElement("h3", { className: "text-sm sm:text-base font-black text-slate-900 dark:text-white" }, "تخصيص وإدارة نشر أركان المحاضرة للطلاب"),
              React.createElement("p", { className: "text-[11px] text-slate-500" }, "تحكم في كل ركن على حدة: انشر الجاهز واحجب ما زال قيد المراجعة")
            )
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setShowPublishModal(false); },
              className: "w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-sm font-bold cursor-pointer"
            },
            "✕"
          )
        ),

        // قائمة الأركان الذكية الأربعة
        React.createElement(
          "div",
          { className: "space-y-3" },
          [
            { id: "transcript", label: "📜 تفريغ المحاضرة من الفيديو", desc: "النص الحرفي الكامل لكلام المحاضر مع التوقيتات الدقيقة", hasData: Boolean(activeLecture.transcript || activeLecture.transcriptText) },
            { id: "summary", label: "📄 الدليل الدراسي المصور", desc: "الشرح الأكاديمي الشامل متضمناً المخططات والمقارنات البصرية المدمجة", hasData: Boolean(activeLecture.writtenSummary || activeLecture.summaryData) },
            { id: "quiz", label: "📝 الاختبار التفاعلي", desc: "أسئلة الكويز الذاتي والتفسيرات التعليمية", hasData: Boolean(activeLecture.quizQuestions && activeLecture.quizQuestions.length > 0) }
          ].map(function(item) {
            var isDraft = getIsDraft(item.id);
            var isPublished = !isDraft;
            return React.createElement(
              "div",
              {
                key: item.id,
                className: "p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 " +
                  (isPublished
                    ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60")
              },
              React.createElement(
                "div",
                { className: "space-y-1 flex-1 pr-1" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2" },
                  React.createElement("h4", { className: "text-xs sm:text-sm font-black text-slate-900 dark:text-white" }, item.label),
                  !item.hasData && React.createElement("span", { className: "text-[10px] text-slate-400 font-normal" }, "(لا يوجد محتوى بعد)")
                ),
                React.createElement("p", { className: "text-[11px] text-slate-500 leading-relaxed" }, item.desc)
              ),
              React.createElement(
                "div",
                { className: "flex items-center gap-2 shrink-0" },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { handlePublishToggle(item.id, isDraft); },
                    className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer " +
                      (isPublished
                        ? "bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm")
                  },
                  React.createElement("span", null, isPublished ? "🔒 حجب (مسودة)" : "🚀 نشر للطلاب")
                )
              )
            );
          })
        ),

        // أزرار التحكم السريعة في الأسفل
        React.createElement(
          "div",
          { className: "flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: handlePublishAll,
                className: "px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1"
              },
              React.createElement("span", null, "🚀"),
              React.createElement("span", null, "نشر الكل")
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: handleUnpublishAll,
                className: "px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold cursor-pointer flex items-center gap-1"
              },
              React.createElement("span", null, "🔒"),
              React.createElement("span", null, "حجب الكل")
            )
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setShowPublishModal(false); },
              className: "px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
            },
            "إغلاق"
          )
        )
      )
    ),

    showPackageModal && React.createElement(
      "div",
      {
        className: "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200",
        onClick: function(e) { if (e.target === e.currentTarget && !isAiGenerating) setShowPackageModal(false); }
      },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5" },

        // رأس النافذة
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("span", { className: "text-2xl" }, "✨"),
            React.createElement(
              "div",
              null,
              React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "توليد الحزمة التعليمية الشاملة"),
              React.createElement("p", { className: "text-xs text-slate-500" }, "حدد الأعداد والمعايير الرقمية بدقة")
            )
          ),
          React.createElement(
            "button",
            {
              type: "button",
              disabled: isAiGenerating,
              onClick: function() { setShowPackageModal(false); },
              className: "w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold"
            },
            "✕"
          )
        ),

        // جسم النافذة: حقول الأرقام المرنة
        React.createElement(
          "div",
          { className: "space-y-4" },

          // 1. عدد صفحات الملخص
          React.createElement(
            "div",
            { className: "flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "text-xs font-bold text-slate-800 dark:text-slate-200 block" }, "📄 عمق الملخص الموسع (بالصفحات):"),
              React.createElement("span", { className: "text-[11px] text-slate-500" }, "اكتب عدد الصفحات التقديرية المطلوبة")
            ),
            React.createElement("input", {
              type: "number",
              min: 1,
              max: 20,
              value: genSummaryPages,
              onChange: function(e) {
                var v = e.target.value;
                setGenSummaryPages(v);
                if (utils && utils.setLocal) utils.setLocal("counsel_gen_summary_pages", v);
              },
              className: "w-20 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
            })
          ),



          // 3. عدد أسئلة الكويز
          React.createElement(
            "div",
            { className: "flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "text-xs font-bold text-slate-800 dark:text-slate-200 block" }, "📝 عدد أسئلة الكويز التفاعلي:"),
              React.createElement("span", { className: "text-[11px] text-slate-500" }, "اكتب عدد الأسئلة المطلوبة بالضبط")
            ),
            React.createElement("input", {
              type: "number",
              min: 3,
              max: 30,
              value: genQuizCount,
              onChange: function(e) {
                var v = e.target.value;
                setGenQuizCount(v);
                if (utils && utils.setLocal) utils.setLocal("counsel_gen_quiz_count", v);
              },
              className: "w-20 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
            })
          ),

          // 4. خيارات التحديد المخصصة
          React.createElement(
            "div",
            { className: "p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2" },
            React.createElement("span", { className: "text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1" }, "الأركان المطلوب توليدها:"),
            React.createElement(
              "div",
              { className: "grid grid-cols-2 gap-2" },
              [
                { id: "transcript", label: "📜 تفريغ المحاضرة من الفيديو" },
                { id: "summary", label: "📄 الدليل الدراسي المصور (الملخص والمخططات المدمجة)" },
                { id: "quiz", label: "📝 الكويز التفاعلي" }
              ].map(function(item) {
                var checked = genSelected[item.id] !== false;
                return React.createElement(
                  "label",
                  { key: item.id, className: "flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer" },
                  React.createElement("input", {
                    type: "checkbox",
                    checked: checked,
                    onChange: function(e) {
                      var n = Object.assign({}, genSelected);
                      n[item.id] = e.target.checked;
                      setGenSelected(n);
                    },
                    className: "rounded text-indigo-600 focus:ring-indigo-500"
                  }),
                  item.label
                );
              })
            )
          ),

          // 5. ملاحظات وتوجيهات خاصة
          React.createElement(
            "div",
            { className: "space-y-1" },
            React.createElement("label", { className: "text-xs font-bold text-slate-700 dark:text-slate-300" }, "ملاحظات أو توجيهات خاصة (اختياري):"),
            React.createElement("textarea", {
              rows: 2,
              value: genCustomPrompt,
              onChange: function(e) { setGenCustomPrompt(e.target.value); },
              placeholder: "مثال: ركز على الأمثلة العملية للتشجيع وقاعدة 1 إلى 9...",
              className: "w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            })
          )
        ),

        // حالة التحميل أثناء التوليد
        isAiGenerating && React.createElement(
          "div",
          { className: "p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 animate-pulse" },
          React.createElement("span", { className: "w-3 h-3 rounded-full bg-indigo-600 animate-ping" }),
          React.createElement("span", null, packageGenStatus || "جاري التوليد...")
        ),

        // أزرار التحكم السفلية
        React.createElement(
          "div",
          { className: "flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" },
          (activeLecture.writtenSummary || activeLecture.presentationSlides || activeLecture.slidesData || activeLecture.slidesDataJson || activeLecture.mindMapData || activeLecture.mindMapDataJson || (activeLecture.quizQuestions && activeLecture.quizQuestions.length > 0) || activeLecture.transcript) && React.createElement(
            "button",
            {
              type: "button",
              disabled: isAiGenerating,
              onClick: function() {
                setShowPackageModal(false);
                handleClearAiPackage();
              },
              className: "mr-auto px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1 transition-all"
            },
            React.createElement("span", null, "🗑️"),
            React.createElement("span", null, "مسح الحزمة الحالية")
          ),
          React.createElement(
            "button",
            {
              type: "button",
              disabled: isAiGenerating,
              onClick: function() { setShowPackageModal(false); },
              className: "px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            },
            "إلغاء"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              disabled: isAiGenerating,
              onClick: handleGenerateFullPackage,
              className: "px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
            },
            React.createElement("span", null, "🚀"),
            React.createElement("span", null, isAiGenerating ? "جاري التوليد..." : "بدء التوليد الذكي الآن")
          )
        )
      )
    ),

    // نافذة تحرير ولصق التفريغ النصي للمسؤول
    isEditingTranscript && React.createElement(
      "div",
      {
        className: "fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200",
        onClick: function(e) { if (e.target === e.currentTarget) setIsEditingTranscript(false); }
      },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("span", { className: "text-2xl" }, "📜"),
            React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "تحرير أو لصق التفريغ النصي للمحاضرة")
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setIsEditingTranscript(false); },
              className: "w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold"
            },
            "✕"
          )
        ),
        React.createElement("p", { className: "text-xs text-slate-500" }, "يمكنك كتابة أو تعديل أو لصق تفريغ المحاضرة بالكامل هنا، وسيتم حفظه فوراً في السحابة:"),
        React.createElement("textarea", {
          rows: 15,
          value: editTranscriptText,
          onChange: function(e) { setEditTranscriptText(e.target.value); },
          placeholder: "الصق نص تفريغ المحاضرة هنا...",
          className: "w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white font-sans leading-loose focus:outline-none focus:ring-2 focus:ring-indigo-500"
        }),
        React.createElement(
          "div",
          { className: "flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setIsEditingTranscript(false); },
              className: "px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            },
            "إلغاء"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() {
                var updated = Object.assign({}, activeLecture, { transcript: editTranscriptText.trim() });
                cloud.saveLecture(updated);
                if (onSelectLecture) onSelectLecture(updated);
                setIsEditingTranscript(false);
                alert("تم حفظ التفريغ النصي للمحاضرة بنجاح!");
              },
              className: "px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            },
            React.createElement("span", null, "💾"),
            React.createElement("span", null, "حفظ التفريغ النصي")
          )
        )
      )
    ),

    // نافذة التعديل وإعادة الصياغة بالذكاء الاصطناعي لركن محدد
    aiEditTarget && React.createElement(
      "div",
      {
        className: "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200",
        onClick: function(e) { if (e.target === e.currentTarget && !isRefining) setAiEditTarget(null); }
      },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5" },
          React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, "✨ طلب تعديل بالذكاء الاصطناعي: " + aiEditTarget),
          React.createElement("button", {
            type: "button",
            onClick: function() { setAiEditTarget(null); },
            className: "text-slate-400 hover:text-slate-600 font-bold"
          }, "✕")
        ),
        React.createElement("p", { className: "text-xs text-slate-500" }, "اكتب توجيهاتك بدقة ليقوم النموذج بتعديل هذا الركن فقط وإعادة حفظه كمسودة للمراجعة:"),
        React.createElement("textarea", {
          rows: 3,
          value: aiEditPrompt,
          onChange: function(e) { setAiEditPrompt(e.target.value); },
          placeholder: "مثال: أعد صياغة النقطة الثالثة واجعلها أكثر عمقاً...",
          className: "w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        }),
        React.createElement(
          "div",
          { className: "flex items-center justify-end gap-2 pt-2" },
          React.createElement("button", {
            type: "button",
            disabled: isRefining,
            onClick: function() { setAiEditTarget(null); },
            className: "px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500"
          }, "إلغاء"),
          React.createElement("button", {
            type: "button",
            disabled: isRefining || !aiEditPrompt.trim(),
            onClick: handleApplyRefinement,
            className: "px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-xs"
          }, isRefining ? "جاري التعديل..." : "تطبيق التعديل الآن")
        )
      )
    )
  );
};
