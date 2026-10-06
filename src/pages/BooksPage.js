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

  // التبويب النشط لمحتوى الكتاب الدراسي (تراك 1 الشامل أو ملخص الكتاب)
  var [bookStudyTab, setBookStudyTab] = React.useState("track1");

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

  // مشغل القراءة الصوتية الآلية المباشرة لصفحات الكتاب (Smart Auto Reader)
  var [isTtsReading, setIsTtsReading] = React.useState(false);
  var [isTtsPaused, setIsTtsPaused] = React.useState(false);
  var [ttsSpeed, setTtsSpeed] = React.useState(1.0);
  var [ttsStatusMsg, setTtsStatusMsg] = React.useState("");
  var isTtsActiveRef = React.useRef(false);
  var ttsAudioObjRef = React.useRef(null);


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
      var allAudios = document.querySelectorAll("audio");
      allAudios.forEach(function(a) { a.pause(); });
      if (window.speechSynthesis) {
        isTtsActiveRef.current = false;
        window.speechSynthesis.cancel();
        setIsTtsReading(false);
        setIsTtsPaused(false);
      }
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
          renderPdfPage(loadedDoc, activeBook ? (activeBook.currentPage || 1) : 1);
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

  // دالة تشغيل النطق العربي (باللهجة المصرية / العربية الفصحى) عبر المتصفح
  var speakArabicTextChunks = function(text, onFinished) {
    if (!text || !text.trim()) {
      if (typeof onFinished === "function") onFinished();
      return;
    }

    if (!window.speechSynthesis) {
      alert("متصفحك لا يدعم تحويل النص إلى كلام.");
      if (typeof onFinished === "function") onFinished();
      return;
    }

    window.speechSynthesis.cancel();

    // استخراج الأصوات المتاحة والبحث عن صوت مصري (ar-EG) أو صوت عربي (ar)
    var allVoices = window.speechSynthesis.getVoices() || [];
    var egVoice = allVoices.find(function(v) {
      var l = (v.lang || "").toLowerCase();
      var n = (v.name || "").toLowerCase();
      return l === "ar-eg" || l.includes("eg") || n.includes("egypt") || n.includes("salma") || n.includes("shakir");
    });
    var anyArVoice = egVoice || allVoices.find(function(v) {
      var l = (v.lang || "").toLowerCase();
      var n = (v.name || "").toLowerCase();
      return l.startsWith("ar") || l.includes("arabic") || n.includes("arabic") || n.includes("عربي") || n.includes("maged") || n.includes("tarik");
    });

    // تقسيم النص العربي لجمل قصيرة حتى لا يتوقف المتصفح أثناء قراءة الصفحات الطويلة
    var sentences = text.match(/[^.،؟!\n]+[.،؟!\n]?/g) || [text];
    var chunks = [];
    var current = "";

    sentences.forEach(function(s) {
      var trimmed = s.trim();
      if (!trimmed) return;
      if ((current + " " + trimmed).length <= 180) {
        current = current ? (current + " " + trimmed) : trimmed;
      } else {
        if (current) chunks.push(current);
        current = trimmed;
      }
    });
    if (current) chunks.push(current);

    if (chunks.length === 0) {
      if (typeof onFinished === "function") onFinished();
      return;
    }

    var chunkIdx = 0;
    var speakNext = function() {
      if (!isTtsActiveRef.current || chunkIdx >= chunks.length) {
        if (isTtsActiveRef.current && typeof onFinished === "function") {
          onFinished();
        }
        return;
      }

      var textChunk = chunks[chunkIdx];
      chunkIdx++;

      var utterance = new SpeechSynthesisUtterance(textChunk);
      utterance.rate = ttsSpeed;

      // ضبط اللهجة المصرية إن وجدت أو العربية الفصحى
      if (anyArVoice) {
        utterance.voice = anyArVoice;
        utterance.lang = anyArVoice.lang;
      } else {
        utterance.lang = "ar-EG"; // طلب اللهجة المصرية افتراضياً من المتصفح
      }

      utterance.onend = function() {
        if (isTtsActiveRef.current) {
          speakNext();
        }
      };

      utterance.onerror = function(err) {
        console.warn("Speech utterance error:", err);
        if (isTtsActiveRef.current) {
          speakNext();
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  };

  // استخراج النص من صفحة الـ PDF وقراءته آلياً مع الانتقال التلقائي للصفحة التالية
  var readPageTextWithTts = function(doc, pageNum) {
    if (!doc) {
      alert("يرجى الانتظار حتى اكتمال تحميل ملف الكتاب.");
      return;
    }

    var maxP = getMaxPages();
    if (pageNum > maxP) {
      setTtsStatusMsg("تم الوصول لنهاية الكتاب بنجاح ✓");
      setIsTtsReading(false);
      setIsTtsPaused(false);
      isTtsActiveRef.current = false;
      return;
    }

    setTtsStatusMsg("جاري تجهيز النص العربي لصفحة " + pageNum + "...");
    doc.getPage(pageNum).then(function(page) {
      page.getTextContent().then(function(textContent) {
        if (!isTtsActiveRef.current) return;

        var text = (textContent.items || []).map(function(item) { return item.str; }).join(" ").trim();
        text = text.replace(/\s+/g, " ");

        if (!text || text.length < 5) {
          setTtsStatusMsg("صفحة " + pageNum + " صورة/خالية، جاري الانتقال للصفحة التالية...");
          setTimeout(function() {
            if (isTtsActiveRef.current) {
              var nextP = pageNum + 1;
              handlePageChange(nextP);
              readPageTextWithTts(doc, nextP);
            }
          }, 1500);
          return;
        }

        // إيقاف أي أصوات جارية حالياً
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (ttsAudioObjRef.current) {
          try { ttsAudioObjRef.current.pause(); } catch (e) {}
        }

        setIsTtsReading(true);
        setIsTtsPaused(false);
        setTtsStatusMsg("جاري القراءة بالعربية الفصحى (صفحة " + pageNum + " من " + maxP + ") 🔊");

        // تشغيل النص العربي بالكامل بصوت عربي 100%
        speakArabicTextChunks(text, function() {
          if (!isTtsActiveRef.current) return;
          var nextP = pageNum + 1;
          if (nextP <= maxP) {
            handlePageChange(nextP);
            setTtsStatusMsg("تمت الصفحة! جاري الانتقال لصفحة " + nextP + "...");
            setTimeout(function() {
              if (isTtsActiveRef.current) {
                readPageTextWithTts(doc, nextP);
              }
            }, 600);
          } else {
            setIsTtsReading(false);
            setIsTtsPaused(false);
            isTtsActiveRef.current = false;
            setTtsStatusMsg("تم إنهاء قراءة الكتاب بالكامل ✓");
          }
        });
      }).catch(function(err) {
        console.warn("getTextContent error:", err);
        setTtsStatusMsg("تعذر استخراج نص الصفحة " + pageNum);
      });
    }).catch(function(err) {
      console.warn("getPage error in TTS:", err);
    });
  };

  // زر بدء / إيقاف القراءة الصوتية
  var toggleTtsAutoReader = function() {
    if (isTtsReading) {
      if (isTtsPaused) {
        if (ttsAudioObjRef.current) {
          ttsAudioObjRef.current.play().catch(function() {});
        } else if (window.speechSynthesis) {
          window.speechSynthesis.resume();
        }
        setIsTtsPaused(false);
        setTtsStatusMsg("تم استئناف القراءة الصوتية");
      } else {
        if (ttsAudioObjRef.current) {
          try { ttsAudioObjRef.current.pause(); } catch (e) {}
        }
        if (window.speechSynthesis) {
          window.speechSynthesis.pause();
        }
        setIsTtsPaused(true);
        setTtsStatusMsg("تم الإيقاف المؤقت للقراءة");
      }
    } else {
      if (!pdfDoc) {
        if (activeBook && activeBook.driveUrl) {
          setTtsStatusMsg("جاري تحميل ملف الكتاب للبدء في القراءة الصوتية... ⏳");
          loadPdfFromUrl(activeBook.driveUrl);
          alert("جاري جلب صفحات الكتاب الآن، بمجرد ظهورها اضغط على 'اقرأ لي الكتاب' لتبدأ القراءة الصوتية مباشرة ✓");
        } else {
          alert("يرجى التأكد من إضافة رابط الـ PDF للكتاب أولاً.");
        }
        return;
      }
      if (track1AudioRef.current) {
        track1AudioRef.current.pause();
        setIsTrack1Playing(false);
      }
      isTtsActiveRef.current = true;
      setIsTtsReading(true);
      setIsTtsPaused(false);
      var currentP = (activeBook && activeBook.currentPage) ? Number(activeBook.currentPage) : 1;
      readPageTextWithTts(pdfDoc, currentP);
    }
  };

  // إيقاف القارئ الصوتي تماماً
  var stopTtsReaderCompletely = function() {
    isTtsActiveRef.current = false;
    if (ttsAudioObjRef.current) {
      try { ttsAudioObjRef.current.pause(); } catch (e) {}
      ttsAudioObjRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsTtsReading(false);
    setIsTtsPaused(false);
    setTtsStatusMsg("");
  };

  // تغيير سرعة القراءة الصوتية الآلية
  var handleChangeTtsSpeed = function() {
    var speeds = [1.0, 1.25, 1.5, 0.9];
    var nextIdx = (speeds.indexOf(ttsSpeed) + 1) % speeds.length;
    var newSpeed = speeds[nextIdx];
    setTtsSpeed(newSpeed);
    if (ttsAudioObjRef.current) {
      ttsAudioObjRef.current.playbackRate = newSpeed;
    }
    if (isTtsReading && !isTtsPaused && pdfDoc) {
      var currentP = (activeBook && activeBook.currentPage) ? Number(activeBook.currentPage) : 1;
      readPageTextWithTts(pdfDoc, currentP);
    }
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

            // كبسولة القارئ الصوتي الآلي التلقائي لصفحات الكتاب (Hands-Free Smart Auto Reader)
            React.createElement(
              "div",
              {
                className: "flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs transition-all " +
                  (isTtsReading
                    ? "bg-teal-950/80 border-teal-500/70 text-teal-200 shadow-lg shadow-teal-950/50"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600")
              },
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: toggleTtsAutoReader,
                  title: isTtsReading ? (isTtsPaused ? "استئناف القراءة الصوتية" : "إيقاف مؤقت للقراءة الصوتية") : "بدء قراءة الكتاب بصوت مسموع تلقائياً مع تقليب الصفحات",
                  className: "flex items-center gap-1.5 font-bold active:scale-95 transition-all text-xs"
                },
                React.createElement("span", { className: isTtsReading && !isTtsPaused ? "animate-pulse text-sm" : "text-sm" }, isTtsReading ? (isTtsPaused ? "▶" : "⏸") : "🔊"),
                React.createElement("span", null, isTtsReading ? (isTtsPaused ? "استئناف" : "إيقاف مؤقت") : "اقرأ لي الكتاب مسموعاً")
              ),
              isTtsReading ? React.createElement(
                "div",
                { className: "flex items-center gap-1 border-r border-teal-800 pr-1 mr-1" },
                // زر تغيير السرعة
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: handleChangeTtsSpeed,
                    title: "تغيير سرعة القراءة",
                    className: "px-1.5 py-0.5 rounded bg-teal-900 hover:bg-teal-800 text-[11px] font-mono font-bold text-teal-300 transition-all"
                  },
                  ttsSpeed + "x"
                ),
                // زر إيقاف القارئ تماماً
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: stopTtsReaderCompletely,
                    title: "إيقاف القارئ الآلي تماماً",
                    className: "px-1.5 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 text-[11px] font-bold transition-all"
                  },
                  "✕"
                )
              ) : null
            ),

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

            // زر فتح ملف PDF من الجهاز مباشرة لتخطي أي قيود سحابية وللقراءة الصوتية فوراً
            React.createElement(
              "label",
              {
                title: "اختر ملف الكتاب من جهازك للقراءة الصوتية التلقائية وحفظه بدون نت",
                className: "px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm cursor-pointer active:scale-95 transition-all"
              },
              React.createElement("span", null, "📂"),
              React.createElement("span", { className: "hidden md:inline" }, "فتح ملف PDF"),
              React.createElement("input", {
                type: "file",
                accept: "application/pdf",
                className: "hidden",
                onChange: function(e) {
                  var file = e.target.files && e.target.files[0];
                  if (!file) return;
                  var reader = new FileReader();
                  reader.onload = function(evt) {
                    var buffer = evt.target.result;
                    loadPdfFromData(buffer);
                    if (activeBook && activeBook.id) {
                      utils.saveOfflinePdf(activeBook.id, buffer).then(function() {
                        setIsSavedOffline(true);
                        setOfflineSaveMsg("تم حفظ الكتاب في جهازك بنجاح! متاح للقراءة والاستماع دائماً بدون إنترنت ✓");
                        setTimeout(function() { setOfflineSaveMsg(""); }, 4000);
                      }).catch(function() {});
                    }
                  };
                  reader.readAsArrayBuffer(file);
                }
              })
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

        // شريط تحكم القارئ الصوتي المتطور (Audio Player Bar: Seek Bar, Speed, Next/Prev Page, Voice)
        (isTtsReading || isTtsPaused) && React.createElement(
          "div",
          { className: "p-3 rounded-2xl bg-slate-950/95 border border-teal-500/40 text-white space-y-2.5 shadow-xl shrink-0 animate-fade-in" },
          React.createElement(
            "div",
            { className: "flex flex-wrap items-center justify-between gap-2" },
            React.createElement(
              "div",
              { className: "flex items-center gap-2" },
              React.createElement("span", { className: isTtsReading && !isTtsPaused ? "animate-pulse text-teal-400 text-base" : "text-slate-400 text-base" }, "🎙️"),
              React.createElement(
                "span",
                { className: "text-xs font-bold text-teal-200" },
                ttsStatusMsg || ("قراءة صوتية لصفحة " + (activeBook.currentPage || 1))
              )
            ),
            React.createElement(
              "span",
              { className: "px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1 shadow-sm" },
              React.createElement("span", null, "🟢"),
              React.createElement("span", null, "صوت عربي / مصري")
            )
          ),

          // شريط التنقل الزمني والصفحات (Seek Bar for Pages)
          React.createElement(
            "div",
            { className: "space-y-1" },
            React.createElement(
              "div",
              { className: "flex items-center justify-between text-[11px] font-mono text-slate-400 px-1" },
              React.createElement("span", { className: "text-teal-400 font-bold" }, "صفحة " + (activeBook.currentPage || 1)),
              React.createElement("span", null, "من إجمالي " + getMaxPages() + " صفحة")
            ),
            React.createElement("input", {
              type: "range",
              min: 1,
              max: getMaxPages(),
              value: activeBook.currentPage || 1,
              onChange: function(e) {
                var p = parseInt(e.target.value) || 1;
                handlePageChange(p);
                if (pdfDoc && isTtsReading) {
                  readPageTextWithTts(pdfDoc, p);
                }
              },
              className: "w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
            })
          ),

          // أزرار التحكم: -1 صفحة، تشغيل/إيقاف، +1 صفحة، والسرعات
          React.createElement(
            "div",
            { className: "flex items-center justify-between gap-2 pt-1" },
            React.createElement(
              "div",
              { className: "flex items-center gap-2" },
              // زر الصفحة السابقة
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() {
                    var prevP = Math.max(1, (activeBook.currentPage || 1) - 1);
                    handlePageChange(prevP);
                    if (pdfDoc && isTtsReading) readPageTextWithTts(pdfDoc, prevP);
                  },
                  disabled: (activeBook.currentPage || 1) <= 1,
                  title: "الصفحة السابقة",
                  className: "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1 active:scale-95 transition-all"
                },
                "◀ الصفحة السابقة"
              ),
              // زر تشغيل / إيقاف مؤقت
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: toggleTtsAutoReader,
                  className: "px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                },
                React.createElement("span", null, isTtsPaused ? "▶" : "⏸"),
                React.createElement("span", null, isTtsPaused ? "استئناف" : "إيقاف مؤقت")
              ),
              // زر الصفحة التالية
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() {
                    var nextP = Math.min(getMaxPages(), (activeBook.currentPage || 1) + 1);
                    handlePageChange(nextP);
                    if (pdfDoc && isTtsReading) readPageTextWithTts(pdfDoc, nextP);
                  },
                  disabled: (activeBook.currentPage || 1) >= getMaxPages(),
                  title: "الصفحة التالية",
                  className: "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1 active:scale-95 transition-all"
                },
                "الصفحة التالية ▶"
              )
            ),

            // أزرار السرعة وإلغاء القراءة
            React.createElement(
              "div",
              { className: "flex items-center gap-2" },
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: handleChangeTtsSpeed,
                  title: "تغيير سرعة الصوت",
                  className: "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-mono font-bold text-xs border border-slate-700 active:scale-95 transition-all"
                },
                "السرعة: " + ttsSpeed + "x"
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: stopTtsReaderCompletely,
                  title: "إنهاء القراءة الصوتية تماماً",
                  className: "px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-bold text-xs border border-rose-800/80 active:scale-95 transition-all"
                },
                "إغلاق المشغل ✕"
              )
            )
          )
        ),

        ttsStatusMsg && !(isTtsReading || isTtsPaused) && React.createElement(
          "div",
          { className: "p-2.5 rounded-xl bg-teal-950/90 text-teal-200 border border-teal-700/80 text-center text-xs font-bold flex flex-wrap items-center justify-center gap-2 shrink-0 animate-fade-in shadow-md" },
          React.createElement("span", null, "🎙️"),
          React.createElement("span", null, ttsStatusMsg),
          !pdfDoc ? React.createElement(
            "label",
            {
              className: "inline-flex items-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg cursor-pointer text-xs font-extrabold shadow active:scale-95 transition-all ml-1"
            },
            React.createElement("span", null, "📂"),
            React.createElement("span", null, "اختر ملف الـ PDF الآن"),
            React.createElement("input", {
              type: "file",
              accept: "application/pdf",
              className: "hidden",
              onChange: function(e) {
                var file = e.target.files && e.target.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function(evt) {
                  var buffer = evt.target.result;
                  loadPdfFromData(buffer);
                  if (activeBook && activeBook.id) {
                    utils.saveOfflinePdf(activeBook.id, buffer).then(function() {
                      setIsSavedOffline(true);
                      setOfflineSaveMsg("تم حفظ الكتاب في جهازك بنجاح! متاح للقراءة والاستماع دائماً بدون إنترنت ✓");
                      setTimeout(function() { setOfflineSaveMsg(""); }, 4000);
                    }).catch(function() {});
                  }
                };
                reader.readAsArrayBuffer(file);
              }
            })
          ) : null
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

      // قسم دراسة ومراجعة الكتاب (زرارين رئيسيين: تراك 1 والملخص)
      React.createElement(
        "div",
        { className: "space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800" },

        // شريط التبديل بين الزرارين الرئيسيين
        React.createElement(
          "div",
          { className: "flex items-center justify-center p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 max-w-md mx-auto shadow-inner border border-slate-200/60 dark:border-slate-700/60" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setBookStudyTab("track1"); },
              className: "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all " +
                (bookStudyTab === "track1"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-md font-black scale-[1.02]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")
            },
            React.createElement("span", { className: "text-base" }, "🎙️"),
            React.createElement("span", null, "تراك 1 (البودكاست الشامل)"),
            activeBook.audioUrl ? React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }) : null
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setBookStudyTab("summary"); },
              className: "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all " +
                (bookStudyTab === "summary"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md font-black scale-[1.02]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")
            },
            React.createElement("span", { className: "text-base" }, "📖"),
            React.createElement("span", null, "ملخص الكتاب")
          )
        ),

        // محتوى تبويب: تراك 1 (البودكاست المتواصل مع استئناف الاستماع والعلامات المرجعية)
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
      ),

      // Modal 1: تعديل رابط تراك 1
      showTrackModal ? React.createElement(
        "div",
        { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4", onClick: function() { setShowTrackModal(false); } },
        React.createElement(
          "div",
          { className: "bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4", onClick: function(e) { e.stopPropagation(); } },
          React.createElement(
            "div",
            { className: "flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800" },
            React.createElement("h3", { className: "font-black text-base text-slate-800 dark:text-white flex items-center gap-2" }, "🎙️ رابط تراك 1 (NotebookLM)"),
            React.createElement("button", { type: "button", onClick: function() { setShowTrackModal(false); }, className: "text-slate-400 hover:text-slate-600 text-lg" }, "✕")
          ),
          React.createElement(
            "div",
            { className: "space-y-2" },
            React.createElement("label", { className: "block text-xs font-bold text-slate-600 dark:text-slate-300" }, "رابط ملف الصوت (Google Drive أو MP3 مباشر):"),
            React.createElement("input", {
              type: "url",
              value: editTrackUrl,
              onChange: function(e) { setEditTrackUrl(e.target.value); },
              placeholder: "https://drive.google.com/file/d/... أو رابط صوت مباشر",
              className: "w-full px-3 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
            }),
            React.createElement("p", { className: "text-[11px] text-slate-400" }, "💡 يدعم روابط Google Drive تلقائياً، والملفات المباشرة على الاستضافة أو السيرفر.")
          ),
          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" },
            React.createElement("button", { type: "button", onClick: function() { setShowTrackModal(false); }, className: "px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" }, "إلغاء"),
            React.createElement("button", { type: "button", onClick: handleSaveTrackAudio, className: "px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md active:scale-95" }, "حفظ الرابط ✓")
          )
        )
      ) : null,

      // Modal 2: إضافة / تعديل Bookmark
      showBookmarkModal ? React.createElement(
        "div",
        { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4", onClick: function() { setShowBookmarkModal(false); } },
        React.createElement(
          "div",
          { className: "bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4", onClick: function(e) { e.stopPropagation(); } },
          React.createElement(
            "div",
            { className: "flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800" },
            React.createElement("h3", { className: "font-black text-base text-slate-800 dark:text-white flex items-center gap-2" },
              editingBookmarkIdx !== null ? "✏️ تعديل علامة الفصل" : "🔖 إضافة علامة فصل جديدة"
            ),
            React.createElement("button", { type: "button", onClick: function() { setShowBookmarkModal(false); }, className: "text-slate-400 hover:text-slate-600 text-lg" }, "✕")
          ),
          React.createElement(
            "div",
            { className: "space-y-3 text-xs" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block font-bold text-slate-600 dark:text-slate-300 mb-1" }, "عنوان الفصل / الجزء:"),
              React.createElement("input", {
                type: "text",
                value: bookmarkTitle,
                onChange: function(e) { setBookmarkTitle(e.target.value); },
                placeholder: "مثال: الشابتر الأول - المقدمة والأفكار الرئيسية",
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              })
            ),
            React.createElement(
              "div",
              null,
              React.createElement("div", { className: "flex items-center justify-between mb-1" },
                React.createElement("label", { className: "font-bold text-slate-600 dark:text-slate-300" }, "التوقيت الزمني (MM:SS):"),
                React.createElement("button", {
                  type: "button",
                  onClick: function() { setBookmarkTimeStr(formatAudioTime(track1CurrentTime)); },
                  className: "text-[11px] text-teal-600 dark:text-teal-400 font-bold hover:underline"
                }, "⏱️ وقت المشغل الحالي (" + formatAudioTime(track1CurrentTime) + ")")
              ),
              React.createElement("input", {
                type: "text",
                value: bookmarkTimeStr,
                onChange: function(e) { setBookmarkTimeStr(e.target.value); },
                placeholder: "04:15",
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono text-center text-sm font-bold"
              })
            )
          ),
          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" },
            React.createElement("button", { type: "button", onClick: function() { setShowBookmarkModal(false); }, className: "px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" }, "إلغاء"),
            React.createElement("button", { type: "button", onClick: handleSaveBookmark, className: "px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md active:scale-95" }, "حفظ العلامة ✓")
          )
        )
      ) : null,

      // Modal 3: تعديل ملخص الكتاب المكتوب
      showSummaryModal ? React.createElement(
        "div",
        { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4", onClick: function() { setShowSummaryModal(false); } },
        React.createElement(
          "div",
          { className: "bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col", onClick: function(e) { e.stopPropagation(); } },
          React.createElement(
            "div",
            { className: "flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800" },
            React.createElement("h3", { className: "font-black text-base text-slate-800 dark:text-white flex items-center gap-2" }, "📖 تحرير ملخص الكتاب"),
            React.createElement("button", { type: "button", onClick: function() { setShowSummaryModal(false); }, className: "text-slate-400 hover:text-slate-600 text-lg" }, "✕")
          ),
          React.createElement(
            "div",
            { className: "flex-1 overflow-y-auto space-y-2 text-xs" },
            React.createElement("label", { className: "block font-bold text-slate-600 dark:text-slate-300" }, "نص ملخص الكتاب الكامل (المقدمة، الفصول، الأفكار الجوهرية):"),
            React.createElement("textarea", {
              rows: 14,
              value: editSummaryContent,
              onChange: function(e) { setEditSummaryContent(e.target.value); },
              placeholder: "اكتب أو الصق ملخص الكتاب هنا...",
              className: "w-full p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-sans"
            })
          ),
          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0" },
            React.createElement("button", { type: "button", onClick: function() { setShowSummaryModal(false); }, className: "px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" }, "إلغاء"),
            React.createElement("button", { type: "button", onClick: handleSaveSummary, className: "px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95" }, "حفظ الملخص ✓")
          )
        )
      ) : null
    )
  );
};
