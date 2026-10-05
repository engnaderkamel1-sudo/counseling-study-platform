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

  // حقول الإضافة
  var [selectedFile, setSelectedFile] = React.useState(null);
  var [isDraggingFile, setIsDraggingFile] = React.useState(false);
  var [isUploading, setIsUploading] = React.useState(false);
  var [uploadStatusText, setUploadStatusText] = React.useState("");

  var [isAiAnalyzingBook, setIsAiAnalyzingBook] = React.useState(false);
  var [newTitle, setNewTitle] = React.useState("");
  var [newAuthor, setNewAuthor] = React.useState("");
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
            return prev ? (cloudList.find(function(b) { return b.id === prev.id; }) || cloudList[0]) : cloudList[0];
          });
        } else {
          setActiveBook(null);
        }
      }
    });
    return function() {
      if (typeof unsubscribe === "function") unsubscribe();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  var handlePageChange = function(newPage) {
    if (!activeBook) return;
    var validPage = Math.max(1, Math.min(newPage, activeBook.totalPages || 500));
    setActiveBook(Object.assign({}, activeBook, { currentPage: validPage }));
    cloud.updateBookPage(activeBook.id, validPage);
  };

  // تشغيل / إيقاف القراءة الصوتية بالمتصفح (Web Speech TTS)
  var handleToggleSpeech = function(chapterIndex, textToRead) {
    if (!window.speechSynthesis) {
      alert("خاصية القراءة الصوتية غير مدعومة في هذا المتصفح.");
      return;
    }

    if (speakingChapterIdx === chapterIndex) {
      window.speechSynthesis.cancel();
      setSpeakingChapterIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    var cleanText = (textToRead || "").replace(/[#*`_]/g, "").trim();
    if (!cleanText) return;

    var utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "ar-SA";
    utterance.rate = 0.95;
    utterance.onend = function() {
      setSpeakingChapterIdx(null);
    };
    utterance.onerror = function() {
      setSpeakingChapterIdx(null);
    };

    setSpeakingChapterIdx(chapterIndex);
    window.speechSynthesis.speak(utterance);
  };

  // توليد ملخص صوتي ونصي للفصل أو المقدمة (للمسؤول فقط)
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
      var prompt = "أنت مساعد متخصص في تلخيص مراجع المشورة والنمو الإنساني.\n" +
        "قم بإعداد ملخص مركز وشامل لـ: '" + chName + "' من كتاب: '" + activeBook.title + "' للمؤلف '" + (activeBook.author || "") + "'.\n" +
        "المطلوب إرجاع صيغة JSON نظيفة:\n" +
        "{\n" +
        '  "writtenSummary": "نقاط رئيسية واضحة ومكثفة تشرح الفكرة الجوهرية والتطبيقات العملية لهذا الجزء (تصلح للقراءة السريعة والمذاكرة)",\n' +
        '  "audioScript": "سيناريو ملخص مسموع شائق وهادئ بصيغة المخاطب، مناسب للاستماع أثناء القيادة في السيارة يشرح أهم معالم هذا الجزء في 3-5 دقائق"\n' +
        "}\n" +
        "أرجع الـ JSON فقط بدون علامات ماركداون إضافية وبدون نصوص خارجية.";
      
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

    // شريط اختيار الكتاب في حال وجود عدة مراجع
    books.length > 1 && React.createElement(
      "div",
      { className: "flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin" },
      books.map(function(b) {
        var isSelected = activeBook && activeBook.id === b.id;
        return React.createElement(
          "button",
          {
            key: b.id,
            onClick: function() { setActiveBook(b); },
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

    // الكتاب النشط
    activeBook ? React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6" },

      // رأس الكتاب والتحكم بالصفحات
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" },
        React.createElement(
          "div",
          null,
          React.createElement("h3", { className: "text-lg font-bold text-slate-900 dark:text-white" }, activeBook.title),
          React.createElement("p", { className: "text-xs text-slate-500" }, "المؤلف: " + activeBook.author + " • إجمالي الصفحات: " + activeBook.totalPages + " صفحة")
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
                  React.createElement("span", null, "ملخص صوتي (للسيارة)")
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
                    ch.audioScript || ch.summaryText
                  ),
                  // مشغل القراءة الصوتية بالمتصفح
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs" },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: function() { handleToggleSpeech(idx, ch.audioScript || ch.summaryText); },
                        className: "px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 " +
                          (isSpeaking
                            ? "bg-rose-600 text-white animate-pulse"
                            : "bg-emerald-600 text-white hover:bg-emerald-700")
                      },
                      React.createElement("span", null, isSpeaking ? "⏹️ إيقاف الصوت" : "▶️ استماع الآن بصوت واضح")
                    ),
                    React.createElement("span", { className: "text-[11px] text-emerald-700 dark:text-emerald-300 font-medium" }, "مخصص للاستماع أثناء القيادة 🚗")
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
    ) : React.createElement(
      "div",
      { className: "p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 space-y-3" },
      React.createElement("div", { className: "text-3xl" }, "📚"),
      React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "المكتبة جاهزة لاستقبال الكتب والمراجع"),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto" }, "اضغط على زر 'إضافة مرجع جديد' لرفع كتابك الأول بصيغة PDF وتجهيز فصوله.")
    ),

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
