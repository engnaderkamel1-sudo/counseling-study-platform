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
  var [pdfCurrentPage, setPdfCurrentPage] = React.useState(function() {
    var savedId = utils.getLocal("counsel_active_book_id");
    if (savedId) {
      var savedPage = utils.getLocal("counsel_book_page_" + savedId);
      if (savedPage) return Number(savedPage);
    }
    return 1;
  });
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

  // وضع العرض المريح لصفحات الـ PDF (عادي normal, بيج مريح sepia, ليلي عاكس dark)
  var [pdfTheme, setPdfTheme] = React.useState(function() {
    return utils.getLocal("counsel_pdf_theme", "normal");
  });
  // التبويب النشط للشاشات الصغيرة في صفحة المرجع ("pdf" للقراءة أو "study" للفصول والاستماع)
  var [mobileSectionTab, setMobileSectionTab] = React.useState("pdf");

  // التبويب النشط لمحتوى الكتاب الدراسي (تراك 1 الشامل أو ملخص الكتاب)
  var [bookStudyTab, setBookStudyTab] = React.useState("chapters");

  // إدارة الفصول والتراكات الصوتية المستقلة (فصل فصل: صوت MP3 + نص مفرغ)
  var [showChapterModal, setShowChapterModal] = React.useState(false);
  var [editingChapter, setEditingChapter] = React.useState(null);
  var [chapTitle, setChapTitle] = React.useState("");
  var [chapStartPage, setChapStartPage] = React.useState(1);
  var [chapAudioUrl, setChapAudioUrl] = React.useState("");
  var [chapAudioFile, setChapAudioFile] = React.useState(null);
  var [chapText, setChapText] = React.useState("");
  var [isSavingChapter, setIsSavingChapter] = React.useState(false);
  var [chapterSaveStatus, setChapterSaveStatus] = React.useState("");
  var [viewingChapterText, setViewingChapterText] = React.useState(null);
  var [configuringChapterForExtract, setConfiguringChapterForExtract] = React.useState(null);
  var [chapterTextFontSize, setChapterTextFontSize] = React.useState(15); // 13, 15, 17, 20
  var [playingChapterId, setPlayingChapterId] = React.useState(null);
  var chapterAudioRef = React.useRef(null);

  // مشغل تراك 1 الشامل (Master NotebookLM Podcast Track) واستئناف التشغيل التلقائي
  var [isTrack1Playing, setIsTrack1Playing] = React.useState(false);
  var [track1PlaybackRate, setTrack1PlaybackRate] = React.useState(1.0);
  var [track1CurrentTime, setTrack1CurrentTime] = React.useState(0);
  var [track1Duration, setTrack1Duration] = React.useState(0);
  var [resumedNotice, setResumedNotice] = React.useState("");
  var track1AudioRef = React.useRef(null);

  // نوافذ تعديل التراك، الملخص، والعلامات الزمنية (Bookmarks)
  var [showTrackModal, setShowTrackModal] = React.useState(false);
  var [editTrackUrl, setEditTrackUrl] = React.useState("");
  var [showSummaryModal, setShowSummaryModal] = React.useState(false);
  var [editSummaryContent, setEditSummaryContent] = React.useState("");
  var [showBookmarkModal, setShowBookmarkModal] = React.useState(false);
  var [editingBookmarkIdx, setEditingBookmarkIdx] = React.useState(null);
  var [bookmarkTitle, setBookmarkTitle] = React.useState("");
  var [bookmarkTimeStr, setBookmarkTimeStr] = React.useState("00:00");

  // حقل تعديل غلاف الكتاب للكتاب الحالي
  var [showCoverEditModal, setShowCoverEditModal] = React.useState(false);
  var [editingCoverUrl, setEditingCoverUrl] = React.useState("");
  var [isUploadingCover, setIsUploadingCover] = React.useState(false);

  var stopAudioPlayback = function() {
    try {
      if (track1AudioRef.current) {
        track1AudioRef.current.pause();
      }
      setIsTrack1Playing(false);
      if (chapterAudioRef.current) chapterAudioRef.current.pause();
      setPlayingChapterId(null);
      var allAudios = document.querySelectorAll("audio");
      allAudios.forEach(function(a) { a.pause(); });
      
      
      
      
    } catch (e) {}
  };

  // حقول الإضافة للكتاب الجديد
  var [selectedFile, setSelectedFile] = React.useState(null);
  var [selectedCoverFile, setSelectedCoverFile] = React.useState(null);
  var [selectedAudioFile, setSelectedAudioFile] = React.useState(null);
  var [isDraggingFile, setIsDraggingFile] = React.useState(false);
  var [isUploading, setIsUploading] = React.useState(false);
  var [uploadStatusText, setUploadStatusText] = React.useState("");
      
  var [newTitle, setNewTitle] = React.useState("");
  var [newAuthor, setNewAuthor] = React.useState("");
  var [newTranslator, setNewTranslator] = React.useState("");
  var [newCoverUrl, setNewCoverUrl] = React.useState("");
  var [newTotalPages, setNewTotalPages] = React.useState(350);
  var [newDriveUrl, setNewDriveUrl] = React.useState("");
  var [newChaptersCount, setNewChaptersCount] = React.useState(8);
  var [newTrack1Url, setNewTrack1Url] = React.useState("");
  var [detectedChaptersList, setDetectedChaptersList] = React.useState([]);
  var [isAiAnalyzingBook, setIsAiAnalyzingBook] = React.useState(false);
  var [editingBookId, setEditingBookId] = React.useState(null);

  React.useEffect(function() {
    var unsubscribe = cloud.subscribeBooks(function(cloudList) {
      if (cloudList) {
        setBooks(cloudList);
        utils.setLocal(cfg.storageKeys.books, cloudList);
        if (cloudList.length > 0) {
          setActiveBook(function(prev) {
            if (!prev) return null;
            var found = cloudList.find(function(b) { return b.id === prev.id; });
            if (!found) return null;
            var savedPage = utils.getLocal("counsel_book_page_" + found.id);
            var page = savedPage ? Number(savedPage) : (found.currentPage || prev.currentPage || 1);
            return Object.assign({}, found, { currentPage: page });
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

  // فحص ما إذا كان الكتاب الحالي مخزناً بالفعل للقراءة بدون إنترنت واسترجاع الصفحة المحفوظة
  React.useEffect(function() {
    if (!activeBook) {
      setIsSavedOffline(false);
      setPdfDoc(null);
      setPdfTotalPages(0);
      return;
    }
    var savedPage = utils.getLocal("counsel_book_page_" + activeBook.id);
    var pageToOpen = savedPage ? Number(savedPage) : (activeBook.currentPage || 1);
    setPdfCurrentPage(pageToOpen);
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
      var targetPage = (activeBook && activeBook.id)
        ? (Number(utils.getLocal("counsel_book_page_" + activeBook.id)) || activeBook.currentPage || 1)
        : 1;
      renderPdfPage(loadedDoc, targetPage);
    }).catch(function(err) {
      console.warn("PDF load error:", err);
      setIsPdfLoading(false);
    });
  };

  var loadPdfFromUrl = async function(url) {
    if (!window.pdfjsLib) return;
    setIsPdfLoading(true);

    var driveId = utils.extractDriveId(url);

    // 1. الحل الأول (المعتمد في تطبيق إعداد الخدام): جلب ملف الدرايف عبر Google Apps Script بتنسيق Base64
    // هذا السكربت يفك قيود CORS و CORP للمتصفح بالكامل وبشكل رسمي
    if (driveId) {
      try {
        var scriptEndpoint = "https://script.google.com/macros/s/AKfycbxhdl_hk5vB7NLLL7zdPmVXlwvAOiZYVLsrk5T73UdJpJJM9JpU74p0DexpSch7gI4I/exec?action=getFile&fileId=" + driveId;
        var scriptRes = await fetch(scriptEndpoint);
        if (scriptRes.ok) {
          var scriptData = await scriptRes.json();
          if (scriptData.status === "success" && scriptData.base64) {
            // تحويل Base64 إلى ArrayBuffer لقارئ PDF.js
            var binaryStr = atob(scriptData.base64);
            var len = binaryStr.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            loadPdfFromData(bytes.buffer);
            if (activeBook && activeBook.id) {
              utils.saveOfflinePdf(activeBook.id, bytes.buffer).catch(function() {});
            }
            return;
          }
        }
      } catch (errScript) {
        console.warn("Apps Script getFile failed, trying Drive CDN:", errScript);
      }

      // 2. الحل الثاني (من تطبيق إعداد الخدام أيضاً): السحب المباشر من Google Drive CDN
      try {
        var cdnUrl = "https://drive.usercontent.google.com/download?id=" + driveId + "&export=download";
        var cdnRes = await fetch(cdnUrl);
        if (cdnRes.ok) {
          var cdnBuffer = await cdnRes.arrayBuffer();
          loadPdfFromData(cdnBuffer);
          if (activeBook && activeBook.id) {
            utils.saveOfflinePdf(activeBook.id, cdnBuffer).catch(function() {});
          }
          return;
        }
      } catch (errCdn) {
        console.warn("Drive CDN fetch failed, trying fallbacks:", errCdn);
      }
    }

    // 3. الحلول الاحتياطية (قائمة البروكسيات)
    var downloadUrl = driveId
      ? ("https://docs.google.com/uc?export=download&id=" + driveId)
      : utils.getAudioStreamUrl(url);

    var proxyUrls = [
      "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(downloadUrl),
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(downloadUrl),
      "https://corsproxy.io/?" + encodeURIComponent(downloadUrl)
    ];

    var tryFetchChain = function(index) {
      if (index >= proxyUrls.length) {
        var directUrl = utils.getAudioStreamUrl(url);
        window.pdfjsLib.getDocument({ url: directUrl }).promise.then(function(loadedDoc) {
          setPdfDoc(loadedDoc);
          setPdfTotalPages(loadedDoc.numPages);
          setIsPdfLoading(false);
          var targetPage = (activeBook && activeBook.id)
            ? (Number(utils.getLocal("counsel_book_page_" + activeBook.id)) || activeBook.currentPage || 1)
            : 1;
          renderPdfPage(loadedDoc, targetPage);
        }).catch(function(e) {
          console.warn("Direct PDF.js load error:", e);
          setIsPdfLoading(false);
          setTtsStatusMsg("تنبيه: تعذر سحب النص تلقائياً من درايف، يمكنك اختيار ملف الـ PDF من جهازك لحفظه وقراءته صوتياً فوراً ✓");
        });
        return;
      }

      fetch(proxyUrls[index])
        .then(function(res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.arrayBuffer();
        })
        .then(function(buffer) {
          loadPdfFromData(buffer);
          if (activeBook && activeBook.id) {
            utils.saveOfflinePdf(activeBook.id, buffer).catch(function() {});
          }
        })
        .catch(function(err) {
          console.warn("Proxy " + index + " failed:", err);
          tryFetchChain(index + 1);
        });
    };

    tryFetchChain(0);
  };

  var getMaxPages = function() {
    if (pdfDoc && pdfTotalPages > 0) return pdfTotalPages;
    if (activeBook && activeBook.totalPages && Number(activeBook.totalPages) > 0) return Number(activeBook.totalPages);
    if (pdfTotalPages > 0) return pdfTotalPages;
    return 500;
  };

  var renderPdfPage = function(doc, pageNum, rotationAngle) {
    return new Promise(function(resolve) {
      if (!doc || !pdfCanvasRef.current) return resolve(false);
      var num = Math.max(1, Math.min(pageNum, doc.numPages));
      var rot = typeof rotationAngle === "number" ? rotationAngle : pdfRotation;

      if (pdfRenderTaskRef.current) {
        try {
          pdfRenderTaskRef.current.cancel();
        } catch (e) {}
      }

      doc.getPage(num).then(function(page) {
        var canvas = pdfCanvasRef.current;
        if (!canvas) return resolve(false);
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
          resolve(true);
        }).catch(function(err) {
          if (err && err.name === "RenderingCancelledException") return resolve(false);
          console.warn("Render error:", err);
          resolve(false);
        });
      }).catch(function(err) {
        console.warn("getPage error:", err);
        resolve(false);
      });
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

  // تغيير الصفحة في قارئ الـ PDF وحفظها سحابياً ومحلياً تلقائياً مع حماية تداخل الصوت
  var handlePageChange = function(newPage, fromTtsAutoAdvance) {
    if (!activeBook) return Promise.resolve(false);
    var maxPages = getMaxPages();
    var validPage = Math.max(1, Math.min(Number(newPage) || 1, maxPages));
    setPdfCurrentPage(validPage);
    if (activeBook && activeBook.id) {
      utils.setLocal("counsel_book_page_" + activeBook.id, validPage);
      utils.setLocal("counsel_active_book_id", activeBook.id);
    }
    var p = Promise.resolve(true);
    if (pdfDoc) {
      p = renderPdfPage(pdfDoc, validPage, pdfRotation);
    }
    var updated = Object.assign({}, activeBook, { currentPage: validPage });
    setActiveBook(updated);
    cloud.updateBookPage(activeBook.id, validPage);

    // إذا قام المستخدم بتغيير الصفحة يدوياً وكان القارئ الصوتي شغالاً:
    // نوقف فوراً أي صوت للصفحة السابقة ونبدأ قراءة الصفحة الجديدة بدون أي تداخل أصوات!
    if (!fromTtsAutoAdvance && isTtsActiveRef.current) {
      
      if (pdfDoc) {
        setTtsStatusMsg("تم الانتقال لصفحة " + validPage + "، جاري قراءتها... 🎧");
        setTimeout(function() {
          if (isTtsActiveRef.current && pdfDoc) {
            readPageTextWithTts(pdfDoc, validPage);
          }
        }, 80);
      }
    }

    return p;
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

  // دوال مشغل تراك 1 الشامل (Track 1 NotebookLM Master Player)
  var formatAudioTime = function(sec) {
    if (!sec || isNaN(sec)) return "00:00";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  };

  var parseTimeToSeconds = function(timeStr) {
    if (!timeStr) return 0;
    var parts = timeStr.toString().trim().split(":");
    if (parts.length === 2) {
      var m = parseInt(parts[0]) || 0;
      var s = parseInt(parts[1]) || 0;
      return (m * 60) + s;
    }
    if (parts.length === 3) {
      var h = parseInt(parts[0]) || 0;
      var m2 = parseInt(parts[1]) || 0;
      var s2 = parseInt(parts[2]) || 0;
      return (h * 3600) + (m2 * 60) + s2;
    }
    return parseFloat(timeStr) || 0;
  };

  var toggleTrack1Play = function() {
    if (!track1AudioRef.current) return;
    if (isTrack1Playing) {
      track1AudioRef.current.pause();
      setIsTrack1Playing(false);
    } else {
      track1AudioRef.current.playbackRate = track1PlaybackRate;
      track1AudioRef.current.play().then(function() {
        setIsTrack1Playing(true);
      }).catch(function() {});
    }
  };

  var handleTrack1Seek = function(deltaSeconds) {
    if (!track1AudioRef.current) return;
    var newTime = Math.max(0, Math.min(track1AudioRef.current.currentTime + deltaSeconds, track1Duration || 9999));
    track1AudioRef.current.currentTime = newTime;
    setTrack1CurrentTime(newTime);
    if (activeBook && activeBook.id) {
      try { localStorage.setItem("counsel_audio_pos_" + activeBook.id, newTime.toString()); } catch (e) {}
    }
  };

  var handleChangeSpeed = function() {
    var rates = [1, 1.25, 1.5, 2];
    var nextRate = rates[(rates.indexOf(track1PlaybackRate) + 1) % rates.length];
    setTrack1PlaybackRate(nextRate);
    if (track1AudioRef.current) {
      track1AudioRef.current.playbackRate = nextRate;
    }
  };

  var seekToBookmark = function(timeSeconds) {
    if (!track1AudioRef.current) return;
    track1AudioRef.current.currentTime = timeSeconds;
    setTrack1CurrentTime(timeSeconds);
    if (!isTrack1Playing) {
      track1AudioRef.current.play().then(function() {
        setIsTrack1Playing(true);
      }).catch(function() {});
    }
    if (activeBook && activeBook.id) {
      try { localStorage.setItem("counsel_audio_pos_" + activeBook.id, timeSeconds.toString()); } catch (e) {}
    }
  };

  var openAddBookmarkModal = function() {
    setEditingBookmarkIdx(null);
    setBookmarkTitle("");
    setBookmarkTimeStr(formatAudioTime(track1CurrentTime));
    setShowBookmarkModal(true);
  };

  var openEditBookmarkModal = function(idx) {
    var bm = (activeBook.bookmarks || [])[idx];
    if (!bm) return;
    setEditingBookmarkIdx(idx);
    setBookmarkTitle(bm.title || "");
    setBookmarkTimeStr(formatAudioTime(bm.time || 0));
    setShowBookmarkModal(true);
  };

  var handleSaveBookmark = function() {
    if (!activeBook) return;
    var title = bookmarkTitle.trim() || ("فصل " + ((activeBook.bookmarks || []).length + 1));
    var sec = parseTimeToSeconds(bookmarkTimeStr);
    var currentBookmarks = (activeBook.bookmarks || []).slice();

    if (editingBookmarkIdx !== null && editingBookmarkIdx >= 0) {
      currentBookmarks[editingBookmarkIdx] = { title: title, time: sec };
    } else {
      currentBookmarks.push({ title: title, time: sec });
    }
    currentBookmarks.sort(function(a, b) { return (a.time || 0) - (b.time || 0); });

    var updatedBook = Object.assign({}, activeBook, { bookmarks: currentBookmarks });
    cloud.saveBook(updatedBook);
    setActiveBook(updatedBook);
    setShowBookmarkModal(false);
  };

  var handleDeleteBookmark = function(idx) {
    if (!activeBook || !window.confirm("هل أنت متأكد من حذف هذه العلامة المرجعية؟")) return;
    var currentBookmarks = (activeBook.bookmarks || []).slice();
    currentBookmarks.splice(idx, 1);
    var updatedBook = Object.assign({}, activeBook, { bookmarks: currentBookmarks });
    cloud.saveBook(updatedBook);
    setActiveBook(updatedBook);
  };

  var handleSaveTrackAudio = function() {
    if (!activeBook) return;
    var finalUrl = (editTrackUrl || "").trim();
    var updatedBook = Object.assign({}, activeBook, { audioUrl: finalUrl });
    cloud.saveBook(updatedBook);
    setActiveBook(updatedBook);
    setShowTrackModal(false);
  };

  var handleSaveSummary = function() {
    if (!activeBook) return;
    var updatedBook = Object.assign({}, activeBook, { summaryText: editSummaryContent });
    cloud.saveBook(updatedBook);
    setActiveBook(updatedBook);
    setShowSummaryModal(false);
  };

  var handleOpenAddChapter = function() {
    setEditingChapter(null);
    setChapTitle("");
    setChapStartPage(activeBook ? (activeBook.currentPage || 1) : 1);
    setChapAudioUrl("");
    setChapAudioFile(null);
    setChapText("");
    setIsSavingChapter(false);
    setChapterSaveStatus("");
    setShowChapterModal(true);
  };

  var handleOpenEditChapter = function(chap) {
    setEditingChapter(chap);
    setChapTitle(chap.title || "");
    setChapStartPage(chap.startPage || 1);
    setChapAudioUrl(chap.audioUrl || "");
    setChapAudioFile(null);
    setChapText(chap.text || "");
    setIsSavingChapter(false);
    setChapterSaveStatus("");
    setShowChapterModal(true);
  };

  var handleDeleteChapter = async function(chapId) {
    if (!activeBook || !window.confirm("هل أنت متأكد من رغبتك في حذف هذا الفصل الصوتي؟")) return;
    var currentChaps = (activeBook.audioChapters || []).filter(function(c) { return c.id !== chapId; });
    var updatedBook = Object.assign({}, activeBook, { audioChapters: currentChaps });
    await cloud.saveBook(updatedBook);
    setActiveBook(updatedBook);
    if (playingChapterId === chapId) {
      if (chapterAudioRef.current) chapterAudioRef.current.pause();
      setPlayingChapterId(null);
    }
  };

  var handleAutoScanActiveBookChapters = async function() {
    if (!activeBook || !pdfDoc) return alert("يرجى فتح ملف الـ PDF للكتاب أولاً");
    var key = await window.GeminiAIService.getApiKey();
    if (!key) return alert("يرجى إدخال مفتاح Gemini في الإعدادات أولاً");
    if (!window.confirm("هل تريد فحص صفحات بداية الكتاب لقراءة الفهرس والمقدمة واستخراج قائمة الفصول بالكامل تلقائياً؟")) return;

    setIsAiAnalyzingBook(true);
    try {
      // فحص أول 8 إلى 10 صفحات للبحث عن صفحة الفهرس والمحتويات والمقدمة بدقة
      var maxInspect = Math.min(pdfDoc.numPages || 1, 10);
      var scanParts = [];
      for (var p = 1; p <= maxInspect; p++) {
        var pageObj = await pdfDoc.getPage(p);
        var vp = pageObj.getViewport({ scale: 1.0 });
        var c = document.createElement("canvas");
        c.width = vp.width;
        c.height = vp.height;
        var cx = c.getContext("2d");
        await pageObj.render({ canvasContext: cx, viewport: vp }).promise;
        var b64 = c.toDataURL("image/jpeg", 0.7).split("base64,")[1];
        scanParts.push({ inline_data: { mime_type: "image/jpeg", data: b64 } });
      }

      var promptVision = "أنت خبير فحص وفهرسة كتب محترف. أمامك صور صفحات البداية من الكتاب (تتضمن الغلاف وصفحة المحتويات / الفهرس كاملة).\n" +
        "المطلوب بشكل حاسم: اقرأ صفحة (المحتويات / الفهرس / Table of Contents) واقرأ كل بند فيها بدقة شديدة.\n" +
        "استخرج قائمة الفصول كاملة بصيغة JSON:\n" +
        "1. ابدأ بـ 'المقدمة' أو 'التمهيد' مع رقم صفحتها الحقيقية في الـ PDF.\n" +
        "2. استخرج جميع الفصول والأبواب المذكورة في الفهرس بدون استثناء (الفصل 1، الفصل 2، الفصل 3... إلخ) وعناوينها وأرقام صفحاتها.\n" +
        "تنسيق الـ JSON المطلوب بدقة:\n" +
        "{\n" +
        "  \"chapters\": [\n" +
        "    {\"title\": \"المقدمة\", \"pdfStartPage\": 5},\n" +
        "    {\"title\": \"الفصل الأول: ...\", \"pdfStartPage\": 15},\n" +
        "    {\"title\": \"الفصل الثاني: ...\", \"pdfStartPage\": 35}\n" +
        "  ]\n" +
        "}";

      var candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

      var scanSuccess = false;
      var lastScanError = "";

      for (var i = 0; i < candidateModels.length; i++) {
        try {
          var controller = new AbortController();
          var timeoutId = setTimeout(function() { controller.abort(); }, 30000);
          var res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + candidateModels[i] + ":generateContent?key=" + key, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: promptVision }].concat(scanParts) }],
              generationConfig: { temperature: 0.1 }
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            var d = await res.json();
            if (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts[0]) {
              var txt = d.candidates[0].content.parts[0].text;
              var clean = txt.replace(/```json/gi, "").replace(/```/g, "").trim();
              var fIdx = clean.indexOf("{");
              var lIdx = clean.lastIndexOf("}");
              if (fIdx !== -1 && lIdx !== -1) clean = clean.substring(fIdx, lIdx + 1);
              var parsed = JSON.parse(clean);

              if (Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
                // ترتيب الفصول حسب رقم صفحة البداية وحساب صفحة النهاية بدقة
                var rawList = parsed.chapters.filter(function(c) { return c && c.title; });
                var totalDocPages = pdfDoc.numPages || 100;
                var newChaps = rawList.map(function(c, cIdx) {
                  var sPage = Math.max(1, Number(c.pdfStartPage) || 1);
                  var nextItem = rawList[cIdx + 1];
                  var nextStart = nextItem ? Math.max(1, Number(nextItem.pdfStartPage) || 1) : null;
                  var calcEnd = nextStart && nextStart > sPage ? nextStart - 1 : (Number(c.pdfEndPage) || Math.min(sPage + 20, totalDocPages));
                  return {
                    id: "chap_" + Date.now() + "_" + cIdx,
                    title: c.title.trim(),
                    startPage: sPage,
                    endPage: calcEnd,
                    audioUrl: "",
                    text: ""
                  };
                });
                var updatedBook = Object.assign({}, activeBook, { audioChapters: newChaps });
                cloud.saveBook(updatedBook);
                setActiveBook(updatedBook);
                scanSuccess = true;
                setIsAiAnalyzingBook(false);
                alert("✨ تم فحص الفهرس بنجاح!\n\nتم استخراج " + newChaps.length + " فصول (تشمل المقدمة وكافة فصول الكتاب).");
                break;
              }
            }
          } else {
            var errD = await res.json().catch(function() { return {}; });
            lastScanError = (errD.error && errD.error.message) || ("Error status " + res.status);
          }
        } catch (eScan) {
          lastScanError = eScan.name === "AbortError" ? "استغرقت الاستجابة وقتاً طويلاً" : (eScan.message || String(eScan));
        }
      }

      setIsAiAnalyzingBook(false);
      if (!scanSuccess) {
        alert("تنبيه: " + (lastScanError || "تعذر قراءة الفهرس بالذكاء الاصطناعي. يمكنك استخدام زر (+ إضافة فصل يدوي) لتحديد الفصول يدوياً."));
      }
    } catch (errAll) {
      setIsAiAnalyzingBook(false);
      alert("حدث خطأ أثناء فحص الفهرس: " + (errAll.message || errAll));
    } finally {
      setIsAiAnalyzingBook(false);
    }
  };

  // وظيفة مسح قائمة الفصول الحالية للبدء من جديد
  var handleClearAllChapters = async function() {
    if (!activeBook) return;
    if (!window.confirm("هل أنت متأكد من مسح جميع فصول هذا الكتاب وإعادة الفحص من البداية؟")) return;
    var updatedBook = Object.assign({}, activeBook, { audioChapters: [] });
    await cloud.saveBook(updatedBook);
    setActiveBook(updatedBook);
    if (chapterAudioRef.current) chapterAudioRef.current.pause();
    setPlayingChapterId(null);
  };

  // وظيفة استخراج النص الكامل للفصل بالذكاء الاصطناعي (OCR) من صفحات الـ PDF
  var [extractingChapterId, setExtractingChapterId] = React.useState(null);
  var [extractStatusText, setExtractStatusText] = React.useState("");

  // وظيفة فتح نافذة ضبط استخراج النص للفصل (تحديد النطاق واستثناء الصفحات)
  var handleExtractChapterText = function(chap) {
    if (!activeBook || !pdfDoc) return alert("يرجى فتح ملف الـ PDF أولاً");
    // حساب نطاق افتراضي دقيق
    var sPage = Number(chap.startPage) || 1;
    var ePage = Number(chap.endPage) || sPage;
    if (ePage <= sPage) {
      var allChaps = (activeBook.audioChapters || []);
      var curIdx = allChaps.findIndex(function(c) { return c.id === chap.id; });
      if (curIdx >= 0 && curIdx < allChaps.length - 1 && allChaps[curIdx + 1].startPage) {
        ePage = Math.max(sPage, Number(allChaps[curIdx + 1].startPage) - 1);
      } else {
        ePage = Math.min(sPage + 15, pdfDoc.numPages || sPage);
      }
    }
    var chapWithCalculatedRange = Object.assign({}, chap, { startPage: sPage, endPage: ePage });
    setConfiguringChapterForExtract(chapWithCalculatedRange);
  };

  // دالة مساعدة قوية لاستخراج نص صفحة مفردة مع معالجة الـ Rate Limit وإعادة المحاولة
  var extractTextFromPageBase64 = async function(base64Image, key, pageNum, isBatchCancelledRef) {
    var candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
    var prompt = "أنت مفرغ محتوى صوتي احترافي (Audiobook Transcriber).\n" +
      "المهمة: استخرج متن نص هذه الصفحة العربية رقم " + pageNum + " بدقة وأمانة تامة 100% كما هي مكتوبة حرفياً وبدون أي تلخيص.\n\n" +
      "قواعد صارمة جداً لقراءة صوتية نقية بدون مقاطعة:\n" +
      "1. استبعاد أرقام الصفحات نهائياً: لا تقم بكتابة أي رقم صفحة مطبوع في الهوامش أو أسفل الصفحة أو أعلاها إطلاقاً (سواء كان رقماً عربياً مشرقياً مثل ٧، ٨، ٩ أو غربياً مثل 7, 8, 9).\n" +
      "2. استبعاد ترويسة وهوامش الصفحة المتكررة (Running Headers/Footers): مثل تكرار اسم الكتاب أو عنوان الفصل المطبوع في أعلى أو أسفل كل ورقة، استبعدها وتجاهلها.\n" +
      "3. استخرج صلب ومتن الكلام فقط بتدفقه السليم حتى يقرأه المعلق الصوتي بسلاسة بدون انقطاع.\n" +
      "4. إذا كانت الصفحة مجرد صفحة فهرس أو إهداء أو خالية من متن الفصل، اكتب فقط: [صفحة_غير_نصية].\n" +
      "5. أرجع النص المستخرج فقط مباشرة بدون أي مقدمات أو شروحات.";

    var payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }],
      generationConfig: { temperature: 0.1 }
    };

    var lastErr = null;
    for (var mi = 0; mi < candidateModels.length; mi++) {
      var modelName = candidateModels[mi];
      var retries = 2;
      while (retries >= 0) {
        if (isBatchCancelledRef && isBatchCancelledRef.current) throw new Error("CANCELLED");
        try {
          var res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + key, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          
          if (res.status === 429) {
            await new Promise(function(r) { setTimeout(r, 6000); });
            retries--;
            continue;
          }
          
          if (res.ok) {
            var data = await res.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
              return (data.candidates[0].content.parts[0].text || "").trim();
            } else {
              // Failed due to safety or empty response
              lastErr = new Error("Empty response or safety block from model " + modelName);
              break; // try next model
            }
          } else {
            var errD = await res.json().catch(function() { return {}; });
            lastErr = new Error((errD.error && errD.error.message) || ("Model " + modelName + " status " + res.status));
            break; // Try next model on 4xx/5xx
          }
        } catch (callErr) {
          if (callErr.message === "CANCELLED") throw callErr;
          lastErr = callErr;
          retries--;
          await new Promise(function(r) { setTimeout(r, 3000); });
        }
      }
    }
    throw lastErr || new Error("تعذر قراءة الصفحة بواسطة الذكاء الاصطناعي");
  };

  // دالة تنقية النص من أرقام الصفحات
  var cleanTextRegex = function(txt) {
    if (!txt) return "";
    var lines = txt.split("\n");
    lines = lines.filter(function(line) {
      var trimmed = line.trim();
      if (!trimmed) return true;
      if (/^[-–—\s]*\d+[-–—\s]*$/.test(trimmed)) return false;
      if (/^[-–—\s]*[\u0660-\u0669]+[-–—\s]*$/.test(trimmed)) return false;
      return true;
    });
    return lines.join("\n").trim();
  };

  // التنفيذ الفعلي لاستخراج فصل مفرد بعد ضبط الإعدادات
  var executeExtractChapterText = async function(cfg) {
    var chapId = cfg.chapterId;
    var sPage = cfg.startPage;
    var ePage = cfg.endPage;
    var excludeStr = cfg.excludePagesStr || "";
    var cleanHeadersFooters = cfg.cleanHeadersFooters !== false;

    setConfiguringChapterForExtract(null);

    var key = await window.GeminiAIService.getApiKey();
    if (!key) return alert("يرجى إدخال مفتاح Gemini في الإعدادات أولاً");

    // تحليل الصفحات المستثناة (مثال: "1, 2, 5-7")
    var excludedSet = {};
    if (excludeStr) {
      var parts = excludeStr.split(/[,،\s]+/);
      parts.forEach(function(p) {
        p = p.trim();
        if (p.indexOf("-") !== -1) {
          var rangeParts = p.split("-");
          var rStart = parseInt(rangeParts[0]);
          var rEnd = parseInt(rangeParts[1]);
          if (!isNaN(rStart) && !isNaN(rEnd)) {
            for (var rp = Math.min(rStart, rEnd); rp <= Math.max(rStart, rEnd); rp++) excludedSet[rp] = true;
          }
        } else {
          var singleP = parseInt(p);
          if (!isNaN(singleP)) excludedSet[singleP] = true;
        }
      });
    }

    // تجميع الصفحات الفعلية المطلوب استخراجها
    var pagesToExtract = [];
    for (var p = sPage; p <= ePage; p++) {
      if (!excludedSet[p]) pagesToExtract.push(p);
    }

    if (pagesToExtract.length === 0) {
      return alert("تنبيه: جميع الصفحات في النطاق المحدد تم استثناؤها!");
    }

    setExtractingChapterId(chapId);
    setExtractStatusText("جاري استخراج النص...");

    try {
      var accumulated = "";
      for (var pi = 0; pi < pagesToExtract.length; pi++) {
        var pageNum = pagesToExtract[pi];
        setExtractStatusText("جاري قراءة صفحة " + pageNum + " (" + (pi + 1) + " من " + pagesToExtract.length + ")...");
        try {
          var pageObj = await pdfDoc.getPage(pageNum);
          var vp = pageObj.getViewport({ scale: 1.4 });
          var c = document.createElement("canvas");
          c.width = vp.width;
          c.height = vp.height;
          var cx = c.getContext("2d");
          await pageObj.render({ canvasContext: cx, viewport: vp }).promise;
          var b64 = c.toDataURL("image/jpeg", 0.8).split("base64,")[1];

          var pageText = await extractTextFromPageBase64(b64, key, pageNum);
          if (pageText && pageText !== "[صفحة_غير_نصية]") {
            if (cleanHeadersFooters) {
              pageText = cleanTextRegex(pageText);
            }
            if (pageText) {
              accumulated += (accumulated ? "\n\n" : "") + pageText;
            }
          }
        } catch (pageErr) {
          console.warn("OCR error on page " + pageNum, pageErr);
        }
      }

      if (accumulated.trim()) {
        var currentChaps = (activeBook.audioChapters || []).slice();
        var chapIdx = currentChaps.findIndex(function(c) { return c.id === chapId; });
        if (chapIdx >= 0) {
          currentChaps[chapIdx] = Object.assign({}, currentChaps[chapIdx], {
            text: accumulated.trim(),
            startPage: sPage,
            endPage: ePage,
            excludePages: excludeStr
          });
          var updatedBook2 = Object.assign({}, activeBook, { audioChapters: currentChaps });
          await cloud.saveBook(updatedBook2);
          setActiveBook(updatedBook2);
          setViewingChapterText(currentChaps[chapIdx]);
          alert("✨ تم استخراج النص بنجاح وتصفيته من أرقام الصفحات والترويسات! (" + accumulated.length + " حرف).\nتم فتح النص لتتمكن من نسخه الآن.");
        }
      } else {
        alert("تعذر استخراج النص من صفحات هذا الفصل. يرجى التأكد من مفتاح الذكاء الاصطناعي وجودة الصفحات.");
      }
    } catch (errOcrAll) {
      alert("حدث خطأ أثناء استخراج النص: " + (errOcrAll.message || errOcrAll));
    } finally {
      setExtractingChapterId(null);
      setExtractStatusText("");
    }
  };

  // استخراج نصوص كافة الفصول دفعة واحدة (Batch All Chapters Extraction)
  var [batchProgress, setBatchProgress] = React.useState(null);
  var batchCancelledRef = React.useRef(false);

  var handleStopBatchExtraction = function() {
    batchCancelledRef.current = true;
    setExtractStatusText("جاري إيقاف الاستخراج الجماعي وحفظ ما تم إنجازه...");
  };

  var handleBatchExtractAllChapters = async function() {
    if (!activeBook || !pdfDoc) return alert("يرجى فتح ملف الـ PDF أولاً");
    var chaps = (activeBook.audioChapters || []);
    if (chaps.length === 0) return alert("يرجى فحص الفهرس أولاً لتقسيم الفصول");

    var key = await window.GeminiAIService.getApiKey();
    if (!key) return alert("يرجى إدخال مفتاح Gemini في الإعدادات أولاً");

    if (!window.confirm("📦 هل تريد استخراج نصوص جميع فصول هذا الكتاب (" + chaps.length + " فصول) دفعة واحدة تلقائياً؟\nسيتم حفظ كل فصل تلقائياً فور انتهائه، مع شريط تقدم وحساب الوقت المتبقي.")) return;

    batchCancelledRef.current = false;
    var startTime = Date.now();
    var totalChaps = chaps.length;

    // حساب إجمالي الصفحات المقدرة
    var totalPagesToProcess = 0;
    chaps.forEach(function(c, i) {
      var sP = Number(c.startPage) || 1;
      var eP = Number(c.endPage) || sP;
      if (eP <= sP) {
        if (i < chaps.length - 1 && chaps[i + 1].startPage) eP = Math.max(sP, Number(chaps[i + 1].startPage) - 1);
        else eP = Math.min(sP + 15, pdfDoc.numPages || sP);
      }
      totalPagesToProcess += Math.max(1, (eP - sP + 1));
    });

    var processedPagesCount = 0;
    var workingChaps = chaps.slice();

    for (var ci = 0; ci < workingChaps.length; ci++) {
      if (batchCancelledRef.current) break;
      var currentChap = workingChaps[ci];
      var sPage = Number(currentChap.startPage) || 1;
      var ePage = Number(currentChap.endPage) || sPage;
      if (ePage <= sPage) {
        if (ci < workingChaps.length - 1 && workingChaps[ci + 1].startPage) {
          ePage = Math.max(sPage, Number(workingChaps[ci + 1].startPage) - 1);
        } else {
          ePage = Math.min(sPage + 15, pdfDoc.numPages || sPage);
        }
      }

      setExtractingChapterId(currentChap.id);
      var accumulated = "";

      for (var p = sPage; p <= ePage; p++) {
        if (batchCancelledRef.current) break;
        var elapsedSec = (Date.now() - startTime) / 1000;
        var avgSec = processedPagesCount > 0 ? (elapsedSec / processedPagesCount) : 7.0;
        var remainingSec = Math.max(0, (totalPagesToProcess - processedPagesCount) * avgSec);
        var pct = Math.round((processedPagesCount / Math.max(1, totalPagesToProcess)) * 100);

        setBatchProgress({
          currentChapterIndex: ci + 1,
          totalChapters: totalChaps,
          currentChapterTitle: currentChap.title,
          currentPage: p,
          pagesDone: processedPagesCount,
          totalPages: totalPagesToProcess,
          percent: pct,
          elapsedSeconds: elapsedSec,
          remainingSeconds: remainingSec
        });

        try {
          var pageObj = await pdfDoc.getPage(p);
          var vp = pageObj.getViewport({ scale: 1.4 });
          var c = document.createElement("canvas");
          c.width = vp.width;
          c.height = vp.height;
          var cx = c.getContext("2d");
          await pageObj.render({ canvasContext: cx, viewport: vp }).promise;
          var b64 = c.toDataURL("image/jpeg", 0.8).split("base64,")[1];

          var pageText = await extractTextFromPageBase64(b64, key, p, batchCancelledRef);
          if (pageText && pageText !== "[صفحة_غير_نصية]") {
            pageText = cleanTextRegex(pageText);
            if (pageText) accumulated += (accumulated ? "\n\n" : "") + pageText;
          }
        } catch (pageErr) {
          if (pageErr.message === "CANCELLED") break;
          console.warn("Batch OCR error on page " + p, pageErr);
        }
        processedPagesCount++;
      }

      // حفظ الفصل المنجز فوراً سحابياً ومحلياً
      if (accumulated.trim()) {
        workingChaps[ci] = Object.assign({}, workingChaps[ci], {
          text: accumulated.trim(),
          startPage: sPage,
          endPage: ePage
        });
        var updatedBookLive = Object.assign({}, activeBook, { audioChapters: workingChaps.slice() });
        await cloud.saveBook(updatedBookLive);
        setActiveBook(updatedBookLive);
      }
    }

    setExtractingChapterId(null);
    setExtractStatusText("");
    setBatchProgress(null);

    if (batchCancelledRef.current) {
      alert("تم إيقاف الاستخراج بناءً على طلبك وحفظ الفصول التي تم الانتهاء منها.");
    } else {
      alert("🎉 اكتمل استخراج نصوص كافة فصول الكتاب بنجاح! جميع النصوص محفوظة وجاهزة الآن.");
    }
  };

  var handleChapterTextFileChange = function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      setChapText(evt.target.result || "");
    };
    reader.readAsText(file, "UTF-8");
  };

  var handleSaveChapterSubmit = async function(e) {
    e.preventDefault();
    if (!chapTitle.trim()) {
      alert("الرجاء كتابة اسم الفصل (مثال: المقدمة أو الفصل الأول)");
      return;
    }
    if (!chapAudioUrl.trim() && !chapAudioFile) {
      alert("الرجاء اختيار ملف الصوت (MP3) أو وضع رابط الصوت للفصل");
      return;
    }

    setIsSavingChapter(true);
    setChapterSaveStatus("جاري معالجة الفصل ورفع الصوت...");

    try {
      var finalAudio = chapAudioUrl.trim();

      if (chapAudioFile) {
        setChapterSaveStatus("جاري رفع ملف الصوت (MP3) إلى Google Drive...");
        var audioBase64 = await new Promise(function(resolve, reject) {
          var reader = new FileReader();
          reader.onload = function() {
            var res = reader.result;
            resolve(typeof res === "string" && res.includes(",") ? res.split(",")[1] : res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(chapAudioFile);
        });

        var audioRes = await fetch(cfg.driveUploadEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            fileName: (activeBook.title || "كتاب") + "_" + chapTitle.trim().replace(/\s+/g, "_") + ".mp3",
            mimeType: chapAudioFile.type || "audio/mpeg",
            base64Data: audioBase64
          })
        });

        var aData = await audioRes.json();
        if (aData.status === "success" && (aData.fileUrl || aData.fileId)) {
          finalAudio = aData.fileUrl || ("https://drive.google.com/file/d/" + aData.fileId + "/view");
        }
      }

      var currentChaps = (activeBook.audioChapters || []).slice();
      var chapterObj = {
        id: editingChapter ? editingChapter.id : ("ch_" + Date.now()),
        title: chapTitle.trim(),
        startPage: parseInt(chapStartPage) || 1,
        audioUrl: finalAudio,
        text: chapText.trim(),
        updatedAt: new Date().toISOString()
      };

      if (editingChapter) {
        var idx = currentChaps.findIndex(function(c) { return c.id === editingChapter.id; });
        if (idx >= 0) currentChaps[idx] = chapterObj;
        else currentChaps.push(chapterObj);
      } else {
        currentChaps.push(chapterObj);
      }

      currentChaps.sort(function(a, b) { return (a.startPage || 1) - (b.startPage || 1); });

      var updatedBook = Object.assign({}, activeBook, { audioChapters: currentChaps });
      await cloud.saveBook(updatedBook);
      setActiveBook(updatedBook);

      setIsSavingChapter(false);
      setShowChapterModal(false);
    } catch(err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ الفصل: " + (err.message || err));
      setIsSavingChapter(false);
    }
  };

  var handleAutoDetectBookWithAi = async function() {
    var hasFile = !!selectedFile;
    var hasUrl = !!newDriveUrl.trim();
    if (!hasFile && !hasUrl && !newTitle.trim()) {
      alert("يرجى اختيار ملف PDF للكتاب أو وضع رابط Google Drive أولاً ليقوم الذكاء الاصطناعي باستخراج الغلاف والبيانات تلقائياً.");
      return;
    }

    setIsAiAnalyzingBook(true);
    setUploadStatusText("جاري استخراج الغلاف وبيانات الكتاب بالذكاء الاصطناعي... ⏳");

    try {
      var doc = null;
      if (selectedFile) {
        var buffer = await selectedFile.arrayBuffer();
        doc = await window.pdfjsLib.getDocument({ data: buffer }).promise;
      } else if (newDriveUrl.trim()) {
        var driveId = utils.extractDriveId(newDriveUrl.trim());
        if (driveId) {
          try {
            var cdnUrl = "https://drive.usercontent.google.com/download?id=" + driveId + "&export=download";
            var resp = await fetch(cdnUrl);
            if (resp.ok) {
              var buf = await resp.arrayBuffer();
              doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
            }
          } catch (eCdn) {}
        }
      }

      var coverDataUrl = "";
      var scanParts = [];
      var pageThumbnails = {}; // p -> dataUrl
      if (doc) {
        setNewTotalPages(doc.numPages || 300);
        // فحص أول 5 صفحات (الغلاف الداخلي والخارجي، صفحة بيانات النشر، المترجم) لضمان العثور على اسم المترجم
        var maxInspect = Math.min(doc.numPages || 1, 5);
        for (var p = 1; p <= maxInspect; p++) {
          try {
            var pageObj = await doc.getPage(p);
            // مقياس خفيف وواضح لقراءة تفاصيل صفحة بيانات النشر والمترجم
            var vp = pageObj.getViewport({ scale: 1.2 });
            var tempCanvas = document.createElement("canvas");
            tempCanvas.width = vp.width;
            tempCanvas.height = vp.height;
            var ctx = tempCanvas.getContext("2d");
            await pageObj.render({ canvasContext: ctx, viewport: vp }).promise;
            var dataUrl = tempCanvas.toDataURL("image/jpeg", 0.75);
            pageThumbnails[p] = dataUrl;
            if (p === 1) {
              coverDataUrl = dataUrl;
              setNewCoverUrl(dataUrl);
            }
            var b64 = dataUrl.split("base64,")[1];
            scanParts.push({ inline_data: { mime_type: "image/jpeg", data: b64 } });
          } catch (ePage) {}
        }
      }

      var key = await window.GeminiAIService.getApiKey();
      if (!key) {
        if (selectedFile && !newTitle.trim()) {
          processSelectedFile(selectedFile);
        }
        alert("تم استخراج صورة الغلاف وعدد الصفحات بنجاح! يمكنك إضافة مفتاح Gemini في الإعدادات لاستخراج اسم الكتاب والكاتب والمترجم تلقائياً.");
        return;
      }

      var aiSuccess = false;
      var lastAiError = "";

      if (scanParts.length > 0) {
        var autoModels = await window.GeminiAIService.fetchSupportedModels(key);
        // وضع نماذج gemini-2.0-flash و gemini-1.5-flash في المقدمة لأنها تدعم الصور والرؤية بامتياز
        var defaultCandidateModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash-8b"];
        var candidateModels = autoModels.length > 0 ? autoModels.concat(defaultCandidateModels) : defaultCandidateModels;
        // إزالة التكرار
        candidateModels = candidateModels.filter(function(item, pos) { return candidateModels.indexOf(item) === pos; });

        var promptVision = "أنت خبير فحص وفهرسة كتب محترف. أمامك صور أول " + scanParts.length + " صفحات من الكتاب (تشمل الغلاف وصفحة العنوان وبيانات النشر وحقوق الملكية).\n" +
          "مطلوب منك بدقة شديدة قراءة وتدقيق النصوص على الغلاف وصفحة العنوان وصفحة بيانات النشر لاستخراج الحقول التالية:\n" +
          "1. coverPageNumber: رقم صفحة الغلاف الحقيقي الملون للكتاب (1 أو 2 أو 3 إذا كانت الصفحة الأولى بيضاء أو فارغة).\n" +
          "2. title: اسم أو عنوان الكتاب الدقيق بالعربية (مثل: الروحانية الناضجة وجدانياً).\n" +
          "3. author: اسم المؤلف / الكاتب الأصلي (مثل: بيتر سكارزيرو أو Peter Scazzero).\n" +
          "4. translator: ابحث بعناية شديدة في صفحات العنوان وبيانات النشر عن أي كلمة مثل: (ترجمة / نقله إلى العربية / تعريب / ترجمة وإعداد / د. ...). إذا كان مترجماً، استخرج اسم المترجم الدقيق بالعربية (مثل: د. أوسم وصفي، أو مايكل عاطف، إلخ). إذا كان الكتاب مؤلفاً بالعربية أصلاً ولم يُذكر أي مترجم، ضع قيمة فارغة \"\".\n\n" +
          "أجب بصيغة JSON صريحة فقط بدون أي شرح أو كود إضافي:\n" +
          "{\"coverPageNumber\": 1, \"title\": \"...\", \"author\": \"...\", \"translator\": \"...\"}";

        var requestBody = {
          contents: [{
            role: "user",
            parts: [{ text: promptVision }].concat(scanParts)
          }],
          generationConfig: { temperature: 0.1 }
        };

        for (var i = 0; i < candidateModels.length; i++) {
          try {
            var controller = new AbortController();
            var timeoutId = setTimeout(function() { controller.abort(); }, 25000);
            var res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + candidateModels[i] + ":generateContent?key=" + key, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              var d = await res.json();
              if (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts[0]) {
                var txt = d.candidates[0].content.parts[0].text;
                var clean = txt.replace(/```json/gi, "").replace(/```/g, "").trim();
                var fIdx = clean.indexOf("{");
                var lIdx = clean.lastIndexOf("}");
                if (fIdx !== -1 && lIdx !== -1) clean = clean.substring(fIdx, lIdx + 1);
                var parsed = JSON.parse(clean);

                // تعيين الغلاف الذكي الحقيقي المكتشف
                var detectedCoverNum = Number(parsed.coverPageNumber) || 1;
                if (pageThumbnails[detectedCoverNum]) {
                  setNewCoverUrl(pageThumbnails[detectedCoverNum]);
                }

                if (parsed.title) setNewTitle(parsed.title.trim());
                if (parsed.author) setNewAuthor(parsed.author.trim());
                if (parsed.translator) setNewTranslator(parsed.translator.trim());

                aiSuccess = true;
                setIsAiAnalyzingBook(false);
                setUploadStatusText("");
                alert("✨ تم استخراج بيانات الكتاب بنجاح!\n\n📖 اسم الكتاب: " + (parsed.title || "") + "\n✍️ المؤلف: " + (parsed.author || "") + (parsed.translator ? "\n🌐 المترجم: " + parsed.translator : "") + "\n🖼️ صفحة الغلاف: " + detectedCoverNum);
                break;
              }
            } else {
              var errData = await res.json().catch(function() { return {}; });
              lastAiError = (errData.error && errData.error.message) || ("Model " + candidateModels[i] + " returned status " + res.status);
            }
          } catch (eVis) {
            lastAiError = eVis.name === "AbortError" ? "استغرقت الاستجابة وقتاً طويلاً" : (eVis.message || String(eVis));
            console.warn("AI inspect model error:", eVis);
          }
        }
        setIsAiAnalyzingBook(false);
        setUploadStatusText("");
        if (!aiSuccess) {
          alert("تنبيه من خدمة الذكاء الاصطناعي: " + (lastAiError || "تعذر قراءة بيانات الكتاب بواسطة النماذج المتاحة. تأكد من صلاحية مفتاح Gemini في الإعدادات."));
        }
      } else {
        var query = (newTitle || (selectedFile ? selectedFile.name : "")).trim();
        if (query) {
          var promptText = "بناءً على اسم الملف أو الكتاب: '" + query + "'، استخرج بصيغة JSON فقط: {\"title\": \"اسم الكتاب بالعربية\", \"author\": \"اسم المؤلف بالعربية\", \"translator\": \"اسم المترجم بالعربية إن وجد وإلا فارغ\"}";
          var resTxt = await ai.callGemini(promptText);
          var parsed2 = JSON.parse(resTxt.replace(/```json/gi, "").replace(/```/g, "").trim());
          if (parsed2.title) setNewTitle(parsed2.title);
          if (parsed2.author) setNewAuthor(parsed2.author);
          if (parsed2.translator) setNewTranslator(parsed2.translator);
        }
      }
    } catch (err) {
      console.warn("AI Detect Book error:", err);
      if (selectedFile && !newTitle.trim()) {
        processSelectedFile(selectedFile);
      }
    } finally {
      setIsAiAnalyzingBook(false);
      setUploadStatusText("");
    }
  };

  var processSelectedFile = function(file) {
    if (!file) return;
    setSelectedFile(file);
    // استخراج صورة الصفحة الأولى للمعاينة فوراً بدون كتابة اسم الملف الخام كاسم للكتاب
    if (window.pdfjsLib) {
      file.arrayBuffer().then(function(buf) {
        return window.pdfjsLib.getDocument({ data: buf }).promise;
      }).then(function(doc) {
        setNewTotalPages(doc.numPages || 1);
        return doc.getPage(1);
      }).then(function(page) {
        var vp = page.getViewport({ scale: 0.8 });
        var canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        var ctx = canvas.getContext("2d");
        return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function() {
          setNewCoverUrl(canvas.toDataURL("image/jpeg", 0.8));
        });
      }).catch(function() {});
    }
  };

  var handleFileSelect = function(e) {
    var file = e.target.files && e.target.files[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  var handleDeleteBook = async function(e, bookId) {
    e.stopPropagation();
    if (!window.confirm("هل أنت متأكد من حذف هذا الكتاب نهائياً من المنصة؟")) return;
    try {
      var success = await cloud.deleteDocument("books", bookId);
      if (success) {
        setBooks(function(prev) { return prev.filter(function(b) { return b.id !== bookId; }); });
        if (activeBook && activeBook.id === bookId) {
            setActiveBook(null);
            utils.removeLocal("counsel_active_book_id");
        }
      } else {
        alert("فشل حذف الكتاب. تأكد من اتصالك بالإنترنت.");
      }
    } catch(err) {
      alert("خطأ أثناء الحذف: " + err.message);
    }
  };

  var handleEditBookClick = function(e, book) {
    e.stopPropagation();
    setEditingBookId(book.id);
    setNewTitle(book.title || "");
    setNewAuthor(book.author || "");
    setNewTranslator(book.translator || "");
    setNewCoverUrl(book.coverUrl || "");
    setNewDriveUrl(book.driveUrl || "");
    setNewTrack1Url(book.audioUrl || "");
    setSelectedFile(null);
    setSelectedCoverFile(null);
    setSelectedAudioFile(null);
    setShowAddModal(true);
  };

  var handleAddBook = async function(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    var finalDriveUrl = newDriveUrl.trim();

    if (selectedFile) {
      try {
        setIsUploading(true);
        setUploadStatusText("جاري حفظ ورفع ملف الكتاب...");

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
        }
      } catch (err) {
        console.warn("Drive upload notice:", err);
      }
    }

    var finalAudioUrl = newTrack1Url.trim();
    if (selectedAudioFile) {
      try {
        setIsUploading(true);
        setUploadStatusText("جاري رفع الملف الصوتي...");
        var audioBase64 = await new Promise(function(resolve, reject) {
          var reader = new FileReader();
          reader.onload = function() {
            var result = reader.result;
            resolve(typeof result === "string" && result.includes(",") ? result.split(",")[1] : result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedAudioFile);
        });

        var audioRes = await fetch(cfg.driveUploadEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            fileName: selectedAudioFile.name,
            mimeType: selectedAudioFile.type || "audio/mpeg",
            base64Data: audioBase64
          })
        });

        var aData = await audioRes.json();
        if (aData.status === "success" && (aData.fileUrl || aData.fileId)) {
          finalAudioUrl = aData.fileUrl || ("https://drive.google.com/file/d/" + aData.fileId + "/view");
        }
      } catch (errA) {
        console.warn("Audio upload err:", errA);
      }
    }

    var finalCoverUrl = utils.getDriveImageUrl((newCoverUrl || "").trim());
    if (selectedCoverFile) {
      try {
        var uploadedCover = await uploadCoverImage(selectedCoverFile);
        if (uploadedCover) finalCoverUrl = utils.getDriveImageUrl(uploadedCover);
      } catch (errCover) {}
    }

    var finalAuthor = newAuthor.trim();
    if (newTranslator.trim()) {
      finalAuthor = finalAuthor ? (finalAuthor + " (ترجمة: " + newTranslator.trim() + ")") : ("ترجمة: " + newTranslator.trim());
    }

    var existingBook = editingBookId ? books.find(function(b) { return b.id === editingBookId; }) : null;
    var nowTimestamp = Date.now();
    var newB = Object.assign({}, existingBook || {}, {
      id: editingBookId || ("book-" + nowTimestamp),
      title: newTitle.trim(),
      author: finalAuthor || "غير محدد",
      translator: newTranslator.trim() || (existingBook ? existingBook.translator : ""),
      coverUrl: finalCoverUrl || (existingBook ? existingBook.coverUrl : ""),
      driveUrl: finalDriveUrl || (existingBook ? existingBook.driveUrl : ""),
      audioUrl: finalAudioUrl || (existingBook ? existingBook.audioUrl : ""),
      uploadedAt: (existingBook && (existingBook.uploadedAt || existingBook.createdAt)) ? (existingBook.uploadedAt || existingBook.createdAt) : nowTimestamp,
      createdAt: (existingBook && existingBook.createdAt) ? existingBook.createdAt : nowTimestamp
    });

    if (!existingBook) {
      newB.totalPages = parseInt(newTotalPages) || 300;
      newB.currentPage = 1;
      newB.chapters = Array.from({ length: parseInt(newChaptersCount) || 1 }, function(_, i) { return { title: 'فصل ' + (i + 1), time: 0, page: 1 }; });
      newB.audioChapters = (detectedChaptersList && detectedChaptersList.length > 0) ? detectedChaptersList : [];
    }

    cloud.saveBook(newB);
    setActiveBook(newB);
    if (selectedFile) {
      try {
        var fileBuf = await selectedFile.arrayBuffer();
        await utils.saveOfflinePdf(newB.id, fileBuf);
        // بدء التجهيز والتحويل الصوتي التلقائي فوراً لجميع صفحات الكتاب
        if (window.pdfjsLib) {
          window.pdfjsLib.getDocument({ data: fileBuf }).promise.then(function(loadedDoc) {
            setPdfDoc(loadedDoc);
            setPdfTotalPages(loadedDoc.numPages);
            
          }).catch(function() {});
        }
      } catch (eBuf) {}
    } else if (newB.driveUrl) {
      loadPdfFromUrl(newB.driveUrl);
    }

    setShowAddModal(false);
    setIsUploading(false);
    setSelectedFile(null);
    setSelectedCoverFile(null);
    setNewTitle("");
    setNewAuthor("");
    setNewTranslator("");
    setNewCoverUrl("");
    setNewDriveUrl("");
    setDetectedChaptersList([]);
    setEditingBookId(null);
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
              var savedPage = utils.getLocal("counsel_book_page_" + b.id);
              var targetBook = savedPage ? Object.assign({}, b, { currentPage: Number(savedPage) }) : b;
              utils.setLocal("counsel_active_book_id", b.id);
              setActiveBook(targetBook);
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
                utils.setLocal("counsel_active_book_id", null);
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
            React.createElement("div", { className: "flex items-center flex-wrap gap-2" },
              React.createElement("h3", { className: "text-lg font-bold text-slate-900 dark:text-white" }, activeBook.title),
              currentUser.role === "admin" && React.createElement(
                "div",
                { className: "flex items-center gap-1.5 flex-wrap" },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function(e) { handleEditBookClick(e, activeBook); },
                    className: "px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold flex items-center gap-1 transition-all border border-blue-200 dark:border-blue-800"
                  },
                  React.createElement("span", null, "✏️"),
                  React.createElement("span", null, "تعديل الكتاب")
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function(e) { handleDeleteBook(e, activeBook.id); },
                    className: "px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 transition-all border border-rose-200 dark:border-rose-800"
                  },
                  React.createElement("span", null, "🗑️"),
                  React.createElement("span", null, "حذف الكتاب")
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() {
                      setEditingCoverUrl(activeBook.coverUrl || "");
                      setSelectedCoverFile(null);
                      setShowCoverEditModal(true);
                    },
                    className: "px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold flex items-center gap-1 transition-all"
                  },
                  React.createElement("span", null, "🖼️"),
                  React.createElement("span", null, "تغيير الغلاف")
                )
              )
            ),
            React.createElement("div", { className: "flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5" },
              React.createElement("span", null, "المؤلف: " + (activeBook.author || "غير محدد")),
              React.createElement("span", { className: "text-slate-300 dark:text-slate-700" }, "•"),
              React.createElement("span", null, (activeBook.totalPages || 0) + " صفحة"),
              (activeBook.uploadedAt || activeBook.createdAt) ? React.createElement(
                "span",
                { className: "flex items-center gap-1 text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md" },
                React.createElement("span", null, "📅 تم الرفع:"),
                React.createElement("span", null, (function() {
                  try {
                    return new Date(activeBook.uploadedAt || activeBook.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
                  } catch(e) { return ""; }
                })())
              ) : null
            )
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
            className: "w-10 h-10 rounded-xl bg-white dark:bg-slate-700 font-bold flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95 transition-all text-slate-700 dark:text-slate-200 text-sm"
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
                className: "w-14 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-center font-extrabold text-emerald-600 dark:text-emerald-400 text-sm py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              }),
              React.createElement("span", { className: "text-xs text-slate-400 font-semibold" }, " / " + getMaxPages())
            )
          ),
          React.createElement("button", {
            type: "button",
            onClick: function() { handlePageChange((activeBook.currentPage || 1) + 1); },
            disabled: (activeBook.currentPage || 1) >= getMaxPages(),
            title: "الصفحة التالية",
            className: "w-10 h-10 rounded-xl bg-white dark:bg-slate-700 font-bold flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95 transition-all text-slate-700 dark:text-slate-200 text-sm"
          }, "▶")
        )
      ),

      // تبويبات التنقل الخاصة بالموبايل (للتبديل السريع بين قارئ الـ PDF وقسم الفصول والاستماع بدون تمرير طويل)
      React.createElement(
        "div",
        { className: "flex sm:hidden items-center justify-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner" },
        React.createElement("button", {
          type: "button",
          onClick: function() { setMobileSectionTab("pdf"); },
          className: "flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all " +
            (mobileSectionTab === "pdf"
              ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white")
        }, "📖 عرض صفحات الـ PDF"),
        React.createElement("button", {
          type: "button",
          onClick: function() { setMobileSectionTab("study"); },
          className: "flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all " +
            (mobileSectionTab === "study"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white")
        }, "🎧 الفصول والاستماع")
      ),

      // عارض الـ PDF التفاعلي المدمج (مكون مستقل PdfReaderView)
      React.createElement(window.PdfReaderView, {
        activeBook: activeBook,
        isSavedOffline: isSavedOffline,
        isFullScreen: isFullScreen,
        mobileSectionTab: mobileSectionTab,
        pdfTheme: pdfTheme,
        setPdfTheme: setPdfTheme,
        pdfRotation: pdfRotation,
        handlePageChange: handlePageChange,
        getMaxPages: getMaxPages,
        handleRotatePage: handleRotatePage,
        toggleFullScreen: toggleFullScreen,
        loadPdfFromData: loadPdfFromData,
        setIsSavedOffline: setIsSavedOffline,
        setOfflineSaveMsg: setOfflineSaveMsg,
        handleSaveOffline: handleSaveOffline,
        isSavingOffline: isSavingOffline,
        handleRemoveOffline: handleRemoveOffline,
        isPdfLoading: isPdfLoading,
        pdfDoc: pdfDoc,
        pdfCanvasRef: pdfCanvasRef,
        pdfViewerContainerRef: pdfViewerContainerRef
      }),

      // قسم دراسة ومراجعة الكتاب (زرارين رئيسيين: تراك 1 والملخص)
      React.createElement(
        "div",
        {
          className: "space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800 transition-all " +
            (mobileSectionTab === "pdf" ? "hidden sm:block" : "block")
        },

        // شريط التبديل بين الزرارين الرئيسيين
        React.createElement(
          "div",
          { className: "flex items-center justify-center p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 max-w-xl mx-auto shadow-inner border border-slate-200/60 dark:border-slate-700/60 gap-1.5" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setBookStudyTab("chapters"); },
              className: "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all " +
                (bookStudyTab === "chapters"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md font-black scale-[1.02]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")
            },
            React.createElement("span", { className: "text-base" }, "🎧"),
            React.createElement("span", null, "فصول وتراكات الكتاب"),
            (activeBook.audioChapters || []).length > 0 ? React.createElement("span", { className: "px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300" }, (activeBook.audioChapters || []).length) : null
          ),
          false ? React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setBookStudyTab("track1"); },
              className: "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all " +
                (bookStudyTab === "track1"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-md font-black scale-[1.02]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")
            },
            React.createElement("span", { className: "text-base" }, "🎙️"),
            React.createElement("span", null, "تراك 1 (البودكاست)"),
            activeBook.audioUrl ? React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }) : null
          ) : null,
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setBookStudyTab("summary"); },
              className: "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all " +
                (bookStudyTab === "summary"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md font-black scale-[1.02]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")
            },
            React.createElement("span", { className: "text-base" }, "📖"),
            React.createElement("span", null, "ملخص الكتاب")
          )
        ),

        bookStudyTab === "chapters" ? React.createElement(window.AudioChaptersView, {
          activeBook: activeBook,
          currentUser: currentUser,
          playingChapterId: playingChapterId,
          setPlayingChapterId: setPlayingChapterId,
          chapterAudioRef: chapterAudioRef,
          handlePageChange: handlePageChange,
          handleAutoScanActiveBookChapters: handleAutoScanActiveBookChapters,
          handleOpenAddChapter: handleOpenAddChapter,
          handleOpenEditChapter: handleOpenEditChapter,
          handleDeleteChapter: handleDeleteChapter,
          setViewingChapterText: setViewingChapterText,
          isAiAnalyzingBook: isAiAnalyzingBook,
          handleExtractChapterText: handleExtractChapterText,
          handleBatchExtractAllChapters: handleBatchExtractAllChapters,
          handleStopBatchExtraction: handleStopBatchExtraction,
          batchProgress: batchProgress,
          extractingChapterId: extractingChapterId,
          extractStatusText: extractStatusText,
          handleClearAllChapters: handleClearAllChapters,
          handleBatchExtractAllChapters: handleBatchExtractAllChapters,
          handleStopBatchExtraction: handleStopBatchExtraction,
          batchProgress: batchProgress
        }) :
        bookStudyTab === "track1" ? (function() {
          var audioSrc = activeBook.audioUrl ? utils.getAudioStreamUrl(activeBook.audioUrl) : "";
          var bookmarks = activeBook.bookmarks || [];

          return React.createElement(
            "div",
            { className: "space-y-4" },

            // كارت مشغل تراك 1
            React.createElement(
              "div",
              { className: "p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white shadow-xl border border-slate-800 space-y-4" },

              // عنصر الصوت الخفي
              React.createElement("audio", {
                ref: track1AudioRef,
                src: audioSrc,
                preload: "metadata",
                onTimeUpdate: function(e) {
                  var ct = e.target.currentTime;
                  setTrack1CurrentTime(ct);
                  if (activeBook && activeBook.id && Math.floor(ct) % 2 === 0) {
                    try {
                      localStorage.setItem("counsel_audio_pos_" + activeBook.id, ct.toString());
                    } catch (err) {}
                  }
                },
                onLoadedMetadata: function(e) {
                  setTrack1Duration(e.target.duration);
                  if (track1AudioRef.current) {
                    track1AudioRef.current.playbackRate = track1PlaybackRate;
                    try {
                      var saved = localStorage.getItem("counsel_audio_pos_" + activeBook.id);
                      if (saved && !isNaN(parseFloat(saved))) {
                        var pos = parseFloat(saved);
                        if (pos > 0 && pos < e.target.duration) {
                          track1AudioRef.current.currentTime = pos;
                          setTrack1CurrentTime(pos);
                          setResumedNotice("تم استئناف الموضع تلقائياً عند " + formatAudioTime(pos));
                          setTimeout(function() { setResumedNotice(""); }, 4000);
                        }
                      }
                    } catch (err) {}
                  }
                },
                onEnded: function() {
                  setIsTrack1Playing(false);
                  try { localStorage.removeItem("counsel_audio_pos_" + activeBook.id); } catch (err) {}
                }
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
                    { className: "w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-xl shadow-lg shadow-teal-950/50" },
                    "🎙️"
                  ),
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-2" },
                      React.createElement("h4", { className: "font-black text-sm sm:text-base text-white tracking-wide" }, "تراك 1 — الشامل من NotebookLM"),
                      React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30" }, "حفظ موضع الاستماع ✓")
                    ),
                    React.createElement(
                      "p",
                      { className: "text-xs text-slate-400 mt-0.5" },
                      audioSrc ? "استمع للمناقشة التفاعلية الشاملة، ويتم تذكر آخر ثانية توقفت عندها تلقائياً" : "لم يتم ربط ملف صوتي للتراك بعد — اضغط زر الإعدادات بالأسفل"
                    )
                  )
                ),
                // أزرار التحكم الرأسية
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2 self-end sm:self-auto" },
                  resumedNotice ? React.createElement(
                    "div",
                    { className: "text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-xl animate-fade-in" },
                    "⚡ " + resumedNotice
                  ) : null,
                  currentUser.role === "admin" ? React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: function() {
                        setEditTrackUrl(activeBook.audioUrl || "");
                        setShowTrackModal(true);
                      },
                      className: "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-teal-300 border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
                    },
                    "⚙️ رابط التراك"
                  ) : null
                )
              ),

              // شريط تقدم الصوت الزمني
              React.createElement(
                "div",
                { className: "space-y-1.5 pt-1" },
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between text-xs font-mono text-slate-400 px-0.5" },
                  React.createElement("span", { className: "text-teal-400 font-bold" }, formatAudioTime(track1CurrentTime)),
                  React.createElement(
                    "span",
                    { className: "text-[11px] text-slate-500" },
                    track1Duration > 0 ? "المتبقي: -" + formatAudioTime(track1Duration - track1CurrentTime) : ""
                  ),
                  React.createElement("span", null, formatAudioTime(track1Duration))
                ),
                React.createElement("input", {
                  type: "range",
                  min: 0,
                  max: track1Duration || 100,
                  value: track1CurrentTime || 0,
                  disabled: !audioSrc,
                  onChange: function(e) {
                    var newTime = parseFloat(e.target.value);
                    setTrack1CurrentTime(newTime);
                    if (track1AudioRef.current) track1AudioRef.current.currentTime = newTime;
                    try { localStorage.setItem("counsel_audio_pos_" + activeBook.id, newTime.toString()); } catch (err) {}
                  },
                  className: "w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400 disabled:opacity-40"
                })
              ),

              // أزرار التحكم في المشغل (سرعة، -15ث، تشغيل، +15ث، علامة جديدة)
              React.createElement(
                "div",
                { className: "flex items-center justify-between pt-2 gap-2" },
                // زر السرعة
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: handleChangeSpeed,
                    title: "تغيير سرعة الصوت",
                    className: "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-all border border-slate-700 active:scale-95"
                  },
                  track1PlaybackRate + "x"
                ),

                // مجموعة التحكم الأساسية في المنتصف
                React.createElement(
                  "div",
                  { className: "flex items-center gap-3" },
                  // تأخير 15 ثانية
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: function() { handleTrack1Seek(-15); },
                      disabled: !audioSrc,
                      title: "تأخير 15 ثانية",
                      className: "px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 flex items-center gap-1 text-xs font-mono font-bold transition-all active:scale-95 border border-slate-700"
                    },
                    "↺ 15s"
                  ),
                  // زر التشغيل والإيقاف الكبير
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: toggleTrack1Play,
                      disabled: !audioSrc,
                      title: isTrack1Playing ? "إيقاف مؤقت" : "تشغيل الاستماع",
                      className: "w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 disabled:opacity-40 text-slate-950 flex items-center justify-center text-2xl font-black shadow-lg shadow-teal-950/60 transition-all active:scale-95"
                    },
                    isTrack1Playing ? "⏸" : "▶"
                  ),
                  // تقديم 15 ثانية
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: function() { handleTrack1Seek(15); },
                      disabled: !audioSrc,
                      title: "تقديم 15 ثانية",
                      className: "px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 flex items-center gap-1 text-xs font-mono font-bold transition-all active:scale-95 border border-slate-700"
                    },
                    "15s ↻"
                  )
                ),

                // زر إضافة علامة فصل / Bookmark عند الموضع الحالي
                currentUser.role === "admin" ? React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: openAddBookmarkModal,
                    title: "إضافة علامة فصل في التراك",
                    className: "px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-bold transition-all border border-teal-500/30 flex items-center gap-1 active:scale-95"
                  },
                  React.createElement("span", null, "🔖"),
                  React.createElement("span", { className: "hidden sm:inline" }, "علامة فصل")
                ) : React.createElement("div", { className: "w-10" })
              )
            ),

            // قائمة علامات الفصول (Bookmarks) داخل التراك
            React.createElement(
              "div",
              { className: "p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3" },
              React.createElement(
                "div",
                { className: "flex items-center justify-between" },
                React.createElement(
                  "h5",
                  { className: "font-black text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2" },
                  React.createElement("span", null, "📑"),
                  React.createElement("span", null, "فصول وعلامات التراك (Bookmarks)"),
                  React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold" }, bookmarks.length)
                ),
                currentUser.role === "admin" ? React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: openAddBookmarkModal,
                    className: "text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  },
                  "+ إضافة علامة"
                ) : null
              ),

              bookmarks.length === 0 ? React.createElement(
                "div",
                { className: "py-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800" },
                React.createElement("p", null, "لا توجد علامات فصول مضافة بعد لهذا التراك."),
                currentUser.role === "admin" ? React.createElement(
                  "p",
                  { className: "mt-1 text-[11px] text-teal-600 dark:text-teal-400" },
                  "يمكنك الضغط على زر (إضافة علامة) لتقسيم التراك إلى الشابتر الأول، الثاني، الخ بالدقائق."
                ) : null
              ) : React.createElement(
                "div",
                { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2" },
                bookmarks.map(function(bm, bIdx) {
                  var isCurrent = track1CurrentTime >= (bm.time || 0) && (
                    bIdx === bookmarks.length - 1 || track1CurrentTime < (bookmarks[bIdx + 1].time || Infinity)
                  );
                  return React.createElement(
                    "div",
                    {
                      key: bIdx,
                      className: "group relative flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs " +
                        (isCurrent
                          ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500/50 text-teal-900 dark:text-teal-100 font-bold shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-400 dark:hover:border-teal-600")
                    },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: function() { seekToBookmark(bm.time); },
                        className: "flex-1 flex items-center gap-2 text-right overflow-hidden"
                      },
                      React.createElement(
                        "span",
                        { className: "px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-[11px] font-bold shrink-0" },
                        formatAudioTime(bm.time)
                      ),
                      React.createElement(
                        "span",
                        { className: "truncate" },
                        bm.title || ("فصل " + (bIdx + 1))
                      ),
                      isCurrent ? React.createElement("span", { className: "text-emerald-500 text-xs shrink-0", title: "جاري الاستماع الآن" }, "🔊") : null
                    ),
                    currentUser.role === "admin" ? React.createElement(
                      "div",
                      { className: "flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-1" },
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: function(e) { e.stopPropagation(); openEditBookmarkModal(bIdx); },
                          className: "p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px]"
                        },
                        "✏️"
                      ),
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: function(e) { e.stopPropagation(); handleDeleteBookmark(bIdx); },
                          className: "p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/40 text-[11px] text-rose-500"
                        },
                        "🗑️"
                      )
                    ) : null
                  );
                })
              )
            )
          );
        })() : (
          // محتوى تبويب: ملخص الكتاب المكتوب
          React.createElement(
            "div",
            { className: "p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
            React.createElement(
              "div",
              { className: "flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2.5" },
                React.createElement("div", { className: "w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg" }, "📖"),
                React.createElement(
                  "div",
                  null,
                  React.createElement("h4", { className: "font-black text-sm sm:text-base text-slate-900 dark:text-white" }, "ملخص الكتاب"),
                  React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400" }, "أهم الأفكار، المفاهيم المحورية، والنتائج المستفادة من الكتاب")
                )
              ),
              React.createElement(
                "div",
                { className: "flex items-center gap-2" },
                activeBook.summaryText ? React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() {
                      navigator.clipboard.writeText(activeBook.summaryText || "");
                      alert("تم نسخ ملخص الكتاب إلى الحافظة ✓");
                    },
                    className: "px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1"
                  },
                  "📋 نسخ"
                ) : null,
                currentUser.role === "admin" ? React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() {
                      setEditSummaryContent(activeBook.summaryText || "");
                      setShowSummaryModal(true);
                    },
                    className: "px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 transition-all flex items-center gap-1"
                  },
                  "✏️ تعديل الملخص"
                ) : null
              )
            ),

            // نص الملخص
            React.createElement(
              "div",
              { className: "prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed text-sm whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 min-h-[140px]" },
              activeBook.summaryText ? activeBook.summaryText : (
                React.createElement(
                  "div",
                  { className: "py-8 text-center text-slate-400 space-y-2" },
                  React.createElement("p", null, "لم يتم كتابة ملخص لهذا الكتاب حتى الآن."),
                  currentUser.role === "admin" ? React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: function() {
                        setEditSummaryContent("");
                        setShowSummaryModal(true);
                      },
                      className: "px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md active:scale-95 inline-flex items-center gap-1.5"
                    },
                    "✍️ إضافة ملخص الآن"
                  ) : null
                )
              )
            )
          )
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

      // شبكة بطاقات الكتب (Book Cover Cards Grid بتصميم شيك ومرتب يسهل التصفح)
      React.createElement(
        "div",
        { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5" },
        books.map(function(b, bIdx) {
          var coverPalettes = [
            "from-emerald-800 via-teal-900 to-slate-900",
            "from-indigo-800 via-purple-900 to-slate-900",
            "from-amber-700 via-stone-800 to-slate-900",
            "from-blue-800 via-cyan-900 to-slate-900",
            "from-rose-800 via-slate-900 to-slate-950"
          ];
          var palette = coverPalettes[bIdx % coverPalettes.length];

          // تنسيق تاريخ الرفع
          var uploadDateStr = "";
          if (b.uploadedAt || b.createdAt) {
            try {
              var d = new Date(b.uploadedAt || b.createdAt);
              uploadDateStr = d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
            } catch (ed) {}
          }

          // استخراج اسم الكاتب بدون لاحقة المترجم إن كانت مدمجة
          var displayAuthor = b.author || "غير محدد";
          var displayTranslator = b.translator || "";
          if (displayAuthor.indexOf(" (ترجمة: ") !== -1) {
            var splitted = displayAuthor.split(" (ترجمة: ");
            displayAuthor = splitted[0];
            if (!displayTranslator && splitted[1]) {
              displayTranslator = splitted[1].replace(")", "");
            }
          }

          return React.createElement(
            "div",
            {
              key: b.id,
              onClick: function() {
                stopAudioPlayback();
                var savedPage = utils.getLocal("counsel_book_page_" + b.id);
                var targetBook = savedPage ? Object.assign({}, b, { currentPage: Number(savedPage) }) : b;
                utils.setLocal("counsel_active_book_id", b.id);
                setActiveBook(targetBook);
              },
              className: "group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-sm hover:shadow-xl hover:border-teal-500/60 dark:hover:border-teal-500/60 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden"
            },

            // كارت الغلاف الأنيق
            React.createElement(
              "div",
              { className: "relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-md mb-2.5 bg-gradient-to-br " + palette },
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
              }) : React.createElement(
                "div",
                { className: "absolute inset-0 p-3 flex flex-col justify-between text-white text-center" },
                React.createElement("div", { className: "text-[10px] text-white/60 font-medium text-right" }, "مرجع معتمد"),
                React.createElement(
                  "div",
                  { className: "space-y-1 px-1 my-auto" },
                  React.createElement("div", { className: "text-3xl" }, "📖"),
                  React.createElement("div", { className: "text-xs font-bold line-clamp-3 leading-snug" }, b.title)
                ),
                React.createElement("div", { className: "text-[10px] text-teal-300/80 truncate border-t border-white/10 pt-1" }, displayAuthor)
              ),

              // تأثير طبقة الظل الخفيفة عند المرور
              React.createElement("div", { className: "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" }),

              // شارة الصفحات في أعلى الكارت
              React.createElement(
                "div",
                { className: "absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-xs border border-white/10" },
                React.createElement("span", null, "📄"),
                React.createElement("span", null, (b.totalPages || 0) + " ص")
              ),

              // أزرار التحكم للأدمن (تعديل وحذف)
              currentUser.role === "admin" && React.createElement(
                "div",
                { className: "absolute top-2 right-2 flex items-center gap-1 z-10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function(e) { handleEditBookClick(e, b); },
                    className: "bg-slate-900/90 hover:bg-teal-600 text-white w-7 h-7 rounded-lg backdrop-blur-xs transition-colors shadow-md flex items-center justify-center text-xs active:scale-90",
                    title: "تعديل بيانات الكتاب"
                  },
                  "✏️"
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function(e) { handleDeleteBook(e, b.id); },
                    className: "bg-slate-900/90 hover:bg-rose-600 text-white w-7 h-7 rounded-lg backdrop-blur-xs transition-colors shadow-md flex items-center justify-center text-xs active:scale-90",
                    title: "حذف الكتاب نهائياً"
                  },
                  "🗑️"
                )
              )
            ),

            // تفاصيل وبيانات الكتاب
            React.createElement(
              "div",
              { className: "space-y-1.5 px-0.5 text-right flex-1 flex flex-col justify-between" },
              React.createElement(
                "div",
                null,
                React.createElement("h4", {
                  className: "font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug",
                  title: b.title
                }, b.title),

                // اسم الكاتب
                React.createElement(
                  "div",
                  { className: "flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-1 truncate" },
                  React.createElement("span", { className: "text-slate-400" }, "✍️"),
                  React.createElement("span", { className: "truncate", title: displayAuthor }, displayAuthor)
                ),

                // اسم المترجم إن وجد
                displayTranslator ? React.createElement(
                  "div",
                  { className: "flex items-center gap-1 text-[10px] text-teal-700 dark:text-teal-400 font-medium truncate mt-0.5" },
                  React.createElement("span", { className: "text-slate-400" }, "🌐"),
                  React.createElement("span", { className: "truncate", title: "ترجمة: " + displayTranslator }, "ترجمة: " + displayTranslator)
                ) : null
              ),

              // الفوتر: تاريخ الرفع وزر الفتح
              React.createElement(
                "div",
                { className: "pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 mt-2" },
                uploadDateStr ? React.createElement(
                  "span",
                  { className: "flex items-center gap-1 text-slate-400", title: "تاريخ رفع الكتاب" },
                  React.createElement("span", null, "📅"),
                  React.createElement("span", null, uploadDateStr)
                ) : React.createElement("span", null, ((b.chapters || []).length || (b.audioChapters || []).length || 0) + " فصول"),
                React.createElement(
                  "span",
                  { className: "text-teal-600 dark:text-teal-400 font-bold group-hover:translate-x-[-2px] transition-transform flex items-center gap-0.5" },
                  React.createElement("span", null, "قراءة"),
                  React.createElement("span", null, "◀")
                )
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

    // نافذة إضافة مرجع جديد (مكون مستقل)
    React.createElement(window.AddBookModal, {
      isOpen: showAddModal,
      isEditing: !!editingBookId,
      onClose: function() { setShowAddModal(false); setEditingBookId(null); },
      isUploading: isUploading,
      uploadStatusText: uploadStatusText,
      isDraggingFile: isDraggingFile,
      setIsDraggingFile: setIsDraggingFile,
      selectedFile: selectedFile,
      setSelectedFile: setSelectedFile,
      handleFileSelect: handleFileSelect,
      processSelectedFile: processSelectedFile,
      handleAutoDetectBookWithAi: handleAutoDetectBookWithAi,
      isAiAnalyzingBook: isAiAnalyzingBook,
      newTitle: newTitle,
      setNewTitle: setNewTitle,
      newAuthor: newAuthor,
      setNewAuthor: setNewAuthor,
      newTranslator: newTranslator,
      setNewTranslator: setNewTranslator,
      newCoverUrl: newCoverUrl,
      setNewCoverUrl: setNewCoverUrl,
      selectedCoverFile: selectedCoverFile,
      setSelectedCoverFile: setSelectedCoverFile,
      newDriveUrl: newDriveUrl,
      setNewDriveUrl: setNewDriveUrl,
      setSelectedAudioFile: setSelectedAudioFile,
      newTrack1Url: newTrack1Url,
      setNewTrack1Url: setNewTrack1Url,
      onSubmit: handleAddBook
    }),

    // نافذة تعديل غلاف الكتاب الحالي (مكون مستقل)
    React.createElement(window.BookCoverModal, {
      isOpen: showCoverEditModal,
      onClose: function() { setShowCoverEditModal(false); },
      selectedCoverFile: selectedCoverFile,
      setSelectedCoverFile: setSelectedCoverFile,
      editingCoverUrl: editingCoverUrl,
      setEditingCoverUrl: setEditingCoverUrl,
      isUploadingCover: isUploadingCover,
      onSave: async function() {
        setIsUploadingCover(true);
        var finalUrl = utils.getDriveImageUrl(editingCoverUrl.trim());
        if (selectedCoverFile) {
          var up = await uploadCoverImage(selectedCoverFile);
          if (up) finalUrl = utils.getDriveImageUrl(up);
        }
        await handleSaveCurrentBookCover(finalUrl);
        setIsUploadingCover(false);
      }
    }),
    React.createElement(window.BookSummaryModal, {
      isOpen: showSummaryModal,
      onClose: function() { setShowSummaryModal(false); },
      editSummaryContent: editSummaryContent,
      setEditSummaryContent: setEditSummaryContent,
      onSave: handleSaveSummary
    }),

 // Modal: إضافة أو تعديل فصل صوتي
    // نافذة إضافة أو تعديل فصل صوتي (مكون مستقل)
    React.createElement(window.ChapterEditModal, {
      isOpen: showChapterModal,
      onClose: function() { setShowChapterModal(false); },
      editingChapter: editingChapter,
      chapTitle: chapTitle,
      setChapTitle: setChapTitle,
      chapStartPage: chapStartPage,
      setChapStartPage: setChapStartPage,
      chapAudioUrl: chapAudioUrl,
      setChapAudioUrl: setChapAudioUrl,
      setChapAudioFile: setChapAudioFile,
      chapText: chapText,
      setChapText: setChapText,
      handleChapterTextFileChange: handleChapterTextFileChange,
      isSavingChapter: isSavingChapter,
      chapterSaveStatus: chapterSaveStatus,
      onSubmit: handleSaveChapterSubmit
    }),
    // نافذة ضبط استخراج النص للفصل بالذكاء الاصطناعي مع استثناء الصفحات
    React.createElement(window.ChapterExtractConfigModal, {
      isOpen: !!configuringChapterForExtract,
      chap: configuringChapterForExtract,
      onClose: function() { setConfiguringChapterForExtract(null); },
      onConfirm: executeExtractChapterText,
      totalPages: pdfDoc ? pdfDoc.numPages : 500
    }),
    // نافذة عرض النص المفرغ للفصل (مكون مستقل يدعم التحكم بحجم الخط للموبايل)
    React.createElement(window.ChapterTextViewerModal, {
      viewingChapterText: viewingChapterText,
      onClose: function() { setViewingChapterText(null); },
      fontSize: chapterTextFontSize,
      onFontSizeChange: setChapterTextFontSize
    })
  );
};




