// شاشة المحاضرات الرئيسية بعد التقسيم المعماري إلى مكونات مستقلة
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
  var [showAddModal, setShowAddModal] = React.useState(false);

  // حقول الفلترة والبحث
  var [searchQuery, setSearchQuery] = React.useState("");
  var [selectedSubject, setSelectedSubject] = React.useState("الكل");
  var [selectedSpeaker, setSelectedSpeaker] = React.useState("الكل");
  var [selectedDate, setSelectedDate] = React.useState("الكل");
  var [sortByDate, setSortByDate] = React.useState("asc"); // ترتيب تسلسلي افتراضي: الأقدم (البداية) للأحدث

  // حقول الإضافة والتعديل
  var [selectedFile, setSelectedFile] = React.useState(null);
  var [isDraggingFile, setIsDraggingFile] = React.useState(false);
  var [isUploading, setIsUploading] = React.useState(false);
  var [uploadStatusText, setUploadStatusText] = React.useState("");

  var [editingLecture, setEditingLecture] = React.useState(null);
  var [editModalTab, setEditModalTab] = React.useState("all");
  var [editingQuizText, setEditingQuizText] = React.useState("");
  var [editingHandoutUrl, setEditingHandoutUrl] = React.useState("");
  var [editingHandoutName, setEditingHandoutName] = React.useState("");
  var [isUploadingHandout, setIsUploadingHandout] = React.useState(false);

  var [newTitle, setNewTitle] = React.useState("");
  var [newSubject, setNewSubject] = React.useState("");
  var [newSpeaker, setNewSpeaker] = React.useState("");
  var [newDate, setNewDate] = React.useState(new Date().toISOString().split("T")[0]);
  var [newSessionOrder, setNewSessionOrder] = React.useState(1);
  var [newMediaUrl, setNewMediaUrl] = React.useState("");
  var [newHandoutUrl, setNewHandoutUrl] = React.useState("");
  var [newHandoutName, setNewHandoutName] = React.useState("");
  var [newAudioSummaryUrl, setNewAudioSummaryUrl] = React.useState("");
  var [newWrittenSummary, setNewWrittenSummary] = React.useState("");
  var [newQuizText, setNewQuizText] = React.useState("");
  var [newNotes, setNewNotes] = React.useState("");

  // فحص وتحديد ما إذا كان العنصر امتحاناً أو تقييماً
  var isItemExam = function(lec) {
    if (!lec) return false;
    if (lec.isExam === true || lec.isExam === "true" || lec.itemType === "exam") return true;
    var text = ((lec.title || "") + " " + (lec.subject || "")).toLowerCase();
    return /امتحان|اختبار|فاينل|final|تقييم/.test(text);
  };

  // تحديد حالة المحاضرة
  var getLectureStatus = function(lec) {
    if (!lec) return { type: "unknown", label: "غير محدد", badgeClass: "bg-slate-100 text-slate-600" };
    var isExam = isItemExam(lec);
    var hasMedia = !!(lec.mediaUrl && lec.mediaUrl.trim());
    var todayStr = new Date().toISOString().split("T")[0];
    var lecDate = (lec.date || "").trim();

    if (isExam) {
      if (hasMedia || lec.handoutUrl) {
        return {
          type: "ready",
          label: "📝 تفاصيل الامتحان متوفرة",
          badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
        };
      }
      if (lecDate && lecDate > todayStr) {
        return {
          type: "upcoming",
          label: "📝 امتحان مجدول",
          badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
        };
      }
      return {
        type: "waiting",
        label: "📝 موعد الامتحان",
        badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
      };
    }

    if (hasMedia) {
      return {
        type: "ready",
        label: "✅ متوفرة ومكتملة",
        badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
      };
    }
    if (lecDate && lecDate > todayStr) {
      return {
        type: "upcoming",
        label: "⏳ محاضرة قادمة",
        badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
      };
    }
    return {
      type: "waiting",
      label: "🔄 بانتظار رفع التسجيل",
      badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
    };
  };

  // إغلاق النوافذ بمفتاح Escape
  React.useEffect(function() {
    var handleKeyDown = function(e) {
      if (e.key === "Escape") {
        if (editingLecture) setEditingLecture(null);
        else if (showAddModal) setShowAddModal(false);
        else if (activeLecture) setActiveLecture(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return function() { window.removeEventListener("keydown", handleKeyDown); };
  }, [editingLecture, showAddModal, activeLecture]);

  // الاشتراك الحي في المحاضرات عبر Firebase
  React.useEffect(function() {
    var unsubscribe = cloud.subscribeLectures(function(cloudList) {
      if (cloudList) {
        cloudList.sort(function(a, b) {
          var dateA = new Date(a.date).getTime() || 0;
          var dateB = new Date(b.date).getTime() || 0;
          if (dateA !== dateB) return dateA - dateB;
          return (a.sessionOrder || 1) - (b.sessionOrder || 1);
        });

        setLectures(cloudList);
        utils.setLocal(cfg.storageKeys.lectures, cloudList);
        if (cloudList.length > 0) {
          setActiveLecture(function(prev) {
            return prev ? (cloudList.find(function(l) { return l.id === prev.id; }) || null) : null;
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

  // خريطة الترقيم التسلسلي الزمني التلقائي
  var chronoList = lectures.slice().sort(function(a, b) {
    var dateA = new Date(a.date).getTime() || 0;
    var dateB = new Date(b.date).getTime() || 0;
    if (dateA !== dateB) return dateA - dateB;
    return (a.sessionOrder || 1) - (b.sessionOrder || 1);
  });

  var itemSeqInfo = {};
  var lectureCounter = 0;
  var examCounter = 0;
  chronoList.forEach(function(lec) {
    if (isItemExam(lec)) {
      examCounter++;
      itemSeqInfo[lec.id] = {
        isExam: true,
        num: null,
        titleBadge: "📝 امتحان",
        fullLabel: "الامتحان والتقييم النهائي"
      };
    } else {
      lectureCounter++;
      itemSeqInfo[lec.id] = {
        isExam: false,
        num: lectureCounter,
        titleBadge: "#" + lectureCounter,
        fullLabel: "المحاضرة رقم: " + lectureCounter
      };
    }
  });

  var filteredLectures = lectures.filter(function(lec) {
    var matchQuery = (lec.title + " " + (lec.subject || "") + " " + (lec.speaker || "") + " " + (lec.notes || "")).toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1;
    var matchSubject = selectedSubject === "الكل" || lec.subject === selectedSubject;
    var matchSpeaker = selectedSpeaker === "الكل" || lec.speaker === selectedSpeaker;
    var matchDate = selectedDate === "الكل" || lec.date === selectedDate;
    return matchQuery && matchSubject && matchSpeaker && matchDate;
  });

  filteredLectures.sort(function(a, b) {
    var dateA = new Date(a.date).getTime() || 0;
    var dateB = new Date(b.date).getTime() || 0;
    if (sortByDate === "asc") {
      if (dateA !== dateB) return dateA - dateB;
      return (a.sessionOrder || 1) - (b.sessionOrder || 1);
    } else {
      if (dateA !== dateB) return dateB - dateA;
      return (b.sessionOrder || 1) - (a.sessionOrder || 1);
    }
  });

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

  var handleAddLecture = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
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
      handoutUrl: newHandoutUrl.trim(),
      handoutName: newHandoutName.trim() || (newHandoutUrl.trim() ? "ملف المرفقات (Handout)" : ""),
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
    setNewHandoutUrl("");
    setNewHandoutName("");
    setNewAudioSummaryUrl("");
    setNewWrittenSummary("");
    setNewQuizText("");
    setNewNotes("");
  };

  var openEditModal = function(lec, targetTab) {
    if (!lec) return;
    setEditingLecture(Object.assign({}, lec));
    setEditModalTab(targetTab || "all");
    setEditingHandoutUrl(lec.handoutUrl || "");
    setEditingHandoutName(lec.handoutName || "");
    setEditingQuizText(
      Array.isArray(lec.quizQuestions) && lec.quizQuestions.length > 0
        ? JSON.stringify(lec.quizQuestions, null, 2)
        : (typeof lec.quizQuestions === "string" ? lec.quizQuestions : "")
    );
  };

  var handleUploadHandout = async function(fileOrFiles) {
    if (!fileOrFiles) return;
    var files = [];
    if (fileOrFiles.length !== undefined && typeof fileOrFiles.length === "number") {
      for (var fIdx = 0; fIdx < fileOrFiles.length; fIdx++) {
        files.push(fileOrFiles[fIdx]);
      }
    } else {
      files.push(fileOrFiles);
    }
    if (files.length === 0) return;

    try {
      setIsUploadingHandout(true);
      var uploadedItems = [];
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var base64Data = await new Promise(function(resolve, reject) {
          var reader = new FileReader();
          reader.onload = function() {
            var result = reader.result;
            var base64 = typeof result === "string" && result.includes(",") ? result.split(",")[1] : result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        var response = await fetch(cfg.driveUploadEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "application/pdf",
            base64Data: base64Data
          })
        });

        var resData = await response.json();
        if (resData.status === "success" && (resData.fileUrl || resData.fileId)) {
          var finalFileUrl = resData.fileUrl || ("https://drive.google.com/file/d/" + resData.fileId + "/view");
          uploadedItems.push({
            id: "h-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
            url: finalFileUrl,
            name: file.name
          });
        } else {
          throw new Error(resData.message || ("فشل رفع الملف: " + file.name));
        }
      }

      setEditingLecture(function(prev) {
        if (!prev) return prev;
        var existing = Array.isArray(prev.handouts)
          ? prev.handouts.slice()
          : (prev.handoutUrl ? [{ id: "h-0", url: prev.handoutUrl, name: prev.handoutName || "ملف الهاند آوت" }] : []);
        var combined = existing.concat(uploadedItems);
        return Object.assign({}, prev, {
          handouts: combined,
          handoutUrl: combined[0] ? combined[0].url : "",
          handoutName: combined[0] ? combined[0].name : ""
        });
      });

      alert(uploadedItems.length > 1 ? "✅ تم رفع " + uploadedItems.length + " ملفات هاند آوت بنجاح!" : "✅ تم رفع ملف الهاند آوت بنجاح وإضافته للمحاضرة!");
    } catch(err) {
      alert("خطأ أثناء رفع ملف الهاند آوت: " + err.message);
    } finally {
      setIsUploadingHandout(false);
    }
  };

  var handleSaveEdit = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingLecture || !editingLecture.title.trim()) return;
    var parsedQuiz = parseQuizInput(editingQuizText);

    var currentHandouts = Array.isArray(editingLecture.handouts)
      ? editingLecture.handouts.filter(function(h) { return h && h.url && h.url.trim(); })
      : (editingLecture.handoutUrl ? [{ id: "h-0", url: editingLecture.handoutUrl.trim(), name: editingLecture.handoutName || "ملف الهاند آوت" }] : []);

    var updated = Object.assign({}, editingLecture, {
      title: editingLecture.title.trim(),
      subject: (editingLecture.subject || "").trim() || "عام",
      speaker: (editingLecture.speaker || "").trim() || "غير محدد",
      date: (editingLecture.date || "").trim(),
      sessionOrder: parseInt(editingLecture.sessionOrder) || 1,
      isExam: !!editingLecture.isExam,
      itemType: editingLecture.itemType || (editingLecture.isExam ? "exam" : "lecture"),
      notes: (editingLecture.notes || "").trim(),
      mediaUrl: (editingLecture.mediaUrl || "").trim(),
      handouts: currentHandouts,
      handoutUrl: currentHandouts[0] ? currentHandouts[0].url : (editingHandoutUrl || "").trim(),
      handoutName: currentHandouts[0] ? currentHandouts[0].name : (editingHandoutName || "").trim(),
      audioSummaryUrl: (editingLecture.audioSummaryUrl || "").trim(),
      writtenSummary: (editingLecture.writtenSummary || "").trim(),
      quizQuestions: parsedQuiz
    });
    cloud.saveLecture(updated);
    if (activeLecture && activeLecture.id === updated.id) {
      setActiveLecture(updated);
    }
    setEditingLecture(null);
  };

  var handleDeleteLecture = async function(lec) {
    if (!lec) return;
    if (!window.confirm("هل ترغب في نقل محاضرة «" + (lec.title || "هذه المحاضرة") + "» إلى سلة المحذوفات؟\n\n💡 سيتم الاحتفاظ بالمحاضرة لمدة 7 أيام ويمكنك استرجاعها في أي وقت بضغطة زر.")) return;
    try {
      if (cloud && cloud.moveToRecycleBin) {
        await cloud.moveToRecycleBin(lec, "lecture", currentUser);
      } else {
        await cloud.deleteDocument("lectures", lec.id);
      }
      setLectures(function(prev) { return prev.filter(function(l) { return l.id !== lec.id; }); });
      if (activeLecture && activeLecture.id === lec.id) {
        setActiveLecture(null);
      }
      alert("🗑️ تم نقل المحاضرة إلى سلة المحذوفات بنجاح. يمكنك استرجاعها خلال 7 أيام من سلة المحذوفات.");
    } catch(err) {
      alert("خطأ أثناء النقل لسلة المحذوفات: " + (err.message || err));
    }
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
        "div",
        { className: "flex items-center gap-2" },
        props.onOpenRecycleBin && React.createElement(
          "button",
          {
            type: "button",
            onClick: props.onOpenRecycleBin,
            title: "سلة المحذوفات والأرشيف المؤقت (حفظ واسترجاع العناصر المحذوفة لمدة 7 أيام)",
            className: "px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
          },
          React.createElement("span", null, "🗑️"),
          React.createElement("span", null, "سلة المحذوفات")
        ),
        React.createElement(
          "button",
          {
            onClick: function() { setShowAddModal(true); },
            className: "bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-md flex items-center gap-2"
          },
          React.createElement("span", null, "➕"),
          React.createElement("span", null, "إضافة أو رفع محاضرة")
        )
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
        React.createElement("label", { className: "block text-xs font-semibold text-slate-500 mb-1" }, "ترتيب المحاضرات"),
        React.createElement("select", {
          value: sortByDate,
          onChange: function(e) { setSortByDate(e.target.value); },
          className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        }, [
          React.createElement("option", { key: "asc", value: "asc" }, "تسلسلي (المحاضرة 1 ⬅ الأخيرة)"),
          React.createElement("option", { key: "desc", value: "desc" }, "عكسي (الأحدث أولاً)")
        ])
      )
    ),

    // قائمة أسطر المحاضرات المدمجة والواضحة
    filteredLectures.length > 0 ? React.createElement(
      "div",
      { className: "space-y-2" },
      filteredLectures.map(function(lec) {
        var seq = itemSeqInfo[lec.id] || { isExam: isItemExam(lec), num: 1, titleBadge: "#1", fullLabel: "المحاضرة" };
        var st = getLectureStatus(lec);
        var isCurrent = activeLecture && activeLecture.id === lec.id;

        return React.createElement(window.LectureRow, {
          key: lec.id,
          lec: lec,
          seq: seq,
          st: st,
          isCurrent: isCurrent,
          currentUser: currentUser,
          utils: utils,
          onSelect: function(item) { setActiveLecture(item); },
          onEdit: function(item) { openEditModal(item); },
          onDelete: function(item) { handleDeleteLecture(item); }
        });
      })
    ) : React.createElement(
      "div",
      { className: "p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 space-y-3" },
      React.createElement("div", { className: "text-3xl" }, "🎧"),
      React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "الأرشيف نظيف وجاهز لرفع محاضراتك الفعلية"),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto" }, "يمكنك إضافة رابط يوتيوب مباشر أو رفع ملف المحاضرة من جهازك.")
    ),

    // مشغل المحاضرة ومحتواها التفاعلي في نافذة منبثقة مستقلة
    activeLecture && React.createElement(window.LectureViewerModal, {
      activeLecture: activeLecture,
      onClose: function() { setActiveLecture(null); },
      currentUser: currentUser,
      utils: utils,
      cloud: cloud,
      ai: ai,
      itemSeqInfo: itemSeqInfo,
      isItemExam: isItemExam,
      getLectureStatus: getLectureStatus,
      openEditModal: openEditModal,
      handleDeleteLecture: handleDeleteLecture,
      handleSavePosition: handleSavePosition,
      filteredLectures: filteredLectures,
      onSelectLecture: function(item) { setActiveLecture(item); }
    }),

    // نافذة إضافة محاضرة جديدة (للمسؤول فقط)
    showAddModal && React.createElement(window.AddLectureModal, {
      isOpen: showAddModal,
      onClose: function() { setShowAddModal(false); },
      onSubmit: handleAddLecture,
      newMediaUrl: newMediaUrl,
      setNewMediaUrl: setNewMediaUrl,
      selectedFile: selectedFile,
      setSelectedFile: setSelectedFile,
      isDraggingFile: isDraggingFile,
      setIsDraggingFile: setIsDraggingFile,
      isUploading: isUploading,
      uploadStatusText: uploadStatusText,
      processSelectedFile: processSelectedFile,
      handleFileSelect: handleFileSelect,
      newSubject: newSubject,
      setNewSubject: setNewSubject,
      subjectsList: subjectsList,
      newDate: newDate,
      setNewDate: setNewDate,
      newSessionOrder: newSessionOrder,
      setNewSessionOrder: setNewSessionOrder,
      newSpeaker: newSpeaker,
      setNewSpeaker: setNewSpeaker,
      newTitle: newTitle,
      setNewTitle: setNewTitle,
      newHandoutUrl: newHandoutUrl,
      setNewHandoutUrl: setNewHandoutUrl,
      newHandoutName: newHandoutName,
      setNewHandoutName: setNewHandoutName,
      newNotes: newNotes,
      setNewNotes: setNewNotes,
      newAudioSummaryUrl: newAudioSummaryUrl,
      setNewAudioSummaryUrl: setNewAudioSummaryUrl,
      newWrittenSummary: newWrittenSummary,
      setNewWrittenSummary: setNewWrittenSummary,
      newQuizText: newQuizText,
      setNewQuizText: setNewQuizText
    }),

    // نافذة إدارة وتعديل المحاضرة (للمسؤول فقط)
    editingLecture && React.createElement(window.LectureEditModal, {
      editingLecture: editingLecture,
      setEditingLecture: setEditingLecture,
      editModalTab: editModalTab,
      setEditModalTab: setEditModalTab,
      editingHandoutUrl: editingHandoutUrl,
      editingHandoutName: editingHandoutName,
      isUploadingHandout: isUploadingHandout,
      handleUploadHandout: handleUploadHandout,
      editingQuizText: editingQuizText,
      setEditingQuizText: setEditingQuizText,
      onSave: handleSaveEdit,
      onClose: function() { setEditingLecture(null); },
      subjectsList: subjectsList
    })
  );
};
