// شاشة المنهج الدراسي والتقارير التفاعلية وعارض المنهج الذكي
// تدعم العارض الأصلي فائق الدقة بدون أي أشرطة جانبية مشتتة مع وضع ملء الشاشة الممتد
window.CurriculumPage = function(props) {
  var currentUser = props.currentUser || { role: "student" };
  var isAdmin = currentUser && currentUser.role === "admin";
  var ai = window.GeminiAIService;
  var utils = window.APP_UTILS;
  var curriculumData = window.CURRICULUM_DATA || { subjects: [] };

  // حالة المادة المختارة
  var [selectedSubjectId, setSelectedSubjectId] = React.useState(function() {
    return curriculumData.subjects[0] ? curriculumData.subjects[0].id : "";
  });

  // حالة الصفحة الحالية
  var [pdfCurrentPage, setPdfCurrentPage] = React.useState(function() {
    return utils && utils.getLocal ? utils.getLocal("counsel_curriculum_page", 1) : 1;
  });
  var [pdfTotalPages, setPdfTotalPages] = React.useState(104);
  var [isFullScreen, setIsFullScreen] = React.useState(false);
  var [activeLectureForViewer, setActiveLectureForViewer] = React.useState(null);

  var pdfViewerContainerRef = React.useRef(null);
  var iframeRef = React.useRef(null);

  // حالة نافذة الذكاء الاصطناعي (تلخيص / بنك أسئلة / تقرير)
  var [aiModalOpen, setAiModalOpen] = React.useState(false);
  var [aiModalTitle, setAiModalTitle] = React.useState("");
  var [aiModalContent, setAiModalContent] = React.useState("");
  var [isAiGenerating, setIsAiGenerating] = React.useState(false);
  var [copySuccess, setCopySuccess] = React.useState(false);

  // حالة نافذة رفع / تحديث ملف المنهج
  var [showUploadModal, setShowUploadModal] = React.useState(false);
  var [uploadedFile, setUploadedFile] = React.useState(null);
  var [uploadStatusMsg, setUploadStatusMsg] = React.useState("");
  var [isUploading, setIsUploading] = React.useState(false);

  // استخراج المادة الحالية
  var activeSubject = curriculumData.subjects.find(function(s) {
    return s.id === selectedSubjectId;
  }) || curriculumData.subjects[0];

  var activePdfBaseUrl = curriculumData.pdfUrl || "./curriculum/oula_mashora_smart.pdf";

  // دالة بناء رابط الـ PDF المباشر مع إخفاء الشريط الجانبي للمعاينات وملء العرض
  var buildPdfUrl = function(pageNum) {
    var p = pageNum || pdfCurrentPage || 1;
    // navpanes=0 تخفي شريط المعاينات الجانبي على اليسار
    // pagemode=none تلغي أي نوافذ منبثقة أو فهارس جانبية
    // view=FitH تجعل الصفحة تملأ العرض بالكامل لتكون واسعة ومريحة للقراءة
    return activePdfBaseUrl + "#page=" + p + "&navpanes=0&pagemode=none&view=FitH";
  };

  // مراقبة حدث تبديل ملء الشاشة في المتصفح
  React.useEffect(function() {
    var handleFsChange = function() {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return function() {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // تغيير الصفحة والانتقال الفوري
  var handlePageChange = function(targetPage) {
    var p = parseInt(targetPage, 10);
    if (isNaN(p)) return;
    var valid = Math.max(1, Math.min(p, pdfTotalPages));
    setPdfCurrentPage(valid);
    if (utils && utils.setLocal) {
      utils.setLocal("counsel_curriculum_page", valid);
    }
    if (iframeRef.current) {
      iframeRef.current.src = buildPdfUrl(valid);
    }
  };

  // القفز إلى محاضرة معينة
  var handleJumpToLecture = function(lec, subject) {
    if (!lec) return;
    setActiveLectureForViewer(lec);
    if (subject && subject.id !== selectedSubjectId) {
      setSelectedSubjectId(subject.id);
    }
    handlePageChange(lec.startPage);

    // تمرير الشاشة بلطف إلى العارض
    setTimeout(function() {
      if (pdfViewerContainerRef.current) {
        pdfViewerContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };

  // تبديل وضع ملء الشاشة
  var handleToggleFullScreen = function() {
    if (!document.fullscreenElement) {
      if (pdfViewerContainerRef.current && pdfViewerContainerRef.current.requestFullscreen) {
        pdfViewerContainerRef.current.requestFullscreen().catch(function() {
          setIsFullScreen(true);
        });
      } else {
        setIsFullScreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  // استدعاء الذكاء الاصطناعي لتلخيص المحاضرة
  var handleAiSummarizeLecture = async function(lec, subj) {
    setAiModalTitle("تلخيص ذكي للمحاضرة: " + lec.title);
    setAiModalContent("");
    setAiModalOpen(true);
    setIsAiGenerating(true);
    setCopySuccess(false);

    try {
      var prompt = "أنت مساعد دراسي خبير في علوم المشورة المسيحية. قم بإعداد تلخيص شامل ومكثف للمحاضرة التالية من المنهج المعتمد:\n" +
        "- المادة: " + (subj ? subj.title : "") + " (" + (subj ? subj.code : "") + ")\n" +
        "- عنوان المحاضرة: " + lec.title + "\n" +
        "- نطاق الصفحات في المنهج: " + (lec.printedPages || "") + "\n" +
        "- محاور المحاضرة: " + (lec.topics ? lec.topics.join("، ") : "") + "\n\n" +
        "المطلوب إخراجه بنظام وبأعلى دقة:\n" +
        "1. الفكرة الجوهرية والهدف التعليمي للمحاضرة.\n" +
        "2. تلخيص المحاور الرئيسية في نقاط واضحة ومباشرة.\n" +
        "3. المفاهيم والمصطلحات المشورية الأساسية ومعانيها.\n" +
        "4. تطبيق عملي وتأمل مشوري واقعي يخدم المشير في الخدمة.";

      var res = await ai.callGemini(prompt);
      setAiModalContent(res);
    } catch (err) {
      setAiModalContent("تعذر إتمام التوليد: " + (err.message || String(err)));
    } finally {
      setIsAiGenerating(false);
    }
  };

  // استدعاء الذكاء الاصطناعي لتوليد بنك أسئلة وتطبيقات
  var handleAiQuestions = async function(lec, subj) {
    setAiModalTitle("بنك أسئلة وحالات تطبيقية: " + lec.title);
    setAiModalContent("");
    setAiModalOpen(true);
    setIsAiGenerating(true);
    setCopySuccess(false);

    try {
      var prompt = "أنت أستاذ مشورة خبير يعد اختبارات وبنوك أسئلة استبصار متقدمة.\n" +
        "- المادة: " + (subj ? subj.title : "") + "\n" +
        "- المحاضرة: " + lec.title + "\n" +
        "- محاورها: " + (lec.topics ? lec.topics.join("، ") : "") + "\n\n" +
        "المطلوب إعداد بنك أسئلة مشورية شامل يشمل:\n" +
        "1. ثلاثة أسئلة اختيار من متعدد مع بيان الإجابة الصحيحة وسببها العلمي.\n" +
        "2. سؤالان مقاليان يقيسان الفهم العميق والقدرة على التمييز.\n" +
        "3. حالة واقعية (دراسة حالة مشورية) مع توجيهات المشير للتعامل معها.";

      var res = await ai.callGemini(prompt);
      setAiModalContent(res);
    } catch (err) {
      setAiModalContent("تعذر إتمام التوليد: " + (err.message || String(err)));
    } finally {
      setIsAiGenerating(false);
    }
  };

  // استدعاء الذكاء الاصطناعي لإعداد خريطة ذهنية للمادة
  var handleAiSubjectMindMap = async function(subj) {
    setAiModalTitle("الخريطة الذهنية الشاملة لمادة: " + subj.title);
    setAiModalContent("");
    setAiModalOpen(true);
    setIsAiGenerating(true);
    setCopySuccess(false);

    try {
      var lecturesListText = (subj.lectures || []).map(function(l) {
        return "- المحاضرة " + l.order + ": " + l.title + " (صفحة " + l.printedPages + ")";
      }).join("\n");

      var prompt = "أنت خبير في هندسة المعرفة والمشورة. قم برسم خريطة ذهنية ومفاهيمية لمادة: " + subj.title + " (" + subj.code + ")\n" +
        "المحاضرات المقررة:\n" + lecturesListText + "\n\n" +
        "المطلوب:\n" +
        "1. خريطة تسلسل الأفكار والترابط المنطقي بين المحاضرات.\n" +
        "2. شبكة العلاقات بين المفاهيم الجوهرية لهذه المادة.\n" +
        "3. المخرجات المشورية التي يجب أن يمتلكها الدارس بعد إنهاء هذه المادة.";

      var res = await ai.callGemini(prompt);
      setAiModalContent(res);
    } catch (err) {
      setAiModalContent("تعذر إتمام التوليد: " + (err.message || String(err)));
    } finally {
      setIsAiGenerating(false);
    }
  };

  // توليد التقرير التفاعلي العام للمنهج كاملاً
  var handleGenerateFullCurriculumReport = async function() {
    setAiModalTitle("التقرير الدراسي التفاعلي الشامل لمنهج المشورة");
    setAiModalContent("");
    setAiModalOpen(true);
    setIsAiGenerating(true);
    setCopySuccess(false);

    try {
      var prompt = "أنت مستشار أكاديمي خبير في معهد المشورة. قم بإعداد الدليل المرجعي التفاعلي الشامل للمنهج كاملاً لجميع المواد:\n" +
        "1. النفس الإنسانية (المفهوم الأرثوذكسي، التشريح، الحيل الدفاعية، الاضطرابات، نشوء الحالة والاكتئاب، المشاعر والأفكار).\n" +
        "2. الشخصية الإنسانية (الاحتياجات النفسية، الصورة الذاتية، النضج النفسي ومعاييره).\n" +
        "3. علم المشورة أ (الجذور اللاهوتية، المشير الأعظم، سر الاعتراف والمشورة، تاريخ العلم).\n" +
        "4. علم المشورة ب (ماهية وأهداف المشورة، الثماني ركائز، العلاقة المشورية، المبادئ الأخلاقية، الإشراف والمحاذير).\n" +
        "5. علم النفس العصبي والمخ.\n\n" +
        "صغ التقرير بأسلوب تفاعلي منظم جداً، مع تسليط الضوء على الخريطة الكبرى للتعافي المشوري وأبرز التوصيات للدراسة والامتحانات.";

      var res = await ai.callGemini(prompt);
      setAiModalContent(res);
    } catch (err) {
      setAiModalContent("تعذر إتمام التوليد: " + (err.message || String(err)));
    } finally {
      setIsAiGenerating(false);
    }
  };

  // نسخ محتوى الذكاء الاصطناعي
  var handleCopyAiContent = function() {
    if (!aiModalContent) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(aiModalContent).then(function() {
        setCopySuccess(true);
        setTimeout(function() { setCopySuccess(false); }, 3000);
      });
    }
  };

  // رفع / استبدال ملف المنهج يدوياً
  var handleFileDropOrSelect = function(file) {
    if (!file) return;
    setUploadedFile(file);
    setUploadStatusMsg("تم اختيار الملف: " + file.name + " (" + (file.size / (1024 * 1024)).toFixed(2) + " MB)");
  };

  var handleConfirmUpload = function() {
    if (!uploadedFile) return;
    setIsUploading(true);
    setUploadStatusMsg("جاري حفظ الملف محلياً وتحديث العارض...");

    var reader = new FileReader();
    reader.onload = function(evt) {
      var buffer = evt.target.result;
      if (utils && utils.saveOfflinePdf) {
        utils.saveOfflinePdf("curriculum_full_pdf", buffer).then(function() {
          setIsUploading(false);
          setShowUploadModal(false);
          if (iframeRef.current) {
            iframeRef.current.src = buildPdfUrl(pdfCurrentPage);
          }
          alert("تم تحديث وحفظ ملف المنهج بنجاح على جهازك! متاح دائماً للقراءة بدون إنترنت.");
        }).catch(function() {
          setIsUploading(false);
          setShowUploadModal(false);
          alert("تم تحميل الملف في العارض بنجاح.");
        });
      } else {
        setIsUploading(false);
        setShowUploadModal(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  // حساب اسم المحاضرة التي تحتوي الصفحة الحالية
  var currentLectureMatch = null;
  curriculumData.subjects.forEach(function(s) {
    (s.lectures || []).forEach(function(l) {
      if (pdfCurrentPage >= l.startPage && pdfCurrentPage <= l.endPage) {
        currentLectureMatch = { lecture: l, subject: s };
      }
    });
  });

  return React.createElement(
    "div",
    { className: "space-y-6 pb-20" },

    // 1. بطاقة ترويسة المنهج الشامل
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden" },
      React.createElement(
        "div",
        { className: "flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10" },
        React.createElement(
          "div",
          { className: "space-y-2 max-w-2xl" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("span", { className: "text-2xl" }, "📚"),
            React.createElement("h2", { className: "text-xl sm:text-2xl font-black text-slate-900 dark:text-white" }, curriculumData.title || "المنهج الدراسي المعتمد - معهد المشورة"),
            React.createElement("span", { className: "text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800" }, "السنة الأولى")
          ),
          React.createElement("p", { className: "text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed" }, curriculumData.subtitle || "المقرر الشامل مقسم بالمواد والمحاضرات وأرقام الصفحات الرسمية، مع أدوات القراءة التفاعلية والاستبصار الذكي"),
          React.createElement(
            "div",
            { className: "flex flex-wrap items-center gap-2 pt-1" },
            React.createElement("span", { className: "text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700" }, "📑 104 صفحات"),
            React.createElement("span", { className: "text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700" }, "🎓 5 مواد رئيسية"),
            React.createElement("span", { className: "text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700" }, "🎙️ 21 محاضرة متكاملة")
          )
        ),
        React.createElement(
          "div",
          { className: "flex flex-wrap items-center gap-2.5 shrink-0" },
          // زر تحميل المنهج كاملاً
          React.createElement(
            "a",
            {
              href: activePdfBaseUrl,
              download: "منهج_المشورة_السنة_الأولى.pdf",
              className: "px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 active:scale-95 transition-all"
            },
            React.createElement("span", null, "📥"),
            React.createElement("span", null, "تحميل المنهج كاملاً")
          ),
          // زر فتح في نافذة مستقلة
          React.createElement(
            "a",
            {
              href: buildPdfUrl(pdfCurrentPage),
              target: "_blank",
              rel: "noopener noreferrer",
              className: "px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
            },
            React.createElement("span", null, "↗️"),
            React.createElement("span", null, "فتح في تبويب مستقل")
          ),
          // زر التقرير التفاعلي الشامل
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleGenerateFullCurriculumReport,
              className: "px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 active:scale-95 transition-all border border-slate-700"
            },
            React.createElement("span", null, "✨"),
            React.createElement("span", null, "تقرير استبصار شامل")
          ),
          // زر رفع / استبدال المنهج
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setShowUploadModal(true); },
              title: "رفع أو تحديث ملف المنهج من جهازك",
              className: "px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-200 dark:border-slate-700"
            },
            React.createElement("span", null, "🔄"),
            React.createElement("span", { className: "hidden sm:inline" }, "رفع نسخة جديدة")
          )
        )
      )
    ),

    // 2. تبويبات اختيار المادة الدراسية
    React.createElement(
      "div",
      { className: "space-y-3" },
      React.createElement(
        "div",
        { className: "flex items-center justify-between" },
        React.createElement("h3", { className: "text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2" },
          React.createElement("span", null, "🗂️"),
          "اختر المادة الدراسية لاستعراض محاضراتها:"
        ),
        React.createElement("span", { className: "text-xs text-slate-400" }, "انقر على أي مادة للانتقال لمحاضراتها")
      ),
      React.createElement(
        "div",
        { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5" },
        curriculumData.subjects.map(function(s) {
          var isSelected = s.id === activeSubject.id;
          return React.createElement(
            "button",
            {
              key: s.id,
              type: "button",
              onClick: function() { setSelectedSubjectId(s.id); },
              className: "p-3 rounded-2xl text-right transition-all flex flex-col justify-between space-y-2 border " +
                (isSelected
                  ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-md scale-[1.02]"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700")
            },
            React.createElement(
              "div",
              { className: "flex items-center justify-between w-full" },
              React.createElement("span", { className: "text-xl" }, s.icon),
              React.createElement("span", { className: "text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg " + (s.badgeColor || "bg-slate-100 text-slate-700") }, s.code)
            ),
            React.createElement(
              "div",
              null,
              React.createElement("h4", { className: "text-xs sm:text-sm font-bold truncate " + (isSelected ? "text-indigo-900 dark:text-indigo-200" : "text-slate-800 dark:text-slate-200") }, s.title),
              React.createElement("p", { className: "text-[10px] text-slate-500 dark:text-slate-400 mt-0.5" }, (s.lectures ? s.lectures.length : 0) + " محاضرات • ص " + s.startPage + "-" + s.endPage)
            )
          );
        })
      )
    ),

    // 3. كارت المادة النشطة وتفاصيلها وأزرار العمليات
    activeSubject && React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4" },
        React.createElement(
          "div",
          { className: "flex items-center gap-3" },
          React.createElement("div", { className: "w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shrink-0" }, activeSubject.icon),
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { className: "flex items-center gap-2" },
              React.createElement("h3", { className: "text-base sm:text-lg font-bold text-slate-900 dark:text-white" }, activeSubject.title),
              React.createElement("span", { className: "text-xs font-mono font-bold px-2 py-0.5 rounded-lg " + (activeSubject.badgeColor || "bg-slate-100") }, activeSubject.code)
            ),
            React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5" }, activeSubject.description)
          )
        ),
        React.createElement(
          "div",
          { className: "flex flex-wrap items-center gap-2 w-full sm:w-auto" },
          // تحميل مذكرات المادة فقط
          activeSubject.downloadUrl && React.createElement(
            "a",
            {
              href: activeSubject.downloadUrl,
              download: activeSubject.title + ".pdf",
              className: "px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            },
            React.createElement("span", null, "📥"),
            React.createElement("span", null, "تحميل مذكرة المادة")
          ),
          // توليد خريطة ذهنية للمادة
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { handleAiSubjectMindMap(activeSubject); },
              className: "px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 transition-all"
            },
            React.createElement("span", null, "🧠"),
            React.createElement("span", null, "خريطة ذهنية للمادة")
          )
        )
      ),

      // 4. قائمة محاضرات المادة
      React.createElement(
        "div",
        { className: "space-y-3" },
        React.createElement("h4", { className: "text-xs font-bold text-slate-700 dark:text-slate-300" }, "محاضرات المادة المقررة في المنهج (" + ((activeSubject.lectures && activeSubject.lectures.length) || 0) + " محاضرات):"),
        React.createElement(
          "div",
          { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },
          (activeSubject.lectures || []).map(function(lec) {
            return React.createElement(
              "div",
              {
                key: lec.id,
                className: "p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between space-y-3"
              },
              React.createElement(
                "div",
                { className: "space-y-2" },
                React.createElement(
                  "div",
                  { className: "flex items-start justify-between gap-2" },
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-2" },
                    React.createElement("span", { className: "w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0" }, lec.order),
                    React.createElement("h5", { className: "text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight" }, lec.title)
                  ),
                  React.createElement("span", { className: "text-[10px] font-mono font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 shrink-0" }, "ص " + (lec.printedPages || lec.startPage))
                ),
                lec.summary && React.createElement("p", { className: "text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pr-8" }, lec.summary),
                lec.topics && lec.topics.length > 0 && React.createElement(
                  "div",
                  { className: "flex flex-wrap gap-1 pr-8 pt-0.5" },
                  lec.topics.map(function(t, idx) {
                    return React.createElement("span", { key: idx, className: "text-[9px] bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md" }, t);
                  })
                )
              ),
              React.createElement(
                "div",
                { className: "flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800" },
                // زر فتح وقراءة المحاضرة
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { handleJumpToLecture(lec, activeSubject); },
                    className: "flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  },
                  React.createElement("span", null, "📖"),
                  React.createElement("span", null, "قراءة المحاضرة")
                ),
                // زر تلخيص ذكي
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { handleAiSummarizeLecture(lec, activeSubject); },
                    title: "تلخيص ذكي للمحاضرة بالذكاء الاصطناعي",
                    className: "py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                  },
                  React.createElement("span", null, "✨"),
                  React.createElement("span", { className: "hidden sm:inline" }, "تلخيص")
                ),
                // زر بنك أسئلة
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { handleAiQuestions(lec, activeSubject); },
                    title: "توليد بنك أسئلة وحالات مشورية لهذه المحاضرة",
                    className: "py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                  },
                  React.createElement("span", null, "❓"),
                  React.createElement("span", { className: "hidden sm:inline" }, "أسئلة")
                )
              )
            );
          })
        )
      )
    ),

    // 5. عارض المنهج الدراسي فائق الدقة الممتد بالكامل (Native Viewer)
    React.createElement(
      "div",
      {
        ref: pdfViewerContainerRef,
        className: "bg-slate-900 dark:bg-slate-950 rounded-3xl border border-slate-700/80 dark:border-slate-800 shadow-2xl overflow-hidden transition-all " +
          (isFullScreen
            ? "fixed inset-0 z-[9999] rounded-none p-3 h-screen w-screen flex flex-col justify-between bg-slate-950"
            : "space-y-3 p-4 sm:p-5")
      },

      // شريط أدوات العارض
      React.createElement(
        "div",
        { className: "flex flex-wrap items-center justify-between gap-3 text-white border-b border-slate-800 pb-3 text-xs shrink-0" },
        // يمين: اسم المحاضرة أو المادة
        React.createElement(
          "div",
          { className: "flex items-center gap-2" },
          React.createElement("span", { className: "text-lg" }, "📖"),
          React.createElement(
            "div",
            null,
            React.createElement("div", { className: "font-bold text-xs text-slate-100 flex items-center gap-2" },
              React.createElement("span", null, currentLectureMatch ? currentLectureMatch.lecture.title : (activeSubject ? activeSubject.title : "عارض المنهج الدراسي")),
              React.createElement("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" }, "خطوط نقية 100%")
            ),
            React.createElement("div", { className: "text-[10px] text-slate-400" },
              currentLectureMatch ? ("مادة: " + currentLectureMatch.subject.title + " • " + currentLectureMatch.subject.code) : "منهج السنة الأولى"
            )
          )
        ),

        // وسط: أزرار التنقل السريع بين المحاضرات
        React.createElement(
          "div",
          { className: "flex items-center gap-2" },
          React.createElement("span", { className: "text-[11px] text-slate-400 hidden md:inline" }, "قفز سريع:"),
          React.createElement(
            "select",
            {
              value: currentLectureMatch && currentLectureMatch.lecture ? currentLectureMatch.lecture.id : "",
              onChange: function(e) {
                var selectedId = e.target.value;
                curriculumData.subjects.forEach(function(s) {
                  var found = (s.lectures || []).find(function(l) { return l.id === selectedId; });
                  if (found) handleJumpToLecture(found, s);
                });
              },
              className: "bg-slate-800 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-indigo-500 max-w-[200px] truncate"
            },
            React.createElement("option", { value: "" }, "اختر محاضرة للقفز..."),
            curriculumData.subjects.map(function(s) {
              return React.createElement(
                "optgroup",
                { key: s.id, label: s.title + " (" + s.code + ")" },
                (s.lectures || []).map(function(l) {
                  return React.createElement("option", { key: l.id, value: l.id }, l.order + ". " + l.title + " (ص " + (l.printedPages || l.startPage) + ")");
                })
              );
            })
          )
        ),

        // يسار: أزرار الصفحات والتكبير وملء الشاشة
        React.createElement(
          "div",
          { className: "flex items-center gap-1.5" },
          // السابق
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { handlePageChange(pdfCurrentPage - 1); },
              disabled: pdfCurrentPage <= 1,
              className: "p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition-all font-bold",
              title: "الصفحة السابقة"
            },
            "▶"
          ),
          // رقم الصفحة الحالية
          React.createElement(
            "div",
            { className: "flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs font-mono font-bold" },
            React.createElement("input", {
              type: "number",
              value: pdfCurrentPage,
              onChange: function(e) { handlePageChange(e.target.value); },
              min: 1,
              max: pdfTotalPages,
              className: "w-10 bg-transparent text-center text-emerald-400 font-bold focus:outline-none"
            }),
            React.createElement("span", { className: "text-slate-500" }, "/"),
            React.createElement("span", { className: "text-slate-300" }, pdfTotalPages)
          ),
          // التالي
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { handlePageChange(pdfCurrentPage + 1); },
              disabled: pdfCurrentPage >= pdfTotalPages,
              className: "p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition-all font-bold",
              title: "الصفحة التالية"
            },
            "◀"
          ),

          // فتح في تبويب خارجي
          React.createElement(
            "a",
            {
              href: buildPdfUrl(pdfCurrentPage),
              target: "_blank",
              rel: "noopener noreferrer",
              className: "p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all font-bold",
              title: "فتح في تبويب مستقل"
            },
            "↗️"
          ),

          // ملء الشاشة (الممتد لعرض الورقة فقط دون المعاينات الجانبية)
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleToggleFullScreen,
              className: "px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all font-bold flex items-center gap-1 shadow-sm active:scale-95",
              title: isFullScreen ? "الخروج من ملء الشاشة" : "وضع ملء الشاشة للورقة فقط"
            },
            React.createElement("span", null, isFullScreen ? "🗗" : "⛶"),
            React.createElement("span", { className: "hidden sm:inline" }, isFullScreen ? "خروج" : "ملء الشاشة")
          )
        )
      ),

      // مساحة العرض الممتدة للورقة فقط (بدون معارض جانبية أو شريط معاينات)
      React.createElement(
        "div",
        {
          className: "w-full overflow-hidden rounded-2xl border border-slate-800 bg-white " +
            (isFullScreen ? "flex-1 h-full min-h-0" : "h-[75vh] min-h-[600px]")
        },
        React.createElement("iframe", {
          ref: iframeRef,
          key: "curriculum-native-iframe-" + pdfCurrentPage + "-" + (isFullScreen ? "fs" : "norm"),
          src: buildPdfUrl(pdfCurrentPage),
          title: "عارض المنهج الأصلي",
          className: "w-full h-full border-none rounded-2xl bg-white",
          style: { display: "block" }
        })
      )
    ),

    // 6. نافذة الذكاء الاصطناعي (التلخيص / الأسئلة / الخرائط)
    aiModalOpen && React.createElement(
      "div",
      { className: "fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" },
        React.createElement(
          "div",
          { className: "p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("span", { className: "text-xl" }, "✨"),
            React.createElement("h3", { className: "text-sm sm:text-base font-bold text-slate-900 dark:text-white" }, aiModalTitle)
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setAiModalOpen(false); },
              className: "w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold"
            },
            "✕"
          )
        ),
        React.createElement(
          "div",
          { className: "p-5 overflow-y-auto flex-1 space-y-3" },
          isAiGenerating ? React.createElement(
            "div",
            { className: "text-center py-12 space-y-3 text-slate-500 dark:text-slate-400" },
            React.createElement("div", { className: "text-3xl animate-bounce" }, "🧠"),
            React.createElement("p", { className: "text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300" }, "جاري التوليد والتحليل الذكي بواسطة الذكاء الاصطناعي..."),
            React.createElement("p", { className: "text-[11px] text-slate-400" }, "يتم استخراج المفاهيم وربطها برؤية معهد المشورة")
          ) : React.createElement(
            "div",
            { className: "text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800" },
            aiModalContent
          )
        ),
        React.createElement(
          "div",
          { className: "p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleCopyAiContent,
              disabled: isAiGenerating || !aiModalContent,
              className: "px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40"
            },
            React.createElement("span", null, copySuccess ? "✓" : "📋"),
            React.createElement("span", null, copySuccess ? "تم النسخ بنجاح!" : "نسخ المحتوى")
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setAiModalOpen(false); },
              className: "px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
            },
            "إغلاق"
          )
        )
      )
    ),

    // 7. نافذة رفع / تحديث ملف المنهج
    showUploadModal && React.createElement(
      "div",
      { className: "fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white flex items-center gap-2" },
            React.createElement("span", null, "🔄"),
            "رفع أو تحديث ملف المنهج الدراسي"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setShowUploadModal(false); },
              className: "w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold"
            },
            "✕"
          )
        ),
        React.createElement(
          "div",
          {
            className: "p-6 rounded-2xl border-2 border-dashed border-indigo-400/60 bg-indigo-50/30 dark:bg-indigo-950/20 text-center space-y-2 cursor-pointer",
            onClick: function() {
              var input = document.getElementById("curriculum-file-input-modal");
              if (input) input.click();
            }
          },
          React.createElement("div", { className: "text-3xl" }, "📥"),
          React.createElement("p", { className: "text-xs font-bold text-slate-700 dark:text-slate-200" }, "انقر لاختيار ملف المنهج الجديد من جهازك"),
          React.createElement("p", { className: "text-[11px] text-slate-400" }, "يقبل ملفات بصيغة PDF فقط"),
          React.createElement("input", {
            id: "curriculum-file-input-modal",
            type: "file",
            accept: "application/pdf",
            className: "hidden",
            onChange: function(e) {
              if (e.target.files && e.target.files[0]) {
                handleFileDropOrSelect(e.target.files[0]);
              }
            }
          })
        ),
        uploadStatusMsg && React.createElement(
          "p",
          { className: "text-xs text-indigo-600 dark:text-indigo-400 font-semibold text-center" },
          uploadStatusMsg
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2 pt-2" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleConfirmUpload,
              disabled: !uploadedFile || isUploading,
              className: "flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
            },
            isUploading ? "جاري الحفظ والتحديث..." : "تأكيد الحفظ وتحديث المنهج"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setShowUploadModal(false); },
              className: "py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
            },
            "إغلاق"
          )
        )
      )
    )
  );
};
