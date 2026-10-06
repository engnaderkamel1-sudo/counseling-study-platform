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
  var [activeTabByChapter, setActiveTabByChapter] = React.useState({}); // idx -> "written" | "audio"
  var [activeChapterAudioIdx, setActiveChapterAudioIdx] = React.useState(null); // idx of playing track
  
  // حالات عارض الـ PDF بدون إنترنت وحفظ الصفحة
  var [pdfDoc, setPdfDoc] = React.useState(null);
  var [pdfCurrentPage, setPdfCurrentPage] = React.useState(1);
  var [pdfTotalPages, setPdfTotalPages] = React.useState(1);
  var [isPdfLoading, setIsPdfLoading] = React.useState(false);
  var [isSavedOffline, setIsSavedOffline] = React.useState(false);
  var [isSavingOffline, setIsSavingOffline] = React.useState(false);
  var [offlineSaveMsg, setOfflineSaveMsg] = React.useState("");
  var pdfCanvasRef = React.useRef(null);

  // حقول تعديل الفصل (إدخال ملخص مكتوب أو رابط صوت التراك من NotebookLM)
  var [editingChapterIdx, setEditingChapterIdx] = React.useState(null);
  var [editChapterTitle, setEditChapterTitle] = React.useState("");
  var [editChapterSummary, setEditChapterSummary] = React.useState("");
  var [editChapterAudioUrl, setEditChapterAudioUrl] = React.useState("");

  var stopAudioPlayback = function() {
    try {
      var allAudios = document.querySelectorAll("audio");
      allAudios.forEach(function(a) { a.pause(); });
      setActiveChapterAudioIdx(null);
    } catch (e) {}
  };

  // حقول الإضافة للكتاب الجديد
  var [selectedFile, setSelectedFile] = React.useState(null);
  var [isDraggingFile, setIsDraggingFile] = React.useState(false);
  var [isUploading, setIsUploading] = React.useState(false);
  var [uploadStatusText, setUploadStatusText] = React.useState("");

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

  // فحص ما إذا كان الكتاب الحالي مخزناً بالفعل للقراءة بدون إنترنت
  React.useEffect(function() {
    if (!activeBook) {
      setIsSavedOffline(false);
      setPdfDoc(null);
      return;
    }
    setPdfCurrentPage(activeBook.currentPage || 1);
    utils.getOfflinePdf(activeBook.id).then(function(data) {
      setIsSavedOffline(!!data);
      if (data) {
        loadPdfFromData(data);
      } else if (activeBook.driveUrl) {
        // محاولة تحميل من الرابط إن توفر
        loadPdfFromUrl(activeBook.driveUrl);
      }
    });
  }, [activeBook && activeBook.id]);

  // تحميل ومعالجة مستند الـ PDF عبر PDF.js
  var loadPdfFromData = function(dataArrayBuffer) {
    if (!window.pdfjsLib) return;
    setIsPdfLoading(true);
    window.pdfjsLib.getDocument({ data: dataArrayBuffer }).promise.then(function(loadedDoc) {
      setPdfDoc(loadedDoc);
      setPdfTotalPages(loadedDoc.numPages);
      setIsPdfLoading(false);
      renderPdfPage(loadedDoc, activeBook ? (activeBook.currentPage || 1) : 1);
    }).catch(function(err) {
      console.warn("PDF load error:", err);
      setIsPdfLoading(false);
    });
  };

  var loadPdfFromUrl = function(url) {
    if (!window.pdfjsLib) return;
    var streamUrl = utils.getAudioStreamUrl(url); // رابط التنزيل المباشر
    setIsPdfLoading(true);
    window.pdfjsLib.getDocument({ url: streamUrl }).promise.then(function(loadedDoc) {
      setPdfDoc(loadedDoc);
      setPdfTotalPages(loadedDoc.numPages);
      setIsPdfLoading(false);
      renderPdfPage(loadedDoc, activeBook ? (activeBook.currentPage || 1) : 1);
    }).catch(function() {
      setIsPdfLoading(false);
    });
  };

  var renderPdfPage = function(doc, pageNum) {
    if (!doc || !pdfCanvasRef.current) return;
    var num = Math.max(1, Math.min(pageNum, doc.numPages));
    doc.getPage(num).then(function(page) {
      var canvas = pdfCanvasRef.current;
      if (!canvas) return;
      var context = canvas.getContext("2d");
      var viewport = page.getViewport({ scale: 1.3 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      var renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      page.render(renderContext);
      setPdfCurrentPage(num);
    });
  };

  // تغيير الصفحة في قارئ الـ PDF وحفظها سحابياً ومحلياً تلقائياً
  var handlePageChange = function(newPage) {
    if (!activeBook) return;
    var total = pdfTotalPages || activeBook.totalPages || 500;
    var validPage = Math.max(1, Math.min(newPage, total));
    setPdfCurrentPage(validPage);
    if (pdfDoc) {
      renderPdfPage(pdfDoc, validPage);
    }
    setActiveBook(Object.assign({}, activeBook, { currentPage: validPage }));
    cloud.updateBookPage(activeBook.id, validPage);
  };

  // حفظ الكتاب للقراءة أوفلاين (بدون إنترنت) داخل ذاكرة الجهاز
  var handleSaveOffline = async function() {
    if (!activeBook) return;
    try {
      setIsSavingOffline(true);
      setOfflineSaveMsg("جاري تحميل وحفظ ملف الكتاب للقراءة بدون إنترنت...");
      var downloadUrl = utils.getAudioStreamUrl(activeBook.driveUrl);
      var resp = await fetch(downloadUrl);
      if (!resp.ok) throw new Error("تعذر جلب ملف الكتاب");
      var arrayBuffer = await resp.arrayBuffer();
      var saved = await utils.saveOfflinePdf(activeBook.id, arrayBuffer);
      if (saved) {
        setIsSavedOffline(true);
        setOfflineSaveMsg("تم حفظ الكتاب بنجاح! متاح للقراءة أوفلاين في أي وقت بدون إنترنت ✓");
        loadPdfFromData(arrayBuffer);
      } else {
        throw new Error("تعذر حفظ الملف محلياً");
      }
    } catch (e) {
      setOfflineSaveMsg("تنبيه: " + (e.message || "فشل التحميل للقراءة بدون إنترنت"));
    } finally {
      setIsSavingOffline(false);
      setTimeout(function() { setOfflineSaveMsg(""); }, 4000);
    }
  };

  // حذف الكتاب من الذاكرة المحلية لتوفير المساحة
  var handleRemoveOffline = async function() {
    if (!activeBook) return;
    await utils.removeOfflinePdf(activeBook.id);
    setIsSavedOffline(false);
    alert("تم إزالة النسخة المحفوظة أوفلاين من هذا الجهاز بنجاح.");
  };

  // فتح نافذة تعديل بيانات الفصل (الملخص والرابط الصوتي المستخرج من NotebookLM)
  var openEditChapterModal = function(idx, ch) {
    setEditingChapterIdx(idx);
    setEditChapterTitle(ch.title || ("الفصل " + (idx + 1)));
    setEditChapterSummary(ch.summaryText || "");
    setEditChapterAudioUrl(ch.audioScript || ch.audioUrl || "");
  };

  // حفظ التعديلات على الفصل في السحابة ومحلياً
  var handleSaveChapterEdit = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeBook || editingChapterIdx === null) return;
    var updatedChapters = (activeBook.chapters || []).slice();
    updatedChapters[editingChapterIdx] = Object.assign({}, updatedChapters[editingChapterIdx], {
      title: editChapterTitle.trim(),
      summaryText: editChapterSummary.trim(),
      audioUrl: editChapterAudioUrl.trim(),
      audioScript: editChapterAudioUrl.trim(), // للتوافق
      hasAudio: !!editChapterAudioUrl.trim()
    });
    var updatedBook = Object.assign({}, activeBook, { chapters: updatedChapters });
    cloud.saveBook(updatedBook);
    setActiveBook(updatedBook);
    setEditingChapterIdx(null);
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
        React.createElement("span", null, "📕"),
        React.createElement("span", null, "رفع كتاب أو مرجع جديد (PDF)")
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

      // عارض الـ PDF التفاعلي المدمج (Native PDF Reader) الداعم للقراءة بدون إنترنت
      (activeBook.driveUrl || isSavedOffline) && React.createElement(
        "div",
        { className: "w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2 p-3" },
        
        // شريط أدوات قارئ الكتاب وحالة الأوفلاين
        React.createElement(
          "div",
          { className: "flex flex-wrap items-center justify-between gap-2 px-2 py-1 text-white border-b border-slate-800 pb-2.5 text-xs" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("span", { className: "text-base" }, "📖"),
            React.createElement("span", { className: "font-bold text-xs" }, "قارئ الكتاب المدمج"),
            isSavedOffline ? React.createElement(
              "span",
              { className: "bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full" },
              "✓ متاح للقراءة أوفلاين بدون نت"
            ) : React.createElement(
              "span",
              { className: "bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-medium px-2 py-0.5 rounded-full" },
              "سحابي (يحتاج إنترنت)"
            )
          ),
          React.createElement(
            "div",
            { className: "flex items-center gap-2 mr-auto" },
            // زر حفظ الكتاب للقراءة أوفلاين
            !isSavedOffline ? React.createElement(
              "button",
              {
                type: "button",
                onClick: handleSaveOffline,
                disabled: isSavingOffline,
                className: "px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              },
              React.createElement("span", null, "📥"),
              React.createElement("span", null, isSavingOffline ? "جاري الحفظ..." : "تحميل للقراءة بدون نت")
            ) : React.createElement(
              "button",
              {
                type: "button",
                onClick: handleRemoveOffline,
                className: "px-2.5 py-1 text-[11px] text-slate-400 hover:text-rose-400"
              },
              "إلغاء الحفظ المحلي"
            )
          )
        ),

        offlineSaveMsg && React.createElement(
          "div",
          { className: "p-2 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-center text-xs font-semibold" },
          offlineSaveMsg
        ),

        // لوحة عرض الصفحة (PDF Canvas Viewer)
        React.createElement(
          "div",
          { className: "relative min-h-[420px] max-h-[650px] overflow-auto flex items-center justify-center bg-slate-950 rounded-xl p-2" },
          isPdfLoading && React.createElement(
            "div",
            { className: "absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10 text-white text-xs font-bold gap-2" },
            React.createElement("span", { className: "animate-spin text-lg" }, "⏳"),
            React.createElement("span", null, "جاري فتح صفحات الكتاب وحفظ موضع القراءة...")
          ),
          pdfDoc ? React.createElement("canvas", {
            ref: pdfCanvasRef,
            className: "max-w-full shadow-2xl rounded-lg bg-white"
          }) : React.createElement(
            "iframe",
            {
              src: utils.getDrivePreviewUrl(activeBook.driveUrl),
              className: "w-full h-[480px] border-0 rounded-lg",
              title: activeBook.title
            }
          )
        )
      ),

      // قسم فصول الكتاب وتراكات الصوت والملخصات (Chapter Tracks & Audio)
      React.createElement(
        "div",
        { className: "space-y-3 pt-2" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between" },
          React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, "تراكات الفصول والملخصات الصوتية (NotebookLM)"),
          !(activeBook.chapters || []).some(function(c) { return c.title && c.title.includes("المقدمة"); }) && currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() {
                var updatedChapters = [{
                  number: 0,
                  title: "المقدمة والمدخل",
                  summaryText: "",
                  audioUrl: "",
                  hasAudio: false
                }].concat(activeBook.chapters || []);
                var updatedBook = Object.assign({}, activeBook, { chapters: updatedChapters });
                cloud.saveBook(updatedBook);
                setActiveBook(updatedBook);
              },
              className: "text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 transition-all shadow-xs"
            },
            "➕ إضافة تراك المقدمة"
          )
        ),

        // قائمة تراكات الفصول
        React.createElement(
          "div",
          { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
          (activeBook.chapters || []).map(function(ch, idx) {
            var currentTab = activeTabByChapter[idx] || (ch.audioUrl || ch.audioScript ? "audio" : "written");
            var hasAudioTrack = !!(ch.audioUrl || ch.audioScript);

            return React.createElement(
              "div",
              {
                key: idx,
                className: "p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3 shadow-xs"
              },
              // عنوان الفصل ورقم التراك
              React.createElement(
                "div",
                { className: "flex items-center justify-between" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-xs font-mono bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md font-bold" }, "Track " + (idx + 1)),
                  React.createElement("span", { className: "text-sm font-bold text-slate-900 dark:text-white" }, ch.title || ("الفصل " + (idx + 1)))
                ),
                currentUser.role === "admin" && React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { openEditChapterModal(idx, ch); },
                    className: "text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs"
                  },
                  "✏️ تعديل التراك"
                )
              ),

              // أزرار الاختيار: مكتوب أو صوتي
              React.createElement(
                "div",
                { className: "flex items-center p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold" },
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
                  React.createElement("span", null, "ملخص مسموع (MP3)")
                ),
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
                )
              ),

              // محتوى التراك
              currentTab === "audio" ? React.createElement(
                "div",
                { className: "space-y-2" },
                hasAudioTrack ? React.createElement(
                  "div",
                  { className: "p-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-md space-y-2" },
                  React.createElement("div", { className: "flex items-center justify-between text-xs" },
                    React.createElement("span", { className: "font-bold flex items-center gap-1.5" },
                      React.createElement("span", null, "🎧"),
                      React.createElement("span", null, "صوت استوديو نقي (NotebookLM)")
                    ),
                    React.createElement("span", { className: "text-[10px] text-emerald-400 font-mono" }, "تراك مستقل")
                  ),
                  React.createElement("audio", {
                    controls: true,
                    src: utils.getAudioStreamUrl(ch.audioUrl || ch.audioScript),
                    className: "w-full rounded-lg accent-emerald-500"
                  })
                ) : React.createElement(
                  "div",
                  { className: "p-4 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs" },
                  "لم يتم إضافة ملف الصوت (MP3) لهذا التراك بعد.",
                  currentUser.role === "admin" && React.createElement(
                    "button",
                    {
                      onClick: function() { openEditChapterModal(idx, ch); },
                      className: "block mx-auto mt-2 text-emerald-600 dark:text-emerald-400 underline font-semibold text-xs"
                    },
                    "إضافة رابط الصوت من NotebookLM"
                  )
                )
              ) : React.createElement(
                "div",
                { className: "space-y-2" },
                ch.summaryText ? React.createElement(
                  "div",
                  { className: "text-xs text-slate-600 dark:text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 leading-relaxed font-normal" },
                  ch.summaryText
                ) : React.createElement(
                  "div",
                  { className: "p-4 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs" },
                  "لا يوجد ملخص مكتوب لهذا الفصل بعد.",
                  currentUser.role === "admin" && React.createElement(
                    "button",
                    {
                      onClick: function() { openEditChapterModal(idx, ch); },
                      className: "block mx-auto mt-2 text-emerald-600 dark:text-emerald-400 underline font-semibold text-xs"
                    },
                    "لصق الملخص المكتوب من NotebookLM"
                  )
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
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "رابط ملف الـ PDF على Google Drive (بديل في حال عدم اختيار ملف من الجهاز)"),
              React.createElement("input", {
                type: "url",
                value: newDriveUrl,
                onChange: function(e) { setNewDriveUrl(e.target.value); },
                placeholder: "https://drive.google.com/file/d/... رابط ملف الـ PDF المباشر",
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
    ),

    // نافذة تعديل التراك / الفصل (لصق ملخص NotebookLM ورابط الصوت MP3)
    editingChapterIdx !== null && React.createElement(
      "div",
      { className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b pb-3" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "✏️ تعديل تراك الفصل (NotebookLM)"),
          React.createElement("button", { onClick: function() { setEditingChapterIdx(null); }, className: "text-slate-400" }, "✕")
        ),
        React.createElement(
          "form",
          { onSubmit: handleSaveChapterEdit, className: "space-y-3" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "عنوان الفصل / التراك"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: editChapterTitle,
              onChange: function(e) { setEditChapterTitle(e.target.value); },
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "رابط ملف الصوت للتراك (MP3 أو Google Drive)"),
            React.createElement("input", {
              type: "url",
              value: editChapterAudioUrl,
              onChange: function(e) { setEditChapterAudioUrl(e.target.value); },
              placeholder: "رابط ملف الصوت الذي نزلته من NotebookLM ورفعته على درايف...",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            }),
            React.createElement("p", { className: "text-[10px] text-slate-400 mt-1" }, "💡 ارفع ملف الـ MP3 الذي استخرجته من NotebookLM على جوجل درايف وضع رابطه هنا.")
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "الملخص المكتوب للفصل"),
            React.createElement("textarea", {
              rows: 5,
              value: editChapterSummary,
              onChange: function(e) { setEditChapterSummary(e.target.value); },
              placeholder: "الصق هنا الملخص المكتوب المستخرج من NotebookLM...",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),
          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-2" },
            React.createElement("button", { type: "button", onClick: function() { setEditingChapterIdx(null); }, className: "px-4 py-2 text-xs" }, "إلغاء"),
            React.createElement("button", {
              type: "submit",
              className: "px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white shadow-sm"
            }, "حفظ التراك والملخص ✓")
          )
        )
      )
    )
  );
};
