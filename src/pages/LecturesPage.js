// شاشة المحاضرات مع دعم رابط يوتيوب ودرايف والملخص والبودكاست وأدوات الذكاء للمسؤول فقط
window.LecturesPage = function(props) {
  var currentUser = props.currentUser || { role: "admin" };
  var utils = window.APP_UTILS;
  var cfg = window.APP_CONFIG;
  var cloud = window.CloudSyncService;
  var ai = window.GeminiAIService;

  var [lectures, setLectures] = React.useState(function() {
    return utils.getLocal(cfg.storageKeys.lectures, []);
  });

  var [activeLecture, setActiveLecture] = React.useState(null);
  var [activeSubTab, setActiveSubTab] = React.useState("media"); // 'media', 'summary', 'podcast'
  var [showAddModal, setShowAddModal] = React.useState(false);

  // حالة الذكاء الاصطناعي للمسؤول
  var [isAiGenerating, setIsAiGenerating] = React.useState(false);

  // حقول الفلترة والبحث
  var [searchQuery, setSearchQuery] = React.useState("");
  var [selectedSubject, setSelectedSubject] = React.useState("الكل");
  var [selectedSpeaker, setSelectedSpeaker] = React.useState("الكل");
  var [selectedDate, setSelectedDate] = React.useState("الكل");
  var [sortByDate, setSortByDate] = React.useState("desc");

  // حقول الإضافة والتعديل
  var [selectedFile, setSelectedFile] = React.useState(null);
  var [isDraggingFile, setIsDraggingFile] = React.useState(false);
  var [isUploading, setIsUploading] = React.useState(false);
  var [uploadStatusText, setUploadStatusText] = React.useState("");

  var [editingLecture, setEditingLecture] = React.useState(null); // المحاضرة المراد تعديل مادتها وبياناتها
  var [editModalTab, setEditModalTab] = React.useState("all"); // 'all', 'video', 'audio', 'summary', 'quiz', 'info'
  var [editingQuizText, setEditingQuizText] = React.useState("");

  var [newTitle, setNewTitle] = React.useState("");
  var [newSubject, setNewSubject] = React.useState("");
  var [newSpeaker, setNewSpeaker] = React.useState("");
  var [newDate, setNewDate] = React.useState(new Date().toISOString().split("T")[0]);
  var [newSessionOrder, setNewSessionOrder] = React.useState(1);
  var [newMediaUrl, setNewMediaUrl] = React.useState(""); // YouTube or Drive link
  var [newAudioSummaryUrl, setNewAudioSummaryUrl] = React.useState("");
  var [newWrittenSummary, setNewWrittenSummary] = React.useState("");
  var [newQuizText, setNewQuizText] = React.useState("");
  var [newNotes, setNewNotes] = React.useState("");

  // حالة الكويز التفاعلي للدارس
  var [quizUserAnswers, setQuizUserAnswers] = React.useState({});
  var [quizSubmitted, setQuizSubmitted] = React.useState(false);

  React.useEffect(function() {
    var unsubscribe = cloud.subscribeLectures(function(cloudList) {
      if (cloudList) {
        setLectures(cloudList);
        utils.setLocal(cfg.storageKeys.lectures, cloudList);
        if (cloudList.length > 0) {
          setActiveLecture(function(prev) {
            return prev ? (cloudList.find(function(l) { return l.id === prev.id; }) || cloudList[0]) : cloudList[0];
          });
        } else {
          setActiveLecture(null);
        }
      }
    });
    return function() {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  var subjectsList = ["الكل"];
  var speakersList = ["الكل"];
  var datesList = ["الكل"];
  lectures.forEach(function(l) {
    if (l.subject && subjectsList.indexOf(l.subject) === -1) subjectsList.push(l.subject);
    if (l.speaker && speakersList.indexOf(l.speaker) === -1) speakersList.push(l.speaker);
    if (l.date && datesList.indexOf(l.date) === -1) datesList.push(l.date);
  });

  var filteredLectures = lectures.filter(function(lec) {
    var matchQuery = (lec.title + " " + (lec.subject || "") + " " + (lec.speaker || "") + " " + (lec.notes || "")).toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1;
    var matchSubject = selectedSubject === "الكل" || lec.subject === selectedSubject;
    var matchSpeaker = selectedSpeaker === "الكل" || lec.speaker === selectedSpeaker;
    var matchDate = selectedDate === "الكل" || lec.date === selectedDate;
    return matchQuery && matchSubject && matchSpeaker && matchDate;
  });

  filteredLectures.sort(function(a, b) {
    var dateA = new Date(a.date).getTime();
    var dateB = new Date(b.date).getTime();
    if (dateA !== dateB) {
      return sortByDate === "desc" ? dateB - dateA : dateA - dateB;
    }
    return (a.sessionOrder || 1) - (b.sessionOrder || 1);
  });

  // توليد ملخص مكتوب للمحاضرة بالذكاء الاصطناعي (للمسؤول فقط)
  var handleGenerateSummary = async function() {
    if (!activeLecture || currentUser.role !== "admin") return;
    setIsAiGenerating(true);
    try {
      var prompt = "قم بإعداد تلخيص شامل ودقيق وواضح لمحاضرة المشورة: '" + activeLecture.title + "'.\n" +
        "المحاضر: " + activeLecture.speaker + "\n" +
        "الملاحظات الأساسية:\n" + (activeLecture.notes || "مفاهيم الشفاء والنمو النفسي") + "\n\n" +
        "المطلوب: استخراج الأفكار الرئيسية، المفاهيم المحورية، وتطبيقات عملية للدارس بلغة عربية رصينة.";
      var summaryText = await ai.callGemini(prompt);
      
      var updated = Object.assign({}, activeLecture, { writtenSummary: summaryText });
      cloud.saveLecture(updated);
      setActiveLecture(updated);
    } catch (err) {
      alert("خطأ أثناء التوليد: " + err.message);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // توليد سيناريو حوار البودكاست (للمسؤول فقط)
  var handleGeneratePodcast = async function() {
    if (!activeLecture || currentUser.role !== "admin") return;
    setIsAiGenerating(true);
    try {
      var podcastText = await ai.generatePodcastDialogue(activeLecture.title, activeLecture.notes);
      var updated = Object.assign({}, activeLecture, { podcastDialogue: podcastText });
      cloud.saveLecture(updated);
      setActiveLecture(updated);
    } catch (err) {
      alert("خطأ أثناء التوليد: " + err.message);
    } finally {
      setIsAiGenerating(false);
    }
  };

  var processSelectedFile = function(file) {
    if (!file) return;
    setSelectedFile(file);
    if (!newTitle.trim()) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  var handleFileSelect = function(e) {
    var file = e.target.files && e.target.files[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  var handleAddLecture = async function(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    var finalUrl = newMediaUrl.trim();

    if (selectedFile) {
      try {
        setIsUploading(true);
        setUploadStatusText("جاري قراءة وتجهيز الملف من جهازك...");
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

        setUploadStatusText("جاري الرفع المباشر إلى التخزين السحابي...");
        var response = await fetch(cfg.driveUploadEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            mimeType: selectedFile.type || "application/octet-stream",
            base64Data: base64Data
          })
        });

        var resData = await response.json();
        if (resData.status === "success" && (resData.fileUrl || resData.fileId)) {
          finalUrl = resData.fileUrl || ("https://drive.google.com/file/d/" + resData.fileId + "/view");
        } else {
          throw new Error(resData.message || "تعذر إكمال الرفع");
        }
      } catch (err) {
        alert("تنبيه: حدث خطأ أثناء الرفع السحابي: " + err.message);
        setIsUploading(false);
        setUploadStatusText("");
        return;
      }
    }

    var parsedQuiz = parseQuizInput(newQuizText);
    var newLec = {
      id: "lec-" + Date.now(),
      title: newTitle.trim(),
      subject: newSubject.trim() || "عام",
      speaker: newSpeaker.trim() || "غير محدد",
      date: newDate,
      sessionOrder: parseInt(newSessionOrder) || 1,
      mediaUrl: finalUrl,
      audioSummaryUrl: newAudioSummaryUrl.trim(),
      writtenSummary: newWrittenSummary.trim(),
      quizQuestions: parsedQuiz,
      notes: newNotes.trim(),
      lastPosition: 0,
      podcastDialogue: ""
    };

    cloud.saveLecture(newLec);
    if (window.NotificationService && typeof window.NotificationService.broadcastNewLectureNotification === "function") {
      window.NotificationService.broadcastNewLectureNotification(newLec);
    }
    setShowAddModal(false);
    setIsUploading(false);
    setSelectedFile(null);
    setNewTitle("");
    setNewSubject("");
    setNewSpeaker("");
    setNewMediaUrl("");
    setNewAudioSummaryUrl("");
    setNewWrittenSummary("");
    setNewQuizText("");
    setNewNotes("");
  };

  var parseQuizInput = function(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    var trimmed = String(raw).trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        var parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch(e) {}
    }
    var rawBlocks = trimmed.split(/\n\s*\n/);
    var questions = [];
    rawBlocks.forEach(function(block) {
      var lines = block.split("\n").map(function(l) { return l.trim(); }).filter(Boolean);
      if (lines.length < 2) return;
      var qText = "";
      var options = [];
      var correct = 0;
      var explanation = "";

      lines.forEach(function(line) {
        if (line.match(/^(سؤال|س|q|question)[:\s]/i) || (!qText && !line.match(/^([أ-يa-d0-9][\.\-\)]|\*|\-)/i))) {
          qText = line.replace(/^(سؤال|س|q|question)[:\s]*/i, "").trim();
        } else if (line.match(/^(إجابة|الاجابة|حل|correct|answer)[:\s]/i)) {
          var ansStr = line.replace(/^(إجابة|الاجابة|حل|correct|answer)[:\s]*/i, "").trim();
          var num = parseInt(ansStr);
          if (!isNaN(num)) {
            correct = num > 0 ? num - 1 : 0;
          } else if (ansStr.startsWith("أ") || ansStr.toLowerCase().startsWith("a")) correct = 0;
          else if (ansStr.startsWith("ب") || ansStr.toLowerCase().startsWith("b")) correct = 1;
          else if (ansStr.startsWith("ج") || ansStr.toLowerCase().startsWith("c")) correct = 2;
          else if (ansStr.startsWith("د") || ansStr.toLowerCase().startsWith("d")) correct = 3;
        } else if (line.match(/^(شرح|الشرح|explanation)[:\s]/i)) {
          explanation = line.replace(/^(شرح|الشرح|explanation)[:\s]*/i, "").trim();
        } else {
          var opt = line.replace(/^([أ-يa-d0-9][\.\-\)]|\*|\-)\s*/i, "").trim();
          if (opt) options.push(opt);
        }
      });

      if (qText && options.length > 0) {
        questions.push({
          question: qText,
          options: options,
          correct: correct,
          explanation: explanation
        });
      }
    });
    return questions;
  };

  var openEditModal = function(lec, targetTab) {
    if (!lec) return;
    setEditingLecture(Object.assign({}, lec));
    setEditModalTab(targetTab || "all");
    setEditingQuizText(
      Array.isArray(lec.quizQuestions) && lec.quizQuestions.length > 0
        ? JSON.stringify(lec.quizQuestions, null, 2)
        : (typeof lec.quizQuestions === "string" ? lec.quizQuestions : "")
    );
  };

  var handleSaveEdit = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingLecture || !editingLecture.title.trim()) return;
    var parsedQuiz = parseQuizInput(editingQuizText);
    var updated = Object.assign({}, editingLecture, {
      title: editingLecture.title.trim(),
      subject: (editingLecture.subject || "").trim() || "عام",
      speaker: (editingLecture.speaker || "").trim() || "غير محدد",
      mediaUrl: (editingLecture.mediaUrl || "").trim(),
      audioSummaryUrl: (editingLecture.audioSummaryUrl || "").trim(),
      writtenSummary: (editingLecture.writtenSummary || "").trim(),
      quizQuestions: parsedQuiz
    });
    cloud.saveLecture(updated);
    if (activeLecture && activeLecture.id === updated.id) {
      setActiveLecture(updated);
      setQuizUserAnswers({});
      setQuizSubmitted(false);
    }
    setEditingLecture(null);
  };

  var handleSavePosition = function(sec) {
    if (!activeLecture) return;
    setActiveLecture(Object.assign({}, activeLecture, { lastPosition: sec }));
    cloud.updatePlaybackPosition(activeLecture.id, sec);
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
        React.createElement("h2", { className: "text-xl font-bold text-slate-900 dark:text-white" }, "المحاضرات الدراسية"),
        React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1" }, "أرشيف المحاضرات مع دعم روابط يوتيوب وجوجل درايف وحفظ موضع الاستماع التلقائي")
      ),
      currentUser.role === "admin" && React.createElement(
        "button",
        {
          onClick: function() { setShowAddModal(true); },
          className: "bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-md flex items-center gap-2"
        },
        React.createElement("span", null, "➕"),
        React.createElement("span", null, "إضافة أو رفع محاضرة")
      )
    ),

    // شريط الفرز والبحث
    lectures.length > 0 && React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3" },
      React.createElement(
        "div",
        null,
        React.createElement("label", { className: "block text-xs font-semibold text-slate-500 mb-1" }, "بحث بالكلمة"),
        React.createElement("input", {
          type: "text",
          value: searchQuery,
          onChange: function(e) { setSearchQuery(e.target.value); },
          placeholder: "عنوان، مادة، محاضر...",
          className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        })
      ),
      React.createElement(
        "div",
        null,
        React.createElement("label", { className: "block text-xs font-semibold text-slate-500 mb-1" }, "المادة الدراسية"),
        React.createElement("select", {
          value: selectedSubject,
          onChange: function(e) { setSelectedSubject(e.target.value); },
          className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        }, subjectsList.map(function(sub) { return React.createElement("option", { key: sub, value: sub }, sub); }))
      ),
      React.createElement(
        "div",
        null,
        React.createElement("label", { className: "block text-xs font-semibold text-slate-500 mb-1" }, "المحاضر"),
        React.createElement("select", {
          value: selectedSpeaker,
          onChange: function(e) { setSelectedSpeaker(e.target.value); },
          className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        }, speakersList.map(function(s) { return React.createElement("option", { key: s, value: s }, s); }))
      ),
      React.createElement(
        "div",
        null,
        React.createElement("label", { className: "block text-xs font-semibold text-slate-500 mb-1" }, "يوم معين"),
        React.createElement("select", {
          value: selectedDate,
          onChange: function(e) { setSelectedDate(e.target.value); },
          className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        }, datesList.map(function(d) { return React.createElement("option", { key: d, value: d }, d); }))
      ),
      React.createElement(
        "div",
        null,
        React.createElement("label", { className: "block text-xs font-semibold text-slate-500 mb-1" }, "ترتيب زمني"),
        React.createElement("select", {
          value: sortByDate,
          onChange: function(e) { setSortByDate(e.target.value); },
          className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        }, [
          React.createElement("option", { key: "desc", value: "desc" }, "الأحدث أولاً"),
          React.createElement("option", { key: "asc", value: "asc" }, "الأقدم أولاً")
        ])
      )
    ),

    // المحاضرة النشطة مع الألسنة الداخلية الثلاثة
    activeLecture ? React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },

      // رأس المحاضرة
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4" },
        React.createElement(
          "div",
          null,
          React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-1" },
            activeLecture.subject && React.createElement("span", { className: "text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800" }, "📚 " + activeLecture.subject),
            React.createElement("span", { className: "text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg" }, "تاريخ: " + activeLecture.date),
            React.createElement("span", { className: "text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-lg" }, "محاضرة " + (activeLecture.sessionOrder || 1))
          ),
          React.createElement("h3", { className: "text-lg font-bold text-slate-900 dark:text-white" }, activeLecture.title),
          React.createElement("p", { className: "text-xs text-slate-500 mt-0.5" }, "المحاضر: " + activeLecture.speaker)
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-3" },
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              onClick: function() { openEditModal(activeLecture); },
              title: "تعديل المادة أو بيانات المحاضرة",
              className: "px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 shadow-2xs"
            },
            React.createElement("span", null, "✏️"),
            React.createElement("span", null, "تعديل المادة")
          ),
          React.createElement(
            "div",
            { className: "text-left sm:text-right" },
            React.createElement("span", { className: "text-xs text-slate-400 block" }, "التوقف المحفوظ"),
            React.createElement("span", { className: "text-base font-bold text-emerald-600 dark:text-emerald-400" }, utils.formatDuration(activeLecture.lastPosition || 0))
          )
        )
      ),

      // شريط أزرار التحكم السريع للمسؤول (الفيديو، الملخص الصوتي، ريبورت الملخص، الكويز)
      currentUser.role === "admin" && React.createElement(
        "div",
        { className: "flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60" },
        React.createElement("span", { className: "text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-1" },
          React.createElement("span", null, "⚡"),
          React.createElement("span", null, "أزرار التحكم:")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { openEditModal(activeLecture, "video"); },
            className: "px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-1.5 shadow-2xs"
          },
          React.createElement("span", null, "📺"),
          React.createElement("span", null, "رابط الفيديو")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { openEditModal(activeLecture, "audio"); },
            className: "px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-1.5 shadow-2xs"
          },
          React.createElement("span", null, "🎙️"),
          React.createElement("span", null, "الملخص الصوتي (NotebookLM)")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { openEditModal(activeLecture, "summary"); },
            className: "px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-1.5 shadow-2xs"
          },
          React.createElement("span", null, "📄"),
          React.createElement("span", null, "ريبورت الملخص المكتوب")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { openEditModal(activeLecture, "quiz"); },
            className: "px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-1.5 shadow-2xs"
          },
          React.createElement("span", null, "📝"),
          React.createElement("span", null, "كويز المحاضرة")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { openEditModal(activeLecture, "all"); },
            className: "px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs mr-auto"
          },
          React.createElement("span", null, "✏️"),
          React.createElement("span", null, "تعديل الكل")
        )
      ),

      // الألسنة الداخلية الأربعة
      React.createElement(
        "div",
        { className: "flex border-b border-slate-200 dark:border-slate-800 gap-4 overflow-x-auto scrollbar-thin pb-0.5" },
        [
          { id: "media", label: "📺 المشاهدة والاستماع" },
          { id: "summary", label: "📄 الملخص المكتوب" },
          { id: "audio_summary", label: "🎙️ ملخص مسموع (MP3)" },
          { id: "quiz", label: "📝 كويز واختبار تفاعلي" }
        ].map(function(tab) {
          var isCurrent = activeSubTab === tab.id;
          return React.createElement(
            "button",
            {
              key: tab.id,
              onClick: function() { setActiveSubTab(tab.id); },
              className: "pb-3 text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap " +
                (isCurrent ? "border-slate-900 dark:border-emerald-500 text-slate-900 dark:text-white" : "border-transparent text-slate-400 hover:text-slate-600")
            },
            tab.label
          );
        })
      ),

      // 1. تبويب الفيديو والمشغل
      activeSubTab === "media" && React.createElement(
        "div",
        { className: "space-y-4" },
        activeLecture.mediaUrl ? React.createElement(
          "div",
          { className: "w-full rounded-2xl overflow-hidden bg-slate-950 aspect-video md:aspect-[21/9] flex items-center justify-center relative shadow-inner" },
          React.createElement("iframe", {
            src: utils.getMediaEmbedUrl(activeLecture.mediaUrl),
            className: "w-full h-full border-0",
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
            allowFullScreen: true
          })
        ) : React.createElement(
          "div",
          { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm space-y-2" },
          React.createElement("p", null, "لم يتم إرفاق رابط يوتيوب أو تخزين لهذه المحاضرة"),
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { openEditModal(activeLecture, "video"); },
              className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm"
            },
            "📺 إضافة رابط الفيديو الآن"
          )
        ),
        // أزرار التحكم
        React.createElement(
          "div",
          { className: "flex items-center justify-between text-xs pt-1" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("button", {
              onClick: function() { handleSavePosition(Math.max(0, (activeLecture.lastPosition || 0) - 15)); },
              className: "px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
            }, "◀ 15 ثانية"),
            React.createElement("button", {
              onClick: function() { handleSavePosition((activeLecture.lastPosition || 0) + 15); },
              className: "px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
            }, "15 ثانية ▶")
          ),
          React.createElement("span", { className: "text-slate-400" }, "يتم حفظ واستئناف موضع التوقف تلقائياً")
        )
      ),

      // 2. تبويب الملخص المكتوب
      activeSubTab === "summary" && React.createElement(
        "div",
        { className: "space-y-4" },
        currentUser.role === "admin" && React.createElement(
          "div",
          { className: "flex items-center justify-between" },
          React.createElement("h4", { className: "text-xs font-bold text-slate-500" }, "تقرير التلخيص الشامل للمحاضرة:"),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { openEditModal(activeLecture, "summary"); },
              className: "px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:text-emerald-600 shadow-2xs flex items-center gap-1"
            },
            React.createElement("span", null, "✏️"),
            React.createElement("span", null, activeLecture.writtenSummary ? "تعديل ريبورت الملخص" : "لصق ريبورت الملخص (NotebookLM)")
          )
        ),
        activeLecture.writtenSummary ? React.createElement(
          "div",
          { className: "p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs md:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-normal" },
          activeLecture.writtenSummary
        ) : React.createElement(
          "div",
          { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs space-y-2" },
          React.createElement("p", null, "لم يتم إدخال الملخص المكتوب لهذه المحاضرة بعد."),
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { openEditModal(activeLecture, "summary"); },
              className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm"
            },
            "📄 لصق الملخص المكتوب من NotebookLM"
          )
        )
      ),

      // 3. تبويب الملخص المسموع (مشغل صوت حقيقي MP3)
      activeSubTab === "audio_summary" && React.createElement(
        "div",
        { className: "space-y-4" },
        currentUser.role === "admin" && React.createElement(
          "div",
          { className: "flex items-center justify-between" },
          React.createElement("h4", { className: "text-xs font-bold text-slate-500" }, "تراك الاستماع الصوتي:"),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { openEditModal(activeLecture, "audio"); },
              className: "px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:text-emerald-600 shadow-2xs flex items-center gap-1"
            },
            React.createElement("span", null, "🎙️"),
            React.createElement("span", null, (activeLecture.audioSummaryUrl || activeLecture.mediaUrl) ? "تعديل رابط الصوت" : "إضافة رابط الصوت (MP3)")
          )
        ),
        (activeLecture.audioSummaryUrl || activeLecture.mediaUrl) ? React.createElement(
          "div",
          { className: "p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-md space-y-3" },
          React.createElement("div", { className: "flex items-center justify-between" },
            React.createElement("span", { className: "font-bold text-xs flex items-center gap-2" },
              React.createElement("span", { className: "text-base" }, "🎧"),
              React.createElement("span", null, "مشغل الملخص الصوتي المباشر (NotebookLM / MP3)")
            ),
            React.createElement("span", { className: "text-[11px] text-emerald-400 font-mono" }, "جودة صوت فائقة")
          ),
          React.createElement("audio", {
            controls: true,
            src: utils.getAudioStreamUrl(activeLecture.audioSummaryUrl || activeLecture.mediaUrl),
            className: "w-full rounded-xl mt-2 accent-emerald-500"
          })
        ) : React.createElement(
          "div",
          { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs space-y-2" },
          React.createElement("p", null, "لم يتم إضافة ملف صوتي للملخص بعد."),
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { openEditModal(activeLecture, "audio"); },
              className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm"
            },
            "🎙️ إضافة رابط ملف الـ MP3 من NotebookLM"
          )
        )
      ),

      // 4. تبويب الكويز والاختبار التفاعلي
      activeSubTab === "quiz" && React.createElement(
        "div",
        { className: "space-y-4" },
        currentUser.role === "admin" && React.createElement(
          "div",
          { className: "flex items-center justify-between" },
          React.createElement("h4", { className: "text-xs font-bold text-slate-500" }, "أسئلة الاختبار التفاعلي:"),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { openEditModal(activeLecture, "quiz"); },
              className: "px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:text-emerald-600 shadow-2xs flex items-center gap-1"
            },
            React.createElement("span", null, "⚙️"),
            React.createElement("span", null, (activeLecture.quizQuestions && activeLecture.quizQuestions.length > 0) ? "تعديل أسئلة الكويز" : "إضافة أسئلة كويز")
          )
        ),
        (activeLecture.quizQuestions && activeLecture.quizQuestions.length > 0) ? React.createElement(
          "div",
          { className: "space-y-4" },
          // استعراض وحل الأسئلة
          activeLecture.quizQuestions.map(function(q, qIdx) {
            var userChoice = quizUserAnswers[qIdx];
            return React.createElement(
              "div",
              {
                key: qIdx,
                className: "p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border transition-all space-y-2.5 " +
                  (quizSubmitted
                    ? (userChoice === q.correct ? "border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/20" : "border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20")
                    : "border-slate-200 dark:border-slate-700/60")
              },
              React.createElement(
                "div",
                { className: "flex items-center justify-between" },
                React.createElement("h5", { className: "text-xs md:text-sm font-bold text-slate-900 dark:text-white" }, (qIdx + 1) + ". " + q.question),
                quizSubmitted && (userChoice === q.correct
                  ? React.createElement("span", { className: "text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md" }, "✓ صحيح")
                  : React.createElement("span", { className: "text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-md" }, "✗ خطأ")
                )
              ),
              React.createElement(
                "div",
                { className: "space-y-1.5 pt-1" },
                (q.options || []).map(function(opt, oIdx) {
                  var isSelected = userChoice === oIdx;
                  var isCorrect = q.correct === oIdx;
                  var optStyle = "border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200";
                  if (quizSubmitted) {
                    if (isCorrect) {
                      optStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold";
                    } else if (isSelected && !isCorrect) {
                      optStyle = "border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200";
                    }
                  }

                  return React.createElement(
                    "label",
                    {
                      key: oIdx,
                      className: "flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all " + optStyle
                    },
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-2" },
                      React.createElement("input", {
                        type: "radio",
                        name: "quiz-q-" + qIdx,
                        checked: isSelected,
                        disabled: quizSubmitted,
                        onChange: function() {
                          if (!quizSubmitted) {
                            setQuizUserAnswers(Object.assign({}, quizUserAnswers, { [qIdx]: oIdx }));
                          }
                        },
                        className: "accent-emerald-600"
                      }),
                      React.createElement("span", null, opt)
                    ),
                    quizSubmitted && isCorrect && React.createElement("span", { className: "text-[11px] text-emerald-600 dark:text-emerald-400 font-bold" }, "الإجابة الصحيحة ✓")
                  );
                })
              ),
              q.explanation && (quizSubmitted || currentUser.role === "admin") && React.createElement(
                "div",
                { className: "p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200/50" },
                "💡 الشرح: " + q.explanation
              )
            );
          }),

          // أزرار التحقق والنتيجة
          React.createElement(
            "div",
            { className: "p-4 bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3" },
            !quizSubmitted ? React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setQuizSubmitted(true); },
                className: "w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              },
              "تحقق من إجاباتي وحساب النتيجة ✓"
            ) : (function() {
              var total = activeLecture.quizQuestions.length;
              var score = 0;
              activeLecture.quizQuestions.forEach(function(q, i) {
                if (quizUserAnswers[i] === q.correct) score++;
              });
              var pct = Math.round((score / total) * 100);
              return React.createElement(
                "div",
                { className: "flex flex-col sm:flex-row items-center justify-between w-full gap-3" },
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
              onClick: function() { openEditModal(activeLecture, "quiz"); },
              className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm"
            },
            "📝 إعداد أسئلة الكويز الآن"
          )
        )
      )
    ) : React.createElement(
      "div",
      { className: "p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 space-y-3" },
      React.createElement("div", { className: "text-3xl" }, "🎧"),
      React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "الأرشيف نظيف وجاهز لرفع محاضراتك الفعلية"),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto" }, "يمكنك إضافة رابط يوتيوب مباشر أو رفع ملف المحاضرة من جهازك.")
    ),

    // قائمة المحاضرات المرفوعة
    lectures.length > 0 && React.createElement(
      "div",
      { className: "space-y-2.5" },
      React.createElement("div", { className: "flex items-center justify-between text-xs text-slate-500 font-bold px-1" },
        React.createElement("span", null, "سجل المحاضرات (" + filteredLectures.length + ")"),
        React.createElement("span", null, "مرتبة حسب التاريخ وترتيب الجلسة")
      ),
      filteredLectures.map(function(lec) {
        var isCurrent = activeLecture && activeLecture.id === lec.id;
        return React.createElement(
          "div",
          {
            key: lec.id,
            onClick: function() { setActiveLecture(lec); },
            className: "p-4 rounded-2xl border cursor-pointer transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 " +
              (isCurrent ? "bg-slate-100 dark:bg-slate-800 border-slate-400" : "bg-white dark:bg-slate-900 border-slate-200")
          },
          React.createElement(
            "div",
            { className: "flex items-start gap-3" },
            React.createElement("div", { className: "w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs" }, "ج " + (lec.sessionOrder || 1)),
            React.createElement(
              "div",
              null,
              React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, lec.title),
                lec.subject && React.createElement("span", { className: "text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800" }, lec.subject)
              ),
              React.createElement("p", { className: "text-xs text-slate-500 mt-0.5" }, lec.speaker + " • " + lec.date)
            )
          ),
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            currentUser.role === "admin" && React.createElement(
              "button",
              {
                type: "button",
                onClick: function(e) {
                  e.stopPropagation();
                  openEditModal(lec);
                },
                title: "تعديل المادة أو البيانات",
                className: "p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs hover:bg-slate-100 text-slate-600 dark:text-slate-300"
              },
              "✏️"
            ),
            React.createElement("div", { className: "text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-xl" },
              "آخر توقف: " + utils.formatDuration(lec.lastPosition || 0)
            )
          )
        );
      })
    ),

    // نافذة إضافة محاضرة جديدة (للمسؤول فقط)
    showAddModal && React.createElement(
      "div",
      { className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b pb-3" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "تسجيل محاضرة جديدة"),
          !isUploading && React.createElement("button", { onClick: function() { setShowAddModal(false); }, className: "text-slate-400" }, "✕")
        ),
        React.createElement(
          "form",
          { onSubmit: handleAddLecture, className: "space-y-3" },

          // خيار 1: رابط يوتيوب مباشر
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "رابط المحاضرة على YouTube أو Google Drive (اختياري)"),
            React.createElement("input", {
              type: "url",
              value: newMediaUrl,
              onChange: function(e) { setNewMediaUrl(e.target.value); },
              placeholder: "https://www.youtube.com/watch?v=...",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            })
          ),

          // خيار 2: منطقة سحب وإفلات أو اختيار ملف للرفع
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
              React.createElement("div", { className: "text-2xl" }, isDraggingFile ? "📥" : (selectedFile ? "🎬" : "📂")),
              React.createElement("div", { className: "text-xs font-semibold" },
                selectedFile ? "الملف المختار: " + selectedFile.name : (isDraggingFile ? "أفلت الملف هنا للرفع مباشرة..." : "اسحب وأفلت ملف المحاضرة (صوت أو فيديو) هنا")
              ),
              React.createElement("span", { className: "inline-block text-[11px] text-emerald-600 dark:text-emerald-400 underline font-medium" }, "أو اضغط لتصفح جهازك"),
              React.createElement("input", {
                type: "file",
                accept: "audio/*,video/*",
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

          isUploading && React.createElement(
            "div",
            { className: "p-2.5 rounded-xl bg-slate-900 text-white text-center text-xs animate-pulse" },
            uploadStatusText
          ),

          // اسم المادة الدراسية
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "المادة الدراسية (الفرقة / المساق)"),
            React.createElement("input", {
              type: "text",
              value: newSubject,
              onChange: function(e) { setNewSubject(e.target.value); },
              list: "counseling-subjects-list",
              placeholder: "مثال: مادة علم المشورة، النمو النفسي، الطب النفسي...",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            }),
            React.createElement(
              "datalist",
              { id: "counseling-subjects-list" },
              subjectsList.filter(function(s) { return s !== "الكل"; }).map(function(s) {
                return React.createElement("option", { key: s, value: s });
              })
            )
          ),

          // تاريخ المحاضرة والترتيب في اليوم
          React.createElement(
            "div",
            { className: "grid grid-cols-2 gap-3" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "تاريخ اليوم الدراسي"),
              React.createElement("input", {
                type: "date",
                required: true,
                value: newDate,
                onChange: function(e) { setNewDate(e.target.value); },
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              })
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "ترتيب الجلسة في اليوم"),
              React.createElement("select", {
                value: newSessionOrder,
                onChange: function(e) { setNewSessionOrder(e.target.value); },
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              }, [
                React.createElement("option", { key: 1, value: 1 }, "المحاضرة الأولى"),
                React.createElement("option", { key: 2, value: 2 }, "المحاضرة الثانية"),
                React.createElement("option", { key: 3, value: 3 }, "المحاضرة الثالثة")
              ])
            )
          ),

          // المحاضر
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "المحاضر / الدكتور"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: newSpeaker,
              onChange: function(e) { setNewSpeaker(e.target.value); },
              placeholder: "مثال: د. مجدي إسحق، د. إميل جورج...",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),

          // عنوان المحاضرة
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "موضوع وعنوان المحاضرة"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: newTitle,
              onChange: function(e) { setNewTitle(e.target.value); },
              placeholder: "اكتب عنوان المحاضرة...",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),

          // ملاحظات وعناصر
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "ملاحظات أو عناصر رئيسية للملخص"),
            React.createElement("textarea", {
              rows: 2,
              value: newNotes,
              onChange: function(e) { setNewNotes(e.target.value); },
              placeholder: "أهم الأفكار التي تساعد في التلخيص...",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),

          // حقول NotebookLM والكويز الاختيارية عند الإنشاء
          React.createElement(
            "div",
            { className: "border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3" },
            React.createElement("h4", { className: "text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5" },
              React.createElement("span", null, "✨"),
              React.createElement("span", null, "مخرجات NotebookLM والكويز (اختياري):")
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "🎙️ رابط الملخص الصوتي (NotebookLM / MP3)"),
              React.createElement("input", {
                type: "url",
                value: newAudioSummaryUrl,
                onChange: function(e) { setNewAudioSummaryUrl(e.target.value); },
                placeholder: "رابط ملف الـ MP3 من درايف أو خادم التخزين...",
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              })
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "📄 تقرير الملخص المكتوب (NotebookLM)"),
              React.createElement("textarea", {
                rows: 3,
                value: newWrittenSummary,
                onChange: function(e) { setNewWrittenSummary(e.target.value); },
                placeholder: "الصق هنا الملخص المكتوب المستخرج من NotebookLM...",
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              })
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "📝 أسئلة الكويز (JSON أو نص مباشر)"),
              React.createElement("textarea", {
                rows: 3,
                value: newQuizText,
                onChange: function(e) { setNewQuizText(e.target.value); },
                placeholder: 'يمكنك كتابة نص مباشر أو لصق JSON: [{"question":"...","options":["..."],"correct":0}]',
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              })
            )
          ),

          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-2" },
            !isUploading && React.createElement("button", { type: "button", onClick: function() { setShowAddModal(false); }, className: "px-4 py-2 text-xs" }, "إلغاء"),
            React.createElement("button", {
              type: "submit",
              disabled: isUploading,
              className: "px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white"
            }, isUploading ? "جاري الحفظ..." : "حفظ المحاضرة")
          )
        )
      )
    ),

    // نافذة تعديل بيانات أو مادة المحاضرة للمسؤول
    editingLecture && React.createElement(
      "div",
      { className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b pb-3" },
          React.createElement("div", null,
            React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "✏️ إدارة وتعديل المحاضرة"),
            React.createElement("p", { className: "text-xs text-slate-400 mt-0.5" }, editingLecture.title)
          ),
          React.createElement("button", { onClick: function() { setEditingLecture(null); }, className: "text-slate-400 text-lg hover:text-slate-600" }, "✕")
        ),

        // تبويبات النافذة للتنقل السريع
        React.createElement(
          "div",
          { className: "flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800 scrollbar-none" },
          [
            { id: "all", label: "الكل" },
            { id: "video", label: "📺 الفيديو" },
            { id: "audio", label: "🎙️ الملخص الصوتي" },
            { id: "summary", label: "📄 تقرير الملخص" },
            { id: "quiz", label: "📝 الكويز" },
            { id: "info", label: "ℹ️ البيانات العامة" }
          ].map(function(t) {
            var active = editModalTab === t.id;
            return React.createElement(
              "button",
              {
                key: t.id,
                type: "button",
                onClick: function() { setEditModalTab(t.id); },
                className: "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all " +
                  (active ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200")
              },
              t.label
            );
          })
        ),

        React.createElement(
          "form",
          { onSubmit: handleSaveEdit, className: "space-y-4 pt-1" },

          // قسم 1: رابط الفيديو
          (editModalTab === "all" || editModalTab === "video") && React.createElement(
            "div",
            { className: "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5" },
            React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" },
              React.createElement("span", null, "📺"),
              React.createElement("span", null, "رابط المحاضرة على YouTube أو Google Drive")
            ),
            React.createElement("input", {
              type: "url",
              value: editingLecture.mediaUrl || "",
              onChange: function(e) {
                var val = e.target.value;
                setEditingLecture(function(prev) { return Object.assign({}, prev, { mediaUrl: val }); });
              },
              placeholder: "https://www.youtube.com/watch?v=... أو رابط جوجل درايف",
              className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
            }),
            React.createElement("p", { className: "text-[11px] text-slate-400" }, "يدعم روابط يوتيوب العادية والمختصرة وقوائم التشغيل وملفات درايف.")
          ),

          // قسم 2: الملخص الصوتي
          (editModalTab === "all" || editModalTab === "audio") && React.createElement(
            "div",
            { className: "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5" },
            React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" },
              React.createElement("span", null, "🎙️"),
              React.createElement("span", null, "رابط ملف الملخص الصوتي (NotebookLM / MP3)")
            ),
            React.createElement("input", {
              type: "url",
              value: editingLecture.audioSummaryUrl || "",
              onChange: function(e) {
                var val = e.target.value;
                setEditingLecture(function(prev) { return Object.assign({}, prev, { audioSummaryUrl: val }); });
              },
              placeholder: "https://drive.google.com/file/d/... أو رابط ملف mp3 مباشر",
              className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
            }),
            React.createElement("p", { className: "text-[11px] text-slate-400" }, "ارفع ملف الصوت المستخرج من NotebookLM على درايف وضع رابطه هنا ليعمل في المشغل المباشر.")
          ),

          // قسم 3: الملخص المكتوب
          (editModalTab === "all" || editModalTab === "summary") && React.createElement(
            "div",
            { className: "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5" },
            React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" },
              React.createElement("span", null, "📄"),
              React.createElement("span", null, "تقرير الملخص المكتوب (لصق من NotebookLM)")
            ),
            React.createElement("textarea", {
              rows: editModalTab === "summary" ? 10 : 5,
              value: editingLecture.writtenSummary || "",
              onChange: function(e) {
                var val = e.target.value;
                setEditingLecture(function(prev) { return Object.assign({}, prev, { writtenSummary: val }); });
              },
              placeholder: "الصق هنا التقرير الشامل أو الملخص المكتوب الذي استخرجته من NotebookLM...",
              className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs leading-relaxed"
            })
          ),

          // قسم 4: أسئلة الكويز
          (editModalTab === "all" || editModalTab === "quiz") && React.createElement(
            "div",
            { className: "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5" },
            React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" },
              React.createElement("span", null, "📝"),
              React.createElement("span", null, "أسئلة الكويز والاختبار (بصيغة JSON أو نص عربي مباشر)")
            ),
            React.createElement("textarea", {
              rows: editModalTab === "quiz" ? 8 : 4,
              value: editingQuizText,
              onChange: function(e) { setEditingQuizText(e.target.value); },
              placeholder: 'مثال مباشر:\nسؤال: ما هو الأمان النفسي؟\nأ) التقبل والاحتواء\nب) اللوم والنقد\nالإجابة: أ\nالشرح: التقبل أساس المشورة.\n\nأو بصيغة JSON:\n[{"question":"...","options":["أ","ب"],"correct":0,"explanation":"..."}]',
              className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
            }),
            React.createElement("p", { className: "text-[11px] text-slate-400" }, "💡 النظام يتعرف تلقائياً على الأسئلة سواء كانت نصاً عادياً أو صيغة JSON.")
          ),

          // قسم 5: البيانات العامة (العنوان والمحاضر)
          (editModalTab === "all" || editModalTab === "info") && React.createElement(
            "div",
            { className: "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-3" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "المادة الدراسية"),
              React.createElement("input", {
                type: "text",
                value: editingLecture.subject || "",
                onChange: function(e) {
                  var val = e.target.value;
                  setEditingLecture(function(prev) { return Object.assign({}, prev, { subject: val }); });
                },
                list: "counseling-subjects-list-edit",
                placeholder: "مثال: مادة علم المشورة، النمو النفسي...",
                className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
              })
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "عنوان المحاضرة"),
              React.createElement("input", {
                type: "text",
                required: true,
                value: editingLecture.title || "",
                onChange: function(e) {
                  var val = e.target.value;
                  setEditingLecture(function(prev) { return Object.assign({}, prev, { title: val }); });
                },
                className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
              })
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "المحاضر / الدكتور"),
              React.createElement("input", {
                type: "text",
                required: true,
                value: editingLecture.speaker || "",
                onChange: function(e) {
                  var val = e.target.value;
                  setEditingLecture(function(prev) { return Object.assign({}, prev, { speaker: val }); });
                },
                className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
              })
            )
          ),

          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" },
            React.createElement("button", { type: "button", onClick: function() { setEditingLecture(null); }, className: "px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800" }, "إلغاء"),
            React.createElement("button", {
              type: "submit",
              className: "px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white shadow-md active:scale-95 transition-all"
            }, "حفظ التعديلات ✓")
          )
        )
    )
  );
};
