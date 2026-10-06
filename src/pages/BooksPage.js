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
  var [pdfTotalPages, setPdfTotalPages] = React.useState(0);
  var [isPdfLoading, setIsPdfLoading] = React.useState(false);
  var [isSavedOffline, setIsSavedOffline] = React.useState(false);
  var [isSavingOffline, setIsSavingOffline] = React.useState(false);
  var [offlineSaveMsg, setOfflineSaveMsg] = React.useState("");
  var [pdfRotation, setPdfRotation] = React.useState(0); // 0, 90, 180, 270
  var [isFullScreen, setIsFullScreen] = React.useState(false);
  var pdfCanvasRef = React.useRef(null);
  var pdfViewerContainerRef = React.useRef(null);
  var pdfRenderTaskRef = React.useRef(null);

  // حقول تعديل الفصل (إدخال ملخص مكتوب أو رابط صوت التراك من NotebookLM)
  var [editingChapterIdx, setEditingChapterIdx] = React.useState(null);
  var [editChapterTitle, setEditChapterTitle] = React.useState("");
  var [editChapterSummary, setEditChapterSummary] = React.useState("");
  var [editChapterAudioUrl, setEditChapterAudioUrl] = React.useState("");

  // مشغل المكتبة الصوتية المتتالية (Audiobook Playlist Player)
  var [audiobookTrackIdx, setAudiobookTrackIdx] = React.useState(0);
  var [isAudiobookPlaying, setIsAudiobookPlaying] = React.useState(false);
  var [audiobookPlaybackRate, setAudiobookPlaybackRate] = React.useState(1.0);
  var [audiobookCurrentTime, setAudiobookCurrentTime] = React.useState(0);
  var [audiobookDuration, setAudiobookDuration] = React.useState(0);
  var audiobookRef = React.useRef(null);

  // حقل تعديل غلاف الكتاب للكتاب الحالي
  var [showCoverEditModal, setShowCoverEditModal] = React.useState(false);
  var [editingCoverUrl, setEditingCoverUrl] = React.useState("");
  var [isUploadingCover, setIsUploadingCover] = React.useState(false);

  var stopAudioPlayback = function() {
    try {
      if (audiobookRef.current) {
        audiobookRef.current.pause();
      }
      setIsAudiobookPlaying(false);
      var allAudios = document.querySelectorAll("audio");
      allAudios.forEach(function(a) { a.pause(); });
      setActiveChapterAudioIdx(null);
    } catch (e) {}
  };

  // حقول الإضافة للكتاب الجديد
  var [selectedFile, setSelectedFile] = React.useState(null);
  var [selectedCoverFile, setSelectedCoverFile] = React.useState(null);
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
      setPdfTotalPages(0);
      return;
    }
    setPdfCurrentPage(activeBook.currentPage || 1);
    setPdfTotalPages(0);
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

  var getMaxPages = function() {
    if (pdfDoc && pdfTotalPages > 0) return pdfTotalPages;
    if (activeBook && activeBook.totalPages && Number(activeBook.totalPages) > 0) return Number(activeBook.totalPages);
    if (pdfTotalPages > 0) return pdfTotalPages;
    return 500;
  };

  var renderPdfPage = function(doc, pageNum, rotationAngle) {
    if (!doc || !pdfCanvasRef.current) return;
    var num = Math.max(1, Math.min(pageNum, doc.numPages));
    var rot = typeof rotationAngle === "number" ? rotationAngle : pdfRotation;

    if (pdfRenderTaskRef.current) {
      try {
        pdfRenderTaskRef.current.cancel();
      } catch (e) {}
    }

    doc.getPage(num).then(function(page) {
      var canvas = pdfCanvasRef.current;
      if (!canvas) return;
      var context = canvas.getContext("2d");
      var viewport = page.getViewport({ scale: 1.35, rotation: rot });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      var renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      var renderTask = page.render(renderContext);
      pdfRenderTaskRef.current = renderTask;
      renderTask.promise.then(function() {
        pdfRenderTaskRef.current = null;
        setPdfCurrentPage(num);
      }).catch(function(err) {
        if (err && err.name === "RenderingCancelledException") return;
        console.warn("Render error:", err);
      });
    }).catch(function(err) {
      console.warn("getPage error:", err);
    });
  };

  // تدوير صفحة القارئ 90 درجة
  var handleRotatePage = function() {
    var nextRot = (pdfRotation + 90) % 360;
    setPdfRotation(nextRot);
    if (pdfDoc) {
      renderPdfPage(pdfDoc, pdfCurrentPage, nextRot);
    }
  };

  // تبديل وضع ملء الشاشة (Full Screen)
  var toggleFullScreen = function() {
    var container = pdfViewerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(function() {});
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
      setIsFullScreen(true);
      // محاولة قلب الشاشة لوضع العرض الأفقي (Landscape) على الهواتف والأجهزة الذكية
      try {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock("landscape").catch(function() {});
        }
      } catch (e) {}
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(function() {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      setIsFullScreen(false);
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch (e) {}
    }
  };

  // الاستماع لحدث الخروج من ملء الشاشة عبر زر ESC أو المتصفح
  React.useEffect(function() {
    var handleFsChange = function() {
      var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullScreen(isFs);
      if (!isFs) {
        try {
          if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
          }
        } catch (e) {}
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return function() {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // تغيير الصفحة في قارئ الـ PDF وحفظها سحابياً ومحلياً تلقائياً
  var handlePageChange = function(newPage) {
    if (!activeBook) return;
    var maxPages = getMaxPages();
    var validPage = Math.max(1, Math.min(Number(newPage) || 1, maxPages));
    setPdfCurrentPage(validPage);
    if (pdfDoc) {
      renderPdfPage(pdfDoc, validPage, pdfRotation);
    }
    var updated = Object.assign({}, activeBook, { currentPage: validPage });
    setActiveBook(updated);
    cloud.updateBookPage(activeBook.id, validPage);
  };

  // حفظ الكتاب للقراءة أوفلاين (بدون إنترنت) داخل ذاكرة الجهاز
  var handleSaveOffline = async function() {
    if (!activeBook) return;
    try {
      setIsSavingOffline(true);
      setOfflineSaveMsg("جاري تحميل وحفظ ملف الكتاب للقراءة بدون إنترنت...");
      var downloadUrl = utils.getAudioStreamUrl(activeBook.driveUrl);
      var resp;
      try {
        resp = await fetch(downloadUrl);
        if (!resp.ok) throw new Error("HTTP " + resp.status);
      } catch (errDirect) {
        var driveId = utils.extractDriveId(activeBook.driveUrl);
        if (driveId) {
          var proxyUrl = "https://corsproxy.io/?" + encodeURIComponent("https://docs.google.com/uc?export=download&id=" + driveId);
          resp = await fetch(proxyUrl);
        } else {
          throw errDirect;
        }
      }
      if (!resp || !resp.ok) throw new Error("تعذر جلب ملف الكتاب");
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

  // رفع صورة غلاف الكتاب إلى درايف أو تحويلها
  var uploadCoverImage = async function(file) {
    if (!file) return null;
    try {
      var base64Data = await new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() {
          var result = reader.result;
          resolve(result); // Data URL for preview and fallback
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // محاولة الرفع السحابي عبر Drive إن وُجد
      try {
        var pureBase64 = base64Data.indexOf(",") !== -1 ? base64Data.split(",")[1] : base64Data;
        var response = await fetch(cfg.driveUploadEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "image/jpeg",
            base64Data: pureBase64
          })
        });
        var resData = await response.json();
        if (resData.status === "success" && (resData.fileUrl || resData.fileId)) {
          return resData.fileUrl || ("https://drive.google.com/thumbnail?id=" + resData.fileId + "&sz=w800");
        }
      } catch (e) {
        console.warn("Drive upload fallback to local dataUrl:", e);
      }
      return base64Data;
    } catch (err) {
      alert("خطأ في قراءة صورة الغلاف: " + err.message);
      return null;
    }
  };

  // تغيير غلاف الكتاب الحالي وحفظه
  var handleSaveCurrentBookCover = async function(coverUrlToSave) {
    if (!activeBook) return;
    var finalCover = utils.getDriveImageUrl(coverUrlToSave);
    var updated = Object.assign({}, activeBook, { coverUrl: finalCover });
    cloud.saveBook(updated);
    setActiveBook(updated);
    setShowCoverEditModal(false);
  };

  // دوال مشغل المكتبة الصوتية المتتالية (Audiobook Master Player)
  var playAudiobookTrack = function(trackIndex) {
    if (!activeBook || !activeBook.chapters || trackIndex < 0 || trackIndex >= activeBook.chapters.length) return;
    setAudiobookTrackIdx(trackIndex);
    setIsAudiobookPlaying(true);
    setTimeout(function() {
      if (audiobookRef.current) {
        audiobookRef.current.playbackRate = audiobookPlaybackRate;
        audiobookRef.current.play().catch(function() {});
      }
    }, 100);
  };

  var toggleAudiobookPlay = function() {
    if (!audiobookRef.current) return;
    if (isAudiobookPlaying) {
      audiobookRef.current.pause();
      setIsAudiobookPlaying(false);
    } else {
      audiobookRef.current.playbackRate = audiobookPlaybackRate;
      audiobookRef.current.play().then(function() {
        setIsAudiobookPlaying(true);
      }).catch(function() {});
    }
  };

  var handleAudiobookNext = function() {
    if (!activeBook || !activeBook.chapters) return;
    var nextIdx = audiobookTrackIdx + 1;
    // البحث عن التراك التالي الذي يحتوي على صوت
    while (nextIdx < activeBook.chapters.length && !activeBook.chapters[nextIdx].audioUrl && !activeBook.chapters[nextIdx].audioScript) {
      nextIdx++;
    }
    if (nextIdx < activeBook.chapters.length) {
      playAudiobookTrack(nextIdx);
    } else {
      setIsAudiobookPlaying(false);
    }
  };

  var handleAudiobookPrev = function() {
    if (!activeBook || !activeBook.chapters) return;
    var prevIdx = audiobookTrackIdx - 1;
    while (prevIdx >= 0 && !activeBook.chapters[prevIdx].audioUrl && !activeBook.chapters[prevIdx].audioScript) {
      prevIdx--;
    }
    if (prevIdx >= 0) {
      playAudiobookTrack(prevIdx);
    }
  };

  var handleAudiobookSeek = function(deltaSeconds) {
    if (!audiobookRef.current) return;
    var newTime = Math.max(0, Math.min(audiobookRef.current.currentTime + deltaSeconds, audiobookDuration || 9999));
    audiobookRef.current.currentTime = newTime;
    setAudiobookCurrentTime(newTime);
  };

  var handleChangeSpeed = function(newRate) {
    setAudiobookPlaybackRate(newRate);
    if (audiobookRef.current) {
      audiobookRef.current.playbackRate = newRate;
    }
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
    var finalCoverUrl = utils.getDriveImageUrl((newCoverUrl || "").trim());

    if (selectedCoverFile) {
      try {
        setIsUploading(true);
        setUploadStatusText("جاري رفع صورة غلاف الكتاب...");
        var uploadedCover = await uploadCoverImage(selectedCoverFile);
        if (uploadedCover) {
          finalCoverUrl = utils.getDriveImageUrl(uploadedCover);
        }
      } catch (errCover) {
        console.warn("Cover upload warning:", errCover);
      }
    }

    var newB = {
      id: "book-" + Date.now(),
      title: newTitle.trim(),
      author: newAuthor.trim() || "غير محدد",
      coverUrl: finalCoverUrl,
      totalPages: parseInt(newTotalPages) || 300,
      currentPage: 1,
      driveUrl: finalDriveUrl,
      chapters: chapters
    };

    cloud.saveBook(newB);
    if (selectedFile) {
      try {
        var fileBuf = await selectedFile.arrayBuffer();
        await utils.saveOfflinePdf(newB.id, fileBuf);
      } catch (eBuf) {}
    }
    setShowAddModal(false);
    setIsUploading(false);
    setSelectedFile(null);
    setSelectedCoverFile(null);
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
            { className: "relative group w-12 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-800 shrink-0 shadow-sm" },
            activeBook.coverUrl ? React.createElement("img", {
              src: utils.getDriveImageUrl(activeBook.coverUrl),
              alt: activeBook.title,
              className: "w-full h-full object-cover",
              onError: function(e) {
                var rawId = utils.extractDriveId(activeBook.coverUrl);
                if (rawId && !e.target._triedLh3) {
                  e.target._triedLh3 = true;
                  e.target.src = "https://lh3.googleusercontent.com/d/" + rawId;
                }
              }
            }) : React.createElement("div", { className: "w-full h-full flex items-center justify-center text-lg bg-emerald-900/40 text-emerald-300" }, "📕"),
            currentUser.role === "admin" && React.createElement(
              "button",
              {
                type: "button",
                onClick: function() {
                  setEditingCoverUrl(activeBook.coverUrl || "");
                  setSelectedCoverFile(null);
                  setShowCoverEditModal(true);
                },
                title: "تغيير غلاف الكتاب",
                className: "absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity"
              },
              "✏️ غلاف"
            )
          ),
          React.createElement(
            "div",
            null,
            React.createElement("div", { className: "flex items-center gap-2" },
              React.createElement("h3", { className: "text-lg font-bold text-slate-900 dark:text-white" }, activeBook.title),
              currentUser.role === "admin" && React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() {
                    setEditingCoverUrl(activeBook.coverUrl || "");
                    setSelectedCoverFile(null);
                    setShowCoverEditModal(true);
                  },
                  className: "text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                },
                React.createElement("span", null, "🖼️"),
                React.createElement("span", null, "تغيير الغلاف")
              )
            ),
            React.createElement("p", { className: "text-xs text-slate-500" }, "المؤلف: " + activeBook.author + " • إجمالي الصفحات: " + activeBook.totalPages + " صفحة")
          )
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm" },
          React.createElement("button", {
            type: "button",
            onClick: function() { handlePageChange((activeBook.currentPage || 1) - 1); },
            disabled: (activeBook.currentPage || 1) <= 1,
            title: "الصفحة السابقة",
            className: "w-8 h-8 rounded-xl bg-white dark:bg-slate-700 font-bold flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95 transition-all text-slate-700 dark:text-slate-200"
          }, "◀"),
          React.createElement("div", { className: "px-2 text-center" },
            React.createElement("span", { className: "text-[10px] text-slate-400 block" }, "صفحة"),
            React.createElement("div", { className: "flex items-center gap-1" },
              React.createElement("input", {
                type: "number",
                min: 1,
                max: getMaxPages(),
                value: activeBook.currentPage || 1,
                onChange: function(e) {
                  var val = parseInt(e.target.value);
                  if (!isNaN(val)) handlePageChange(val);
                },
                title: "اكتب رقم الصفحة للانتقال المباشر",
                className: "w-14 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-center font-extrabold text-emerald-600 dark:text-emerald-400 text-sm py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              }),
              React.createElement("span", { className: "text-xs text-slate-400 font-semibold" }, " / " + getMaxPages())
            )
          ),
          React.createElement("button", {
            type: "button",
            onClick: function() { handlePageChange((activeBook.currentPage || 1) + 1); },
            disabled: (activeBook.currentPage || 1) >= getMaxPages(),
            title: "الصفحة التالية",
            className: "w-8 h-8 rounded-xl bg-white dark:bg-slate-700 font-bold flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95 transition-all text-slate-700 dark:text-slate-200"
          }, "▶")
        )
      ),

      // عارض الـ PDF التفاعلي المدمج (Native PDF Reader) الداعم للقراءة بدون إنترنت ووضع ملء الشاشة والتدوير
      (activeBook.driveUrl || isSavedOffline) && React.createElement(
        "div",
        {
          ref: pdfViewerContainerRef,
          className: "w-full overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2 transition-all " +
            (isFullScreen
              ? "fixed inset-0 z-[9999] rounded-0 p-3 h-screen w-screen flex flex-col justify-between bg-slate-950"
              : "rounded-2xl p-3")
        },
        
        // شريط أدوات قارئ الكتاب وحالة الأوفلاين وأزرار ملء الشاشة والتدوير
        React.createElement(
          "div",
          { className: "flex flex-wrap items-center justify-between gap-2 px-2 py-1 text-white border-b border-slate-800 pb-2.5 text-xs shrink-0" },
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

            // أزرار التنقل السريع بين الصفحات أثناء وضع ملء الشاشة
            isFullScreen && React.createElement(
              "div",
              { className: "flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl text-xs border border-slate-700" },
              React.createElement("button", {
                type: "button",
                onClick: function() { handlePageChange((activeBook.currentPage || 1) - 1); },
                disabled: (activeBook.currentPage || 1) <= 1,
                title: "الصفحة السابقة",
                className: "px-2 py-0.5 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              }, "◀"),
              React.createElement("div", { className: "flex items-center gap-1 font-bold text-emerald-400 font-mono" },
                React.createElement("input", {
                  type: "number",
                  min: 1,
                  max: getMaxPages(),
                  value: activeBook.currentPage || 1,
                  onChange: function(e) {
                    var val = parseInt(e.target.value);
                    if (!isNaN(val)) handlePageChange(val);
                  },
                  title: "اكتب رقم الصفحة للانتقال المباشر",
                  className: "w-12 bg-slate-900 border border-slate-700 rounded text-center text-emerald-400 text-xs py-0.5 focus:border-emerald-500 focus:outline-none"
                }),
                React.createElement("span", { className: "text-slate-400 text-xs" }, " / " + getMaxPages())
              ),
              React.createElement("button", {
                type: "button",
                onClick: function() { handlePageChange((activeBook.currentPage || 1) + 1); },
                disabled: (activeBook.currentPage || 1) >= getMaxPages(),
                title: "الصفحة التالية",
                className: "px-2 py-0.5 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              }, "▶")
            ),

            // زر تدوير الصفحة 90 درجة (Rotate)
            React.createElement(
              "button",
              {
                type: "button",
                onClick: handleRotatePage,
                title: "تدوير الصفحة 90 درجة",
                className: "px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1 border border-slate-700 shadow-sm active:scale-95 transition-all"
              },
              React.createElement("span", { className: "text-sm" }, "🔄"),
              React.createElement("span", { className: "hidden sm:inline font-mono" }, pdfRotation + "°")
            ),

            // زر وضع ملء الشاشة (Full Screen)
            React.createElement(
              "button",
              {
                type: "button",
                onClick: toggleFullScreen,
                title: isFullScreen ? "الخروج من ملء الشاشة" : "وضع ملء الشاشة للقراءة",
                className: "px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              },
              React.createElement("span", null, isFullScreen ? "🗗" : "⛶"),
              React.createElement("span", null, isFullScreen ? "خروج من الشاشة" : "شاشة كاملة")
            ),

            // زر حفظ الكتاب للقراءة أوفلاين
            !isSavedOffline ? React.createElement(
              "button",
              {
                type: "button",
                onClick: handleSaveOffline,
                disabled: isSavingOffline,
                className: "px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm active:scale-95 transition-all"
              },
              React.createElement("span", null, "📥"),
              React.createElement("span", { className: "hidden md:inline" }, isSavingOffline ? "جاري الحفظ..." : "تحميل بدون نت")
            ) : React.createElement(
              "button",
              {
                type: "button",
                onClick: handleRemoveOffline,
                className: "px-2.5 py-1 text-[11px] text-slate-400 hover:text-rose-400"
              },
              "إلغاء الحفظ"
            )
          )
        ),

        offlineSaveMsg && React.createElement(
          "div",
          { className: "p-2 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-center text-xs font-semibold shrink-0" },
          offlineSaveMsg
        ),

        // لوحة عرض الصفحة (PDF Canvas Viewer)
        React.createElement(
          "div",
          {
            className: "relative overflow-auto flex items-center justify-center bg-slate-950 rounded-xl p-2 transition-all " +
              (isFullScreen ? "flex-1 w-full h-[calc(100vh-80px)] min-h-0 max-h-none" : "min-h-[420px] max-h-[650px]")
          },
          isPdfLoading && React.createElement(
            "div",
            { className: "absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10 text-white text-xs font-bold gap-2" },
            React.createElement("span", { className: "animate-spin text-lg" }, "⏳"),
            React.createElement("span", null, "جاري فتح صفحات الكتاب وحفظ موضع القراءة...")
          ),
          pdfDoc ? React.createElement("canvas", {
            ref: pdfCanvasRef,
            className: "max-w-full shadow-2xl rounded-lg bg-white transition-transform duration-300"
          }) : React.createElement(
            "iframe",
            {
              src: utils.getDrivePreviewUrl(activeBook.driveUrl),
              className: "w-full h-full min-h-[480px] border-0 rounded-lg transition-transform duration-300",
              style: pdfRotation ? { transform: "rotate(" + pdfRotation + "deg)" } : {},
              title: activeBook.title
            }
          )
        )
      ),

      // قسم فصول الكتاب وتراكات الصوت والملخصات (Chapter Tracks & Audio)
      React.createElement(
        "div",
        { className: "space-y-4 pt-2" },

        // مشغل المكتبة الصوتية المتتالية (Master Audiobook Continuous Player)
        (function() {
          var chaptersWithAudio = (activeBook.chapters || []).map(function(ch, idx) {
            return { ch: ch, idx: idx, hasAudio: !!(ch.audioUrl || ch.audioScript) };
          }).filter(function(item) { return item.hasAudio; });

          var currentTrack = (activeBook.chapters || [])[audiobookTrackIdx];
          var currentAudioSrc = currentTrack ? utils.getAudioStreamUrl(currentTrack.audioUrl || currentTrack.audioScript) : "";

          var formatTime = function(sec) {
            if (!sec || isNaN(sec)) return "00:00";
            var m = Math.floor(sec / 60);
            var s = Math.floor(sec % 60);
            return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
          };

          return React.createElement(
            "div",
            { className: "p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white shadow-xl border border-slate-800 space-y-4" },

            // عنصر الصوت الخفي / المحرك
            React.createElement("audio", {
              ref: audiobookRef,
              src: currentAudioSrc,
              onTimeUpdate: function(e) {
                setAudiobookCurrentTime(e.target.currentTime);
              },
              onLoadedMetadata: function(e) {
                setAudiobookDuration(e.target.duration);
                if (audiobookRef.current) audiobookRef.current.playbackRate = audiobookPlaybackRate;
              },
              onEnded: handleAudiobookNext
            }),

            // رأس المشغل
            React.createElement(
              "div",
              { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3" },
              React.createElement(
                "div",
                { className: "flex items-center gap-3" },
                React.createElement(
                  "div",
                  { className: "w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 animate-pulse" },
                  "🎧"
                ),
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-2" },
                    React.createElement("h4", { className: "text-sm font-black text-white" }, "المشغل الصوتي المتتالي (Audiobook)"),
                    React.createElement("span", { className: "text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30" }, "تشغيل تلقائي متصل")
                  ),
                  React.createElement(
                    "p",
                    { className: "text-xs text-slate-400 mt-0.5" },
                    currentTrack ? ("يعمل الآن: " + (currentTrack.title || ("الفصل " + (audiobookTrackIdx + 1))) + " (تراك " + (audiobookTrackIdx + 1) + " من " + (activeBook.chapters || []).length + ")") : "اختر أي تراك للبدء، وسيتنقل المشغل للفصل التالي تلقائياً"
                  )
                )
              ),
              React.createElement(
                "div",
                { className: "flex items-center gap-2 self-end sm:self-auto" },
                // زر سرعة القراءة الصوتية
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() {
                      var rates = [1, 1.25, 1.5, 1.75, 2];
                      var nextRate = rates[(rates.indexOf(audiobookPlaybackRate) + 1) % rates.length];
                      handleChangeSpeed(nextRate);
                    },
                    title: "تغيير سرعة الصوت",
                    className: "px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono text-xs font-bold border border-slate-700 transition-all active:scale-95"
                  },
                  audiobookPlaybackRate + "x"
                ),
                React.createElement(
                  "span",
                  { className: "text-xs text-slate-400 font-mono" },
                  chaptersWithAudio.length + " تراك متاح"
                )
              )
            ),

            // شريط التقدم والوقت
            React.createElement(
              "div",
              { className: "space-y-1.5" },
              React.createElement(
                "div",
                { className: "flex items-center justify-between text-[11px] font-mono text-slate-400" },
                React.createElement("span", null, formatTime(audiobookCurrentTime)),
                React.createElement("span", null, formatTime(audiobookDuration))
              ),
              React.createElement("input", {
                type: "range",
                min: 0,
                max: audiobookDuration || 100,
                step: 0.5,
                value: audiobookCurrentTime,
                onChange: function(e) {
                  var t = parseFloat(e.target.value);
                  setAudiobookCurrentTime(t);
                  if (audiobookRef.current) audiobookRef.current.currentTime = t;
                },
                className: "w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              })
            ),

            // أزرار التحكم بالمشغل (Next, Prev, Seek -15, Seek +15, Play/Pause)
            React.createElement(
              "div",
              { className: "flex items-center justify-center gap-3 sm:gap-4 pt-1" },
              // التراك السابق
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: handleAudiobookPrev,
                  disabled: audiobookTrackIdx <= 0,
                  title: "التراك السابق",
                  className: "w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white flex items-center justify-center text-sm font-bold transition-all active:scale-95"
                },
                "⏮"
              ),
              // تقديم 15 ثانية للخلف
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { handleAudiobookSeek(-15); },
                  title: "تأخير 15 ثانية",
                  className: "px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-xs font-mono font-bold transition-all active:scale-95"
                },
                "↺ 15s"
              ),
              // زر التشغيل والإيقاف الكبير
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: toggleAudiobookPlay,
                  title: isAudiobookPlaying ? "إيقاف مؤقت" : "تشغيل الاستماع",
                  className: "w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center justify-center text-xl shadow-lg shadow-emerald-900/40 transition-all active:scale-95"
                },
                isAudiobookPlaying ? "⏸" : "▶"
              ),
              // تقديم 15 ثانية للأمام
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { handleAudiobookSeek(15); },
                  title: "تقديم 15 ثانية",
                  className: "px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-xs font-mono font-bold transition-all active:scale-95"
                },
                "15s ↻"
              ),
              // التراك التالي
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: handleAudiobookNext,
                  disabled: !activeBook.chapters || audiobookTrackIdx >= activeBook.chapters.length - 1,
                  title: "التراك التالي",
                  className: "w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white flex items-center justify-center text-sm font-bold transition-all active:scale-95"
                },
                "⏭"
              )
            )
          );
        })(),

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
                  { className: "p-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-md space-y-2.5 " + (audiobookTrackIdx === idx && isAudiobookPlaying ? "ring-2 ring-emerald-500" : "") },
                  React.createElement("div", { className: "flex items-center justify-between text-xs" },
                    React.createElement("span", { className: "font-bold flex items-center gap-1.5" },
                      React.createElement("span", null, "🎧"),
                      React.createElement("span", null, "صوت استوديو نقي (NotebookLM)")
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: function() { playAudiobookTrack(idx); },
                        className: "text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95 flex items-center gap-1 " +
                          (audiobookTrackIdx === idx && isAudiobookPlaying
                            ? "bg-emerald-500 text-slate-950 font-black animate-pulse"
                            : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30")
                      },
                      React.createElement("span", null, audiobookTrackIdx === idx && isAudiobookPlaying ? "▶ يعمل بالمشغل" : "▶ تشغيل في المتتالي")
                    )
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
    ) : books.length > 0 ? React.createElement(
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
                src: utils.getDriveImageUrl(b.coverUrl),
                alt: b.title,
                className: "absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500",
                onError: function(e) {
                  var rawId = utils.extractDriveId(b.coverUrl);
                  if (rawId && !e.target._triedLh3) {
                    e.target._triedLh3 = true;
                    e.target.src = "https://lh3.googleusercontent.com/d/" + rawId;
                  }
                }
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
            ),
            React.createElement(
              "div",
              { className: "p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2" },
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "🖼️ صورة غلاف الكتاب (اختياري)"),
              React.createElement(
                "div",
                { className: "flex items-center gap-3" },
                // معاينة مصغرة للغلاف
                (selectedCoverFile || newCoverUrl) ? React.createElement(
                  "div",
                  { className: "w-12 h-16 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 bg-slate-900 shrink-0 shadow-xs" },
                  React.createElement("img", {
                    src: selectedCoverFile ? URL.createObjectURL(selectedCoverFile) : utils.getDriveImageUrl(newCoverUrl),
                    alt: "Cover Preview",
                    className: "w-full h-full object-cover",
                    onError: function(e) {
                      var rawId = utils.extractDriveId(newCoverUrl);
                      if (rawId && !e.target._triedLh3) {
                        e.target._triedLh3 = true;
                        e.target.src = "https://lh3.googleusercontent.com/d/" + rawId;
                      }
                    }
                  })
                ) : React.createElement(
                  "div",
                  { className: "w-12 h-16 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 shrink-0" },
                  "غلاف"
                ),
                React.createElement(
                  "div",
                  { className: "flex-1 space-y-1.5" },
                  React.createElement(
                    "label",
                    { className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer transition-all active:scale-95" },
                    React.createElement("span", null, "📁"),
                    React.createElement("span", null, selectedCoverFile ? ("تم اختيار: " + selectedCoverFile.name) : "رفع صورة الغلاف من جهازك"),
                    React.createElement("input", {
                      type: "file",
                      accept: "image/*",
                      onChange: function(e) {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedCoverFile(e.target.files[0]);
                        }
                      },
                      className: "hidden"
                    })
                  ),
                  selectedCoverFile && React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: function() { setSelectedCoverFile(null); },
                      className: "text-[11px] text-rose-500 hover:underline mr-2"
                    },
                    "إلغاء الصورة"
                  ),
                  React.createElement("input", {
                    type: "url",
                    value: newCoverUrl,
                    onChange: function(e) { setNewCoverUrl(e.target.value); },
                    onBlur: function(e) {
                      if (e.target.value) {
                        var c = utils.getDriveImageUrl(e.target.value);
                        if (c !== e.target.value) setNewCoverUrl(c);
                      }
                    },
                    placeholder: "أو الصق رابط صورة الغلاف هنا (يدعم جوجل درايف والروابط المباشرة)",
                    className: "w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white"
                  })
                )
              )
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
    ),

    // نافذة تعديل غلاف الكتاب الحالي
    showCoverEditModal && React.createElement(
      "div",
      { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "🖼️ تغيير صورة غلاف الكتاب"),
          React.createElement("button", { onClick: function() { setShowCoverEditModal(false); }, className: "text-slate-400" }, "✕")
        ),
        React.createElement(
          "div",
          { className: "space-y-4" },
          // معاينة الغلاف
          React.createElement(
            "div",
            { className: "w-32 h-44 mx-auto rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 bg-slate-900 shadow-md flex items-center justify-center" },
            (selectedCoverFile || editingCoverUrl) ? React.createElement("img", {
              src: selectedCoverFile ? URL.createObjectURL(selectedCoverFile) : utils.getDriveImageUrl(editingCoverUrl),
              alt: "Cover",
              className: "w-full h-full object-cover",
              onError: function(e) {
                var rawId = utils.extractDriveId(editingCoverUrl);
                if (rawId && !e.target._triedLh3) {
                  e.target._triedLh3 = true;
                  e.target.src = "https://lh3.googleusercontent.com/d/" + rawId;
                }
              }
            }) : React.createElement("div", { className: "text-4xl text-slate-500" }, "📖")
          ),
          // زر رفع ملف صورة من الجهاز
          React.createElement(
            "div",
            { className: "text-center" },
            React.createElement(
              "label",
              { className: "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer shadow-xs transition-all active:scale-95" },
              React.createElement("span", null, "📁"),
              React.createElement("span", null, selectedCoverFile ? ("تم اختيار: " + selectedCoverFile.name) : "اختر صورة جديدة من جهازك"),
              React.createElement("input", {
                type: "file",
                accept: "image/*",
                onChange: function(e) {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedCoverFile(e.target.files[0]);
                  }
                },
                className: "hidden"
              })
            ),
            selectedCoverFile && React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setSelectedCoverFile(null); },
                className: "block mx-auto mt-1.5 text-[11px] text-rose-500 hover:underline"
              },
              "إلغاء اختيار الملف"
            )
          ),
          // رابط صورة بديل
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "أو ضع رابط صورة الغلاف مباشرة (يدعم Google Drive والروابط المباشرة)"),
            React.createElement("input", {
              type: "url",
              value: editingCoverUrl,
              onChange: function(e) { setEditingCoverUrl(e.target.value); },
              onBlur: function(e) {
                if (e.target.value) {
                  var c = utils.getDriveImageUrl(e.target.value);
                  if (c !== e.target.value) setEditingCoverUrl(c);
                }
              },
              placeholder: "الصق رابط صورة من جوجل درايف أو أي موقع (https://...)",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            })
          ),
          // أزرار الحفظ والإلغاء
          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-2" },
            React.createElement("button", {
              type: "button",
              onClick: function() { setShowCoverEditModal(false); },
              disabled: isUploadingCover,
              className: "px-4 py-2 text-xs"
            }, "إلغاء"),
            React.createElement("button", {
              type: "button",
              disabled: isUploadingCover,
              onClick: async function() {
                setIsUploadingCover(true);
                var finalUrl = utils.getDriveImageUrl(editingCoverUrl.trim());
                if (selectedCoverFile) {
                  var up = await uploadCoverImage(selectedCoverFile);
                  if (up) finalUrl = utils.getDriveImageUrl(up);
                }
                await handleSaveCurrentBookCover(finalUrl);
                setIsUploadingCover(false);
              },
              className: "px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white shadow-md active:scale-95"
            }, isUploadingCover ? "جاري الحفظ..." : "حفظ الغلاف الجديد ✓")
          )
        )
      )
    )
  );
};
