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
  var [newTitle, setNewTitle] = React.useState("");
  var [newSubject, setNewSubject] = React.useState("");
  var [newSpeaker, setNewSpeaker] = React.useState("");
  var [newDate, setNewDate] = React.useState(new Date().toISOString().split("T")[0]);
  var [newSessionOrder, setNewSessionOrder] = React.useState(1);
  var [newMediaUrl, setNewMediaUrl] = React.useState(""); // YouTube or Drive link
  var [newNotes, setNewNotes] = React.useState("");

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

    var newLec = {
      id: "lec-" + Date.now(),
      title: newTitle.trim(),
      subject: newSubject.trim() || "عام",
      speaker: newSpeaker.trim() || "غير محدد",
      date: newDate,
      sessionOrder: parseInt(newSessionOrder) || 1,
      mediaUrl: finalUrl,
      notes: newNotes.trim(),
      lastPosition: 0,
      writtenSummary: "",
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
    setNewNotes("");
  };

  var openEditModal = function(lec) {
    if (!lec) return;
    setEditingLecture(Object.assign({}, lec));
  };

  var handleSaveEdit = function(e) {
    e.preventDefault();
    if (!editingLecture || !editingLecture.title.trim()) return;
    var updated = Object.assign({}, editingLecture, {
      title: editingLecture.title.trim(),
      subject: (editingLecture.subject || "").trim() || "عام",
      speaker: (editingLecture.speaker || "").trim() || "غير محدد"
    });
    cloud.saveLecture(updated);
    if (activeLecture && activeLecture.id === updated.id) {
      setActiveLecture(updated);
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
          { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm" },
          "لم يتم إرفاق رابط يوتيوب أو تخزين لهذه المحاضرة"
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
        activeLecture.writtenSummary ? React.createElement(
          "div",
          { className: "p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs md:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-normal" },
          activeLecture.writtenSummary
        ) : React.createElement(
          "div",
          { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs" },
          "لم يتم إدخال الملخص المكتوب لهذه المحاضرة بعد.",
          currentUser.role === "admin" && React.createElement(
            "p",
            { className: "text-[11px] text-slate-400 mt-2" },
            "يمكنك لصق الملخص المستخرج من NotebookLM عبر زر 'تعديل المادة'."
          )
        )
      ),

      // 3. تبويب الملخص المسموع (مشغل صوت حقيقي MP3)
      activeSubTab === "audio_summary" && React.createElement(
        "div",
        { className: "space-y-4" },
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
          { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs" },
          "لم يتم إضافة ملف صوتي للملخص بعد.",
          currentUser.role === "admin" && React.createElement(
            "p",
            { className: "text-[11px] text-slate-400 mt-2" },
            "يمكنك إرفاق ملف الـ MP3 المستخرج من NotebookLM عبر زر 'تعديل المادة'."
          )
        )
      ),

      // 4. تبويب الكويز والاختبار التفاعلي
      activeSubTab === "quiz" && React.createElement(
        "div",
        { className: "space-y-4" },
        activeLecture.quizQuestions && activeLecture.quizQuestions.length > 0 ? React.createElement(
          "div",
          { className: "space-y-4" },
          activeLecture.quizQuestions.map(function(q, qIdx) {
            return React.createElement(
              "div",
              { key: qIdx, className: "p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2.5" },
              React.createElement("h5", { className: "text-xs md:text-sm font-bold text-slate-900 dark:text-white" }, (qIdx + 1) + ". " + q.question),
              React.createElement(
                "div",
                { className: "space-y-1.5 pt-1" },
                (q.options || []).map(function(opt, oIdx) {
                  return React.createElement(
                    "label",
                    { key: oIdx, className: "flex items-center gap-2 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 text-xs cursor-pointer hover:border-emerald-500 transition-all" },
                    React.createElement("input", { type: "radio", name: "quiz-q-" + qIdx, className: "accent-emerald-600" }),
                    React.createElement("span", { className: "text-slate-700 dark:text-slate-200" }, opt)
                  );
                })
              ),
              q.explanation && React.createElement("p", { className: "text-[11px] text-slate-500 pt-1" }, "💡 الشرح: " + q.explanation)
            );
          })
        ) : React.createElement(
          "div",
          { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs" },
          "لم يتم وضع أسئلة كويز لهذه المحاضرة بعد.",
          currentUser.role === "admin" && React.createElement(
            "p",
            { className: "text-[11px] text-slate-400 mt-2" },
            "يمكنك إضافة أسئلة الكويز بسهولة عبر زر 'تعديل المادة'."
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
        { className: "bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b pb-3" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "✏️ تعديل بيانات ومادة المحاضرة"),
          React.createElement("button", { onClick: function() { setEditingLecture(null); }, className: "text-slate-400" }, "✕")
        ),
        React.createElement(
          "form",
          { onSubmit: handleSaveEdit, className: "space-y-3" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "المادة الدراسية (الفرقة / المساق)"),
            React.createElement("input", {
              type: "text",
              value: editingLecture.subject || "",
              onChange: function(e) {
                var val = e.target.value;
                setEditingLecture(function(prev) { return Object.assign({}, prev, { subject: val }); });
              },
              list: "counseling-subjects-list-edit",
              placeholder: "مثال: مادة علم المشورة، النمو النفسي...",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            }),
            React.createElement(
              "datalist",
              { id: "counseling-subjects-list-edit" },
              subjectsList.filter(function(s) { return s !== "الكل"; }).map(function(s) {
                return React.createElement("option", { key: s, value: s });
              })
            )
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "عنوان وموضوع المحاضرة"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: editingLecture.title || "",
              onChange: function(e) {
                var val = e.target.value;
                setEditingLecture(function(prev) { return Object.assign({}, prev, { title: val }); });
              },
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "المحاضر / الدكتور"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: editingLecture.speaker || "",
              onChange: function(e) {
                var val = e.target.value;
                setEditingLecture(function(prev) { return Object.assign({}, prev, { speaker: val }); });
              },
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "رابط ملف الملخص الصوتي (MP3 أو رابط Google Drive المباشر)"),
            React.createElement("input", {
              type: "url",
              value: editingLecture.audioSummaryUrl || "",
              onChange: function(e) {
                var val = e.target.value;
                setEditingLecture(function(prev) { return Object.assign({}, prev, { audioSummaryUrl: val }); });
              },
              placeholder: "https://drive.google.com/file/d/... أو رابط ملف mp3",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "الملخص المكتوب (لصق من NotebookLM)"),
            React.createElement("textarea", {
              rows: 4,
              value: editingLecture.writtenSummary || "",
              onChange: function(e) {
                var val = e.target.value;
                setEditingLecture(function(prev) { return Object.assign({}, prev, { writtenSummary: val }); });
              },
              placeholder: "الصق هنا الملخص المكتوب الذي استخرجته من NotebookLM...",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "أسئلة الكويز (بصيغة JSON أو سؤال وخيارات)"),
            React.createElement("textarea", {
              rows: 3,
              value: typeof editingLecture.quizQuestions === "string" ? editingLecture.quizQuestions : JSON.stringify(editingLecture.quizQuestions || [], null, 2),
              onChange: function(e) {
                var val = e.target.value;
                var parsed = null;
                try { parsed = JSON.parse(val); } catch (err) {}
                setEditingLecture(function(prev) { return Object.assign({}, prev, { quizQuestions: parsed || val }); });
              },
              placeholder: '[{"question":"السؤال الأول؟","options":["أ","ب","ج"],"correct":0}]',
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-mono"
            })
          ),
          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-2" },
            React.createElement("button", { type: "button", onClick: function() { setEditingLecture(null); }, className: "px-4 py-2 text-xs" }, "إلغاء"),
            React.createElement("button", {
              type: "submit",
              className: "px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white shadow-sm"
            }, "حفظ التعديلات ✓")
          )
        )
      )
    )
  );
};
