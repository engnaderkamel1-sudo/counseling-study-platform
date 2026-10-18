// المكون الرئيسي App.js مع دمج نظام التقاط وبلاغات الأعطال
function App() {
  var utils = window.APP_UTILS;
  var cfg = window.APP_CONFIG;
  var cloud = window.CloudSyncService;

  var [showSplash, setShowSplash] = React.useState(true);

  var [activeTab, setActiveTab] = React.useState(function() {
    var hash = (window.location.hash || "").replace("#", "").trim();
    var saved = utils.getLocal("counsel_active_tab");
    var validTabs = ["lectures", "books", "student_guide", "guide", "curriculum", "notes", "tasks", "summary_podcast", "users_admin", "users", "error_reports", "errors", "settings", "updates"];
    if (hash === "guide") hash = "student_guide";
    if (hash && validTabs.indexOf(hash) !== -1) return hash;
    if (saved === "guide") saved = "student_guide";
    if (saved && validTabs.indexOf(saved) !== -1) return saved;
    return "lectures";
  });

  React.useEffect(function() {
    utils.setLocal("counsel_active_tab", activeTab);
    if (window.location.hash !== "#" + activeTab) {
      try {
        history.replaceState(null, "", "#" + activeTab);
      } catch (e) {
        window.location.hash = activeTab;
      }
    }
  }, [activeTab]);

  var [hasVisitedBooks, setHasVisitedBooks] = React.useState(function() {
    return activeTab === "books";
  });
  var [hasVisitedLectures, setHasVisitedLectures] = React.useState(function() {
    return activeTab === "lectures";
  });

  React.useEffect(function() {
    if (activeTab === "books") setHasVisitedBooks(true);
    if (activeTab === "lectures") setHasVisitedLectures(true);
  }, [activeTab]);

  var [floatingAudio, setFloatingAudio] = React.useState(null);
  var [lastAudioRecord, setLastAudioRecord] = React.useState(function() {
    return (utils && utils.resolveLastAudioRecord) ? utils.resolveLastAudioRecord() : null;
  });
  var [isTopResumeDismissed, setIsTopResumeDismissed] = React.useState(false);
  var [isLastAudioDismissed, setIsLastAudioDismissed] = React.useState(false);

  var handleGlobalResumeAudio = function() {
    var record = lastAudioRecord || (utils && utils.resolveLastAudioRecord ? utils.resolveLastAudioRecord() : null);
    if (!record || !record.bookId) return;

    // استخراج رابط البث الصوتي الفوري لتشغيله في نفس اللحظة عبر إيماءة نقرة المستخدم (User Gesture)
    var streamUrl = "";
    if (record.chapterAudioUrl) {
      streamUrl = (utils && utils.getAudioStreamUrl) ? utils.getAudioStreamUrl(record.chapterAudioUrl) : record.chapterAudioUrl;
    }
    if (!streamUrl) {
      var booksList = (utils && utils.getLocal) ? utils.getLocal(cfg.storageKeys.books, []) : [];
      var targetBook = Array.isArray(booksList) ? booksList.find(function(b) { return b && b.id === record.bookId; }) : null;
      var cachedBook = (utils && utils.getLocal) ? utils.getLocal("counsel_book_data_" + record.bookId) : null;
      if (cachedBook) targetBook = Object.assign({}, targetBook || {}, cachedBook);
      if (targetBook) {
        if (record.type === "track1") {
          streamUrl = (utils && utils.getAudioStreamUrl) ? utils.getAudioStreamUrl(targetBook.audioTrack1Url) : targetBook.audioTrack1Url;
        } else if (targetBook.audioChapters) {
          var ch = targetBook.audioChapters.find(function(c) { return c && c.id === record.chapterId; });
          if (ch && ch.audioUrl) {
            streamUrl = (utils && utils.getAudioStreamUrl) ? utils.getAudioStreamUrl(ch.audioUrl) : ch.audioUrl;
          }
        }
      }
    }

    // التشغيل الفوري المباشر على العنصر الصوتي الدائم للاحتفاظ بتصريح المتصفح
    var audio = (utils && utils.getPersistentAudioElement) ? utils.getPersistentAudioElement() : null;
    if (audio) {
      try {
        if (streamUrl) {
          var isSameSrc = audio.src && (audio.src === streamUrl || audio.src.endsWith(streamUrl));
          if (!isSameSrc) {
            audio.src = streamUrl;
          }
          if (record.position && record.position > 0) {
            if (audio.readyState >= 1) {
              try { audio.currentTime = record.position; } catch (e) {}
            } else {
              var onMeta = function() {
                audio.removeEventListener("loadedmetadata", onMeta);
                try { audio.currentTime = record.position; } catch (e) {}
              };
              audio.addEventListener("loadedmetadata", onMeta);
            }
          }
        }
        var p = audio.play();
        if (p && typeof p.catch === "function") {
          p.catch(function(err) {
            console.warn("Immediate gesture play warning:", err);
          });
        }
      } catch (errSync) {
        console.warn("Immediate audio setup warning:", errSync);
      }
    }

    try {
      localStorage.setItem("counsel_auto_resume_audio", JSON.stringify(record));
      localStorage.setItem("counsel_active_book_id", record.bookId);
    } catch (e) {}
    window.__PENDING_AUTO_RESUME_AUDIO = Object.assign({}, record);
    setHasVisitedBooks(true);
    setActiveTab("books");
    var dispatchTrigger = function() {
      try { window.dispatchEvent(new Event("counsel_trigger_resume_audio")); } catch (e) {}
    };
    dispatchTrigger();
    setTimeout(dispatchTrigger, 60);
    setTimeout(dispatchTrigger, 180);
    setTimeout(dispatchTrigger, 450);
  };

  React.useEffect(function() {
    var updateAudioState = function() {
      if (window.__ACTIVE_PLAYING_AUDIO) {
        setFloatingAudio(Object.assign({}, window.__ACTIVE_PLAYING_AUDIO));
      } else {
        setFloatingAudio(null);
      }
      try {
        var rec = (utils && utils.resolveLastAudioRecord) ? utils.resolveLastAudioRecord() : null;
        setLastAudioRecord(rec);
      } catch (e) {}
    };
    window.addEventListener("counsel_audio_state_change", updateAudioState);
    return function() {
      window.removeEventListener("counsel_audio_state_change", updateAudioState);
    };
  }, []);

  // تنظيف فوري ومضمون عند إقلاع التطبيق لأي مخلفات لكتب محذوفة (Zero Ghost Books)
  React.useEffect(function() {
    try {
      localStorage.removeItem("counsel_book_data_book-1791664075112");
      localStorage.removeItem("counsel_book_page_book-1791664075112");
      var rawB = localStorage.getItem("counsel_books_data");
      if (rawB) {
        var parsed = JSON.parse(rawB);
        if (Array.isArray(parsed)) {
          var cleaned = parsed.filter(function(b) {
            if (!b) return false;
            var id = String(b.id || "").trim();
            var title = String(b.title || "").trim();
            return id !== "book-1791664075112" && title !== "تتت" && title !== "ت ت ت" && title !== "ت ت" && !b.isDeleted;
          });
          if (cleaned.length !== parsed.length) {
            localStorage.setItem("counsel_books_data", JSON.stringify(cleaned));
          }
        }
      }
    } catch (e) {}
  }, []);

  React.useEffect(function() {
    var handleHash = function() {
      var h = (window.location.hash || "").replace("#", "").trim();
      if (h && h !== activeTab) {
        setActiveTab(h);
      }
    };
    window.addEventListener("hashchange", handleHash);
    return function() { window.removeEventListener("hashchange", handleHash); };
  }, [activeTab]);
  var [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  var [isAuthOpen, setIsAuthOpen] = React.useState(false);
  var [isErrorReportOpen, setIsErrorReportOpen] = React.useState(false);
  var [isFeatureRequestOpen, setIsFeatureRequestOpen] = React.useState(false);
  var [isRecycleBinOpen, setIsRecycleBinOpen] = React.useState(false);
  var [isNotificationCenterOpen, setIsNotificationCenterOpen] = React.useState(false);
  var [notificationsList, setNotificationsList] = React.useState([]);
  var [readNotifIds, setReadNotifIds] = React.useState(function() {
    return utils.getLocal("counsel_read_notif_ids", []);
  });
  var [dismissedNotifIds, setDismissedNotifIds] = React.useState(function() {
    return utils.getLocal("counsel_dismissed_notifs", []);
  });

  var [activeToast, setActiveToast] = React.useState(null);

  var [appLectures, setAppLectures] = React.useState(function() {
    return utils.getLocal(cfg.storageKeys.lectures, []);
  });
  var [isTopZoomDismissed, setIsTopZoomDismissed] = React.useState(false);

  // المزامنة الحية لقائمة المحاضرات من السحابة لضمان دقة منبهات الزوم
  React.useEffect(function() {
    var cloudService = cloud || window.CloudSyncService;
    if (cloudService && typeof cloudService.subscribeLectures === "function") {
      var unsubscribe = cloudService.subscribeLectures(function(cloudList) {
        if (cloudList && Array.isArray(cloudList)) {
          setAppLectures(cloudList);
          utils.setLocal(cfg.storageKeys.lectures, cloudList);
        }
      });
      return function() {
        if (typeof unsubscribe === "function") unsubscribe();
      };
    }
  }, []);

  // حساب المحاضرة القادمة أو الجارية عبر زوم (اليوم أو غداً) لعرض شريط التنبيه العاجل
  var upcomingZoomInfo = React.useMemo(function() {
    if (!Array.isArray(appLectures) || appLectures.length === 0) return null;
    var now = new Date();
    var candidates = [];
    appLectures.forEach(function(lec) {
      if (!lec || !lec.zoomUrl || !lec.date) return;
      var parsed = (utils && utils.parseLectureDateTime)
        ? utils.parseLectureDateTime(lec.date, lec.zoomTimeStr || lec.startTime, lec.notes)
        : null;
      if (!parsed || !parsed.isValid || !parsed.targetDate) return;
      var diffMs = parsed.targetDate.getTime() - now.getTime();
      var diffMinutes = Math.round(diffMs / 60000);

      // تشمل المحاضرة الجارية (حتى 3 ساعات بعد البداية) أو القادمة خلال 36 ساعة
      if (diffMinutes >= -180 && diffMinutes <= 36 * 60) {
        var cd = (utils && utils.getCountdownInfo)
          ? utils.getCountdownInfo(lec.date, lec.zoomTimeStr || lec.startTime, lec.notes)
          : null;
        var isLive = cd && cd.status === "live";
        var isToday = (diffMinutes >= -180 && diffMinutes <= 16 * 60);

        candidates.push({
          lecture: lec,
          parsed: parsed,
          diffMinutes: diffMinutes,
          countdown: cd,
          isToday: isToday,
          isLive: isLive
        });
      }
    });

    if (candidates.length === 0) return null;
    candidates.sort(function(a, b) {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return a.diffMinutes - b.diffMinutes;
    });
    return candidates[0];
  }, [appLectures]);

  React.useEffect(function() {
    if (activeToast) {
      var t = setTimeout(function() { setActiveToast(null); }, 7000);
      return function() { clearTimeout(t); };
    }
  }, [activeToast]);

  var [isInstallPromptOpen, setIsInstallPromptOpen] = React.useState(false);
  var [deferredPrompt, setDeferredPrompt] = React.useState(null);
  var [hasNotificationPermission, setHasNotificationPermission] = React.useState(function() {
    return ("Notification" in window) && Notification.permission === "granted";
  });

  var [hasUpdateAvailable, setHasUpdateAvailable] = React.useState(false);

  // مراقبة توفر تحديث جديد للمنصة فوراً عند كل رفع
  React.useEffect(function() {
    var checkAppUpdate = async function() {
      try {
        var base = window.location.href.split("#")[0].split("?")[0];
        var response = await fetch(base + "?t=" + Date.now(), {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
        });
        if (response.ok) {
          var htmlText = await response.text();
          var match = htmlText.match(/version:\s*"([^"]+)"/);
          var bTimeMatch = htmlText.match(/buildTime:\s*"([^"]+)"/);
          var isDifferentVersion = (match && match[1] && match[1] !== cfg.version);
          var isDifferentTime = (bTimeMatch && bTimeMatch[1] && bTimeMatch[1] !== cfg.buildTime);
          if (isDifferentVersion || isDifferentTime) {
            setHasUpdateAvailable(true);
          }
        }
      } catch (e) {}
    };

    var interval = setInterval(checkAppUpdate, 5000);
    checkAppUpdate();

    var onFocus = function() { checkAppUpdate(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);

    return function() {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  // التقاط حدث تثبيت التطبيق PWA
  React.useEffect(function() {
    var handleBeforeInstall = function(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // الاستماع للإشعارات الواردة
    var unsubscribeNotifs = function() {};
    if (window.NotificationService && typeof window.NotificationService.subscribeNotifications === "function") {
      var initialLoad = true;
      var lastNotifiedId = null;
      unsubscribeNotifs = window.NotificationService.subscribeNotifications(function(list) {
        var curDismissed = utils.getLocal("counsel_dismissed_notifs", []);
        setDismissedNotifIds(curDismissed);
        setNotificationsList(list || []);
        if (list && list.length > 0) {
          var latest = list[0];
          if (initialLoad) {
            lastNotifiedId = latest.id;
            initialLoad = false;
            // فحص إذا كان الإشعار الأخير جديداً (خلال آخر 3 ساعات) وهو تنبيه زوم ولم يره المستخدم
            var notifTime = 0;
            if (latest.createdAt && latest.createdAt.toMillis) notifTime = latest.createdAt.toMillis();
            else if (latest.createdAt && latest.createdAt.seconds) notifTime = latest.createdAt.seconds * 1000;
            else if (latest.createdAt) notifTime = new Date(latest.createdAt).getTime() || 0;

            var isRecent = (Date.now() - notifTime) < (3 * 60 * 60 * 1000);
            var isZoomAlert = (latest.type === "zoom_reminder" || latest.type === "zoom_link");
            var readNotifs = utils.getLocal("counsel_read_notif_ids", []);
            var isUnseen = curDismissed.indexOf(latest.id) === -1 && readNotifs.indexOf(latest.id) === -1;

            if (!isRecent || !isZoomAlert || !isUnseen) {
              return;
            }
          }

          if (latest.id === lastNotifiedId && !initialLoad) {
            return;
          }
          lastNotifiedId = latest.id;

          var shouldNotify = false;
          var isAdmin = !!(currentUser && currentUser.role === "admin");
          var isRegistration = latest.type === "user_registration";
          var isErrorReport = latest.type === "error_report" || latest.target === "admin";

          // تصنيف وفلترة مستلمي الإشعار بدقة
          if (latest.target === "user") {
            // إشعار موجه لدارس بعينه (اختبار أو تنبيه خاص)
            var currentUserId = currentUser ? (currentUser.id || "") : "";
            var currentUserEmail = currentUser ? (currentUser.email || "").toLowerCase().trim() : "";
            var targetId = latest.targetUserId || "";
            var targetEmail = (latest.targetUserEmail || "").toLowerCase().trim();

            if ((targetId && targetId === currentUserId) || (targetEmail && targetEmail === currentUserEmail)) {
              shouldNotify = true;
            } else {
              shouldNotify = false;
            }
          } else if (isRegistration || isErrorReport) {
            // إشعار طلبات الدارسين الجدد وبلاغات الأعطال يظهر فقط لمشرف المنصة
            if (isAdmin) {
              shouldNotify = true;
            }
          } else {
            // إشعارات المحاضرات والتعميمات العامة تظهر لجميع الدارسين المعتمدين
            shouldNotify = true;
          }

          if (shouldNotify) {
            // تشغيل الرنين والاهتزاز فور وصول الإشعار
            if (window.NotificationService && typeof window.NotificationService.playNotificationChime === "function") {
              window.NotificationService.playNotificationChime();
            }

            // إظهار تنبيه بصري عاجل داخل التطبيق (In-App Visual Toast)
            setActiveToast({
              id: latest.id || Date.now(),
              title: latest.title,
              body: latest.body,
              linkTab: latest.linkTab || (latest.type === "error_report" ? "errors" : (latest.type === "user_registration" ? "users" : "lectures"))
            });

            if (("Notification" in window) && Notification.permission === "granted") {
              try {
                var notifOptions = {
                  body: latest.body,
                  icon: "icon-192.png",
                  badge: "icon-192.png",
                  vibrate: [250, 100, 250],
                  tag: latest.id || "counsel_notify",
                  renotify: true,
                  data: {
                    url: latest.zoomUrl || (window.location.origin + window.location.pathname + "#lectures"),
                    zoomUrl: latest.zoomUrl || "",
                    linkTab: latest.linkTab || "",
                    lectureId: latest.lectureId || ""
                  }
                };

                // محاولة الإظهار عبر Service Worker لضمان الظهور في درج إشعارات الموبايل وشاشة القفل
                if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                  navigator.serviceWorker.ready.then(function(reg) {
                    if (reg && reg.showNotification) {
                      reg.showNotification(latest.title, notifOptions);
                    } else {
                      showFallbackNotification();
                    }
                  }).catch(function() {
                    showFallbackNotification();
                  });
                } else {
                  showFallbackNotification();
                }

                function showFallbackNotification() {
                  try {
                    var notif = new Notification(latest.title, notifOptions);
                    notif.onclick = function() {
                      window.focus();
                      if (latest.zoomUrl) {
                        window.open(latest.zoomUrl, "_blank");
                      }
                      if (latest.linkTab) setActiveTab(latest.linkTab);
                      else if (latest.lectureId) setActiveTab("lectures");
                      notif.close();
                    };
                  } catch(eNotif) {}
                }
              } catch (err) {}
            }
          }
        }
        initialLoad = false;
      });
    }

    return function() {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      if (typeof unsubscribeNotifs === "function") unsubscribeNotifs();
    };
  }, [currentUser]);

  // فحص دوري دقيق لتذكيرات الزوم (قبل المحاضرة بيوم، وقبلها بساعة، وعند موعد البدء فقط)
  React.useEffect(function() {
    var checkZoomReminders = function() {
      try {
        var lectures = (Array.isArray(appLectures) && appLectures.length > 0)
          ? appLectures
          : utils.getLocal(cfg.storageKeys.lectures, []);
        if (!Array.isArray(lectures) || lectures.length === 0) return;

        // مزامنة محاضرات الزوم مع الـ Service Worker للعمل في الخلفية
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          try {
            navigator.serviceWorker.controller.postMessage({
              type: "SYNC_ZOOM_LECTURES",
              lectures: lectures
            });
          } catch (swMsgErr) {}
        }

        var now = new Date();
        var sentReminders = utils.getLocal("counsel_sent_zoom_reminders", {});

        lectures.forEach(function(lec) {
          if (!lec || !lec.zoomUrl || !lec.date) return;

          // استخراج وتحديد التوقيت الدقيق للمحاضرة عبر المحلل الذكي الشامل
          var parsed = (utils && utils.parseLectureDateTime)
            ? utils.parseLectureDateTime(lec.date, lec.zoomTimeStr || lec.startTime, lec.notes)
            : null;
          if (!parsed || !parsed.isValid || !parsed.targetDate) return;

          var targetDate = parsed.targetDate;
          var diffMs = targetDate.getTime() - now.getTime();
          var diffMinutes = Math.round(diffMs / 60000);
          var formattedTime = parsed.formattedTime || parsed.timeStr;

          var reminder1DayKey = lec.id + "_1day";
          var reminder1HourKey = lec.id + "_1h";
          var reminderOpenKey = lec.id + "_opening";

          // 1. تذكير قبل المحاضرة بيوم كامل (بين 22 و 26 ساعة قبل الموعد حصراً)
          if (diffMinutes >= (22 * 60) && diffMinutes <= (26 * 60) && !sentReminders[reminder1DayKey]) {
            sentReminders[reminder1DayKey] = Date.now();
            utils.setLocal("counsel_sent_zoom_reminders", sentReminders);
            if (window.NotificationService && typeof window.NotificationService.showSystemNotification === "function") {
              window.NotificationService.showSystemNotification("📅 تذكير: غداً موعد محاضرة " + (lec.title || ""), {
                body: "الموعد: غداً (" + (lec.date || "") + ") الساعة " + (formattedTime || "") + " عبر زووم • استعد وجهّز نفسك!",
                tag: reminder1DayKey,
                data: { url: lec.zoomUrl, zoomUrl: lec.zoomUrl, linkTab: "lectures", lectureId: lec.id }
              });
            }
            setActiveToast({
              id: "toast_" + reminder1DayKey,
              title: "📅 تذكير: غداً موعد محاضرة " + (lec.title || ""),
              body: "غداً بإذن ربنا الساعة " + (formattedTime || "") + " عبر زووم • جهّز مكانك واستعد!",
              linkTab: "lectures",
              zoomUrl: lec.zoomUrl
            });
          }

          // 2. تذكير قبل المحاضرة بساعة (بين 45 إلى 75 دقيقة قبل الموعد بدقة)
          if (diffMinutes >= 45 && diffMinutes <= 75 && !sentReminders[reminder1HourKey]) {
            sentReminders[reminder1HourKey] = Date.now();
            utils.setLocal("counsel_sent_zoom_reminders", sentReminders);
            if (window.NotificationService && typeof window.NotificationService.showSystemNotification === "function") {
              window.NotificationService.showSystemNotification("⏰ تذكير: محاضرة " + (lec.title || "") + " تبدأ بعد قليل", {
                body: "الموعد: " + (formattedTime || "") + " عبر زووم • القاعة جاهزة، اضغط هنا للدخول المباشر!",
                tag: reminder1HourKey,
                data: { url: lec.zoomUrl, zoomUrl: lec.zoomUrl, linkTab: "lectures", lectureId: lec.id }
              });
            }
            setActiveToast({
              id: "toast_" + reminder1HourKey,
              title: "⏰ تذكير: محاضرة " + (lec.title || "") + " تبدأ بعد قليل",
              body: "الموعد: " + (formattedTime || "") + " عبر زووم • جهّز مكان هادئ واستعد للدخول!",
              linkTab: "lectures",
              zoomUrl: lec.zoomUrl
            });
          }

          // 3. تذكير موعد بدء المحاضرة الفعلي (من قبل الموعد بـ 10 دقائق وحتى 15 دقيقة بعد البدء كحد أقصى لمنع التنبيه المتأخر)
          if (diffMinutes >= -15 && diffMinutes <= 10 && !sentReminders[reminderOpenKey]) {
            sentReminders[reminderOpenKey] = Date.now();
            utils.setLocal("counsel_sent_zoom_reminders", sentReminders);
            if (window.NotificationService && typeof window.NotificationService.showSystemNotification === "function") {
              window.NotificationService.showSystemNotification("🚀 قاعة زووم مفتوحة الآن: " + (lec.title || ""), {
                body: "بدأت المحاضرة الآن! اضغط للدخول المباشر فوراً عبر زووم.",
                tag: reminderOpenKey,
                data: { url: lec.zoomUrl, zoomUrl: lec.zoomUrl, linkTab: "lectures", lectureId: lec.id }
              });
            }
            setActiveToast({
              id: "toast_" + reminderOpenKey,
              title: "🚀 قاعة زووم مفتوحة الآن: " + (lec.title || ""),
              body: "بدأت المحاضرة الآن! اضغط هنا للدخول المباشر إلى زووم.",
              linkTab: "lectures",
              zoomUrl: lec.zoomUrl
            });
          }
        });
      } catch (eLoop) {}
    };

    var zoomTimer = setInterval(checkZoomReminders, 30000);
    // تشغيل فحص فوري عند التحميل
    checkZoomReminders();

    // محاولة تفعيل المزامنة الدورية بالخلفية لـ PWA Android إن توفرت
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(function(reg) {
        if ("periodicSync" in reg) {
          try {
            reg.periodicSync.register("check-zoom-reminders", {
              minInterval: 15 * 60 * 1000
            }).catch(function() {});
          } catch (eSync) {}
        }
      }).catch(function() {});
    }

    // تشغيل فحص فوري عند عودة المستخدم للتطبيق أو فتح الشاشة
    var onWakeup = function() { checkZoomReminders(); };
    window.addEventListener("focus", onWakeup);
    document.addEventListener("visibilitychange", function() {
      if (!document.hidden) checkZoomReminders();
    });

    return function() {
      clearInterval(zoomTimer);
      window.removeEventListener("focus", onWakeup);
    };
  }, [appLectures]);


  var handleToggleNotification = async function() {
    if (window.NotificationService && typeof window.NotificationService.requestPermission === "function") {
      var granted = await window.NotificationService.requestPermission();
      setHasNotificationPermission(granted);
    }
  };

  // حالة المستخدم الحالي (فارغ افتراضياً لإلزام تسجيل الدخول)
  var [currentUser, setCurrentUser] = React.useState(function() {
    var saved = utils.getLocal("counsel_current_user", null);
    if (saved && typeof saved === "object" && saved.status === "approved") {
      return saved;
    }
    return null;
  });

  // عدد طلبات الانضمام المعلقة في انتظار المشرف
  var [pendingUsersCount, setPendingUsersCount] = React.useState(0);

  // مراقبة فورية لطلبات الانضمام الجديدة للمشرف
  React.useEffect(function() {
    if (!currentUser || currentUser.role !== "admin" || !window.db) return;
    try {
      var unsubscribePending = window.db.collection("users")
        .where("status", "==", "pending")
        .onSnapshot(function(snap) {
          setPendingUsersCount(snap.size);
        }, function(err) {
          console.warn("Pending users listener note:", err);
        });
      return function() { unsubscribePending(); };
    } catch (e) {}
  }, [currentUser]);

  // مراقبة حية لحالة الحساب للدارس (في حال تعليقه أو حذفه من قِبل المشرف)
  React.useEffect(function() {
    if (!currentUser || currentUser.role === "admin" || !currentUser.id || !window.db) return;
    try {
      var unsubscribeUser = window.db.collection("users").doc(currentUser.id).onSnapshot({ includeMetadataChanges: true }, function(doc) {
        if (doc.exists) {
          var uData = doc.data();
          // حماية من الكاش القديم: لا نوقف الحساب إذا كانت البيانات مسترجعة من الذاكرة المؤقتة (fromCache)
          // ننتظر دائماً تأكيد الخادم الحي المباشر لتجنب تعليق الحساب خطأً
          if (doc.metadata && doc.metadata.fromCache && uData.status !== "approved") {
            return;
          }

          if (uData.status === "approved") {
            // مزامنة أي تحديثات فورية أجراها المشرف (مثل تغيير كلمة المرور)
            if (currentUser.status !== "approved" || currentUser.password !== uData.password) {
              var merged = Object.assign({}, currentUser, uData);
              utils.setLocal("counsel_current_user", merged);
              setCurrentUser(merged);
            }
          } else if (uData.status === "rejected" || uData.status === "pending") {
            alert("تنبيه: تم تعليق حسابك أو تعديل حالته من قِبل مشرف المنصة.");
            utils.removeLocal("counsel_current_user");
            setCurrentUser(null);
          }
        }
      }, function(err) {
        console.warn("User status listener warning:", err);
      });
      return function() { unsubscribeUser(); };
    } catch (e) {}
  }, [currentUser && currentUser.id]);

  // منع فتح تبويبات الإدارة إذا لم يكن مشرفاً
  React.useEffect(function() {
    if (currentUser && currentUser.role !== "admin") {
      if (activeTab === "users" || activeTab === "errors" || activeTab === "settings" || activeTab === "updates") {
        setActiveTab("lectures");
      }
    }
  }, [currentUser, activeTab]);

  var [theme, setTheme] = React.useState(function() {
    return utils.getLocal(cfg.storageKeys.theme, "light");
  });

  React.useEffect(function() {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    utils.setLocal(cfg.storageKeys.theme, theme);
  }, [theme]);

  var handleToggleTheme = function() {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  var handleLoginSuccess = function(userData) {
    setCurrentUser(userData);
    utils.setLocal("counsel_current_user", userData);
    setIsAuthOpen(false);
  };

  // تسجيل جلسة الدخول ونبض التواجد الحي (Heartbeat) للدارس النشط
  React.useEffect(function() {
    if (currentUser && currentUser.status === "approved") {
      if (window.CloudSyncService && typeof window.CloudSyncService.recordLoginLog === "function") {
        window.CloudSyncService.recordLoginLog(currentUser);
      }
      if (window.CloudSyncService && typeof window.CloudSyncService.sendPresenceHeartbeat === "function") {
        window.CloudSyncService.sendPresenceHeartbeat(currentUser);
      }

      // نبض دوري كل دقيقتين لتحديث حالة التواجد الحية
      var heartbeatInterval = setInterval(function() {
        if (window.CloudSyncService && typeof window.CloudSyncService.sendPresenceHeartbeat === "function") {
          window.CloudSyncService.sendPresenceHeartbeat(currentUser);
        }
      }, 2 * 60 * 1000);

      // تحديث النبض عند عودة المستخدم للتطبيق أو تفاعله معه
      var onUserAction = function() {
        if (window.CloudSyncService && typeof window.CloudSyncService.sendPresenceHeartbeat === "function") {
          window.CloudSyncService.sendPresenceHeartbeat(currentUser);
        }
      };
      window.addEventListener("focus", onUserAction);
      window.addEventListener("click", onUserAction);
      document.addEventListener("visibilitychange", onUserAction);

      return function() {
        clearInterval(heartbeatInterval);
        window.removeEventListener("focus", onUserAction);
        window.removeEventListener("click", onUserAction);
        document.removeEventListener("visibilitychange", onUserAction);
      };
    }
  }, [currentUser && currentUser.id]);

  var handleLogout = function() {
    if (confirm("هل تريد بالتأكيد تسجيل الخروج من حسابك؟")) {
      utils.removeLocal("counsel_current_user");
      setCurrentUser(null);
      setIsSidebarOpen(false);
      if (window.auth && typeof window.auth.signOut === "function") {
        try { window.auth.signOut(); } catch (e) {}
      }
    }
  };

  // شاشة البداية والترحيب بآية اليوم ومؤشر التحميل لمدة 5 ثوانٍ
  if (showSplash) {
    return React.createElement(window.SplashScreen, {
      onFinish: function() {
        setShowSplash(false);
      }
    });
  }

  // حائط الصد الأمني: إذا لم يسجل المستخدم دخوله، تظهر شاشة الدخول الإلزامية
  if (!currentUser) {
    return React.createElement(
      "div",
      { className: "min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-3 font-cairo" },
      React.createElement(window.AuthModal, {
        isOpen: true,
        isBlocking: true,
        onClose: null,
        onLoginSuccess: handleLoginSuccess
      })
    );
  }

  return React.createElement(
    "div",
    { className: "min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-cairo" },

    React.createElement(window.Sidebar, {
      activeTab: activeTab,
      onTabChange: setActiveTab,
      currentUser: currentUser,
      onOpenAuth: function() { setIsAuthOpen(true); },
      onLogout: handleLogout,
      pendingCount: pendingUsersCount,
      isOpen: isSidebarOpen,
      onClose: function() { setIsSidebarOpen(false); },
      hasNotificationPermission: hasNotificationPermission,
      onToggleNotification: handleToggleNotification,
      onOpenInstallPrompt: function() { setIsInstallPromptOpen(true); },
      onOpenErrorReport: function() { setIsErrorReportOpen(true); },
      onOpenFeatureRequest: function() { setIsFeatureRequestOpen(true); },
      onOpenRecycleBin: function() { setIsRecycleBinOpen(true); }
    }),

    React.createElement(
      "div",
      { className: "flex-1 flex flex-col min-w-0 transition-all duration-300 w-full" },

      // شريط الترويسة العلوية مع شريط التحديث معاً في رأس ثابت مثبت في أعلى الشاشة دائماً (fixed)
      React.createElement(
        "div",
        { className: "fixed top-0 inset-x-0 z-50 flex flex-col w-full shadow-md bg-white dark:bg-slate-900" },
        
        // شريط التنبيه بوجود تحديث جديد
        hasUpdateAvailable && React.createElement(
          "div",
          {
            className: "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-3 sm:px-6 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-md border-b border-orange-600/80 animate-pulse"
          },
          React.createElement(
            "div",
            { className: "flex items-center gap-2 min-w-0" },
            React.createElement("span", { className: "text-base sm:text-lg shrink-0 animate-bounce" }, "🚀"),
            React.createElement("span", { className: "truncate sm:whitespace-normal font-bold drop-shadow-xs" }, "يتوفر تحديث جديد للمنصة الآن! اضغط لتطبيقه فوراً.")
          ),
          React.createElement(
            "button",
            {
              onClick: function() {
                if ("caches" in window) {
                  caches.keys().then(function(names) {
                    for (var i = 0; i < names.length; i++) caches.delete(names[i]);
                  });
                }
                var cleanUrl = window.location.href.split("?")[0].split("#")[0] + "?v=" + Date.now() + (window.location.hash || "");
                window.location.href = cleanUrl;
              },
              className: "bg-white text-orange-600 hover:text-orange-700 px-3.5 py-1.5 rounded-xl text-xs font-black hover:bg-orange-50 shadow-md transition-all active:scale-95 whitespace-nowrap shrink-0 border border-orange-200"
            },
            "اضغط هنا للتحديث 🔄"
          )
        ),

        // ترويسة التطبيق الرئيسية
        (function() {
          var currentDismissed = dismissedNotifIds || (utils.getLocal ? utils.getLocal("counsel_dismissed_notifs", []) : []);
          var unreadCount = notificationsList.filter(function(n) {
            if (currentDismissed.indexOf(n.id) !== -1) return false;
            if (n.type === "user_registration" && (!currentUser || currentUser.role !== "admin")) return false;
            if (n.type === "password_reset" && (!currentUser || currentUser.role !== "admin")) return false;
            return readNotifIds.indexOf(n.id) === -1;
          }).length;
          return React.createElement(window.Header, {
            isSidebarOpen: isSidebarOpen,
            onOpenSidebar: function() { setIsSidebarOpen(function(prev) { return !prev; }); },
            theme: theme,
            onToggleTheme: handleToggleTheme,
            currentUser: currentUser,
            onOpenAuth: function() { setIsAuthOpen(true); },
            onLogout: handleLogout,
            onOpenErrorReport: function() { setIsErrorReportOpen(true); },
            hasNotificationPermission: hasNotificationPermission,
            onToggleNotification: handleToggleNotification,
            onOpenInstallPrompt: function() { setIsInstallPromptOpen(true); },
            onOpenNotifications: function() { setIsNotificationCenterOpen(true); },
            unreadNotificationsCount: unreadCount,
            onTabChange: setActiveTab,
            activeTab: activeTab,
            lastAudioRecord: lastAudioRecord,
            isTopResumeDismissed: isTopResumeDismissed,
            onDismissTopResume: function() { setIsTopResumeDismissed(true); },
            onResumeAudio: handleGlobalResumeAudio
          });
        })(),

        // شريط تنبيه بث زوم المباشر أو التذكير بمحاضرة اليوم / غداً
        (function() {
          if (!upcomingZoomInfo || isTopZoomDismissed) return null;
          var uz = upcomingZoomInfo;
          var lec = uz.lecture;
          var isLive = uz.isLive;
          var isToday = uz.isToday;

          if (isToday || isLive) {
            return React.createElement(
              "div",
              {
                className: "bg-gradient-to-r from-red-600 via-rose-600 to-indigo-800 text-white px-3 sm:px-6 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg border-b border-rose-700/80 animate-in fade-in duration-300"
              },
              React.createElement(
                "div",
                { className: "flex items-center gap-2 min-w-0 flex-1" },
                React.createElement("span", { className: "text-base sm:text-lg shrink-0 " + (isLive ? "animate-pulse" : "") }, isLive ? "🔴" : "⏰"),
                React.createElement(
                  "div",
                  { className: "truncate" },
                  React.createElement("span", { className: "font-black" }, isLive ? "بث زوم مباشر الآن: " : "محاضرة زووم اليوم: "),
                  React.createElement("span", { className: "underline ml-1 font-bold" }, lec.title),
                  React.createElement("span", { className: "text-xs opacity-90 mr-1.5" }, "• " + (uz.parsed.formattedTime || "") + (uz.countdown ? " (" + uz.countdown.label + ")" : ""))
                )
              ),
              React.createElement(
                "div",
                { className: "flex items-center gap-1.5 shrink-0 mr-2" },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { if (utils.addToCalendarPrompt) utils.addToCalendarPrompt(lec); },
                    title: "إضافة لمنبه تقويم الهاتف",
                    className: "bg-white/20 hover:bg-white/30 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border border-white/30 hidden md:inline-flex items-center gap-1"
                  },
                  "📅 منبه التقويم"
                ),
                React.createElement(
                  "a",
                  {
                    href: lec.zoomUrl,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "bg-white text-rose-700 hover:text-rose-800 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1 hover:scale-102"
                  },
                  "دخول زوم الآن 🚀"
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { setIsTopZoomDismissed(true); },
                    className: "text-white/70 hover:text-white px-1.5 py-1 text-sm font-bold",
                    title: "إخفاء الشريط"
                  },
                  "✕"
                )
              )
            );
          } else {
            // غداً
            return React.createElement(
              "div",
              {
                className: "bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-3 sm:px-6 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-md border-b border-indigo-700/80"
              },
              React.createElement(
                "div",
                { className: "flex items-center gap-2 min-w-0 flex-1" },
                React.createElement("span", { className: "text-base shrink-0" }, "📅"),
                React.createElement(
                  "div",
                  { className: "truncate" },
                  React.createElement("span", { className: "font-black" }, "تذكير: غداً موعد محاضرة زووم «" + lec.title + "»"),
                  React.createElement("span", { className: "text-xs opacity-90 mr-2" }, "الساعة " + (uz.parsed.formattedTime || ""))
                )
              ),
              React.createElement(
                "div",
                { className: "flex items-center gap-1.5 shrink-0 mr-2" },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { if (utils.addToCalendarPrompt) utils.addToCalendarPrompt(lec); },
                    title: "ضبط منبه تقويم الموبايل قبلها بيوم وقبلها بربع ساعة",
                    className: "bg-white text-indigo-900 hover:bg-indigo-50 px-3 py-1.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1"
                  },
                  "📅 ضبط منبه التقويم ⏰"
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() { setIsTopZoomDismissed(true); },
                    className: "text-white/70 hover:text-white px-1.5 py-1 text-sm font-bold",
                    title: "إخفاء الشريط"
                  },
                  "✕"
                )
              )
            );
          }
        })()
      ),

      React.createElement(
        "main",
        {
          className: "flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 md:px-8 py-5 pb-20 md:pb-8 " + (function() {
            var hasTopResume = !!(lastAudioRecord && !isTopResumeDismissed);
            var hasTopZoom = !!(upcomingZoomInfo && !isTopZoomDismissed);
            var count = 0;
            if (hasUpdateAvailable) count++;
            if (hasTopZoom) count++;
            if (hasTopResume) count++;
            if (count >= 3) return "pt-44 sm:pt-48";
            if (count === 2) return "pt-36 sm:pt-40";
            if (count === 1) return "pt-28 sm:pt-32";
            return "pt-20 sm:pt-22";
          })()
        },
        hasVisitedLectures && React.createElement(
          "div",
          { className: activeTab === "lectures" ? "block" : "hidden" },
          React.createElement(window.LecturesPage, {
            currentUser: currentUser,
            onOpenRecycleBin: function() { setIsRecycleBinOpen(true); }
          })
        ),
        hasVisitedBooks && React.createElement(
          "div",
          { className: activeTab === "books" ? "block" : "hidden" },
          React.createElement(window.BooksPage, {
            currentUser: currentUser,
            onOpenRecycleBin: function() { setIsRecycleBinOpen(true); }
          })
        ),
        activeTab === "student_guide" && React.createElement(window.StudentGuidePage, { currentUser: currentUser }),
        activeTab === "curriculum" && React.createElement(window.CurriculumPage, { currentUser: currentUser }),
        activeTab === "notes" && React.createElement(window.NotesPage, { currentUser: currentUser }),
        activeTab === "users" && React.createElement(window.UsersManagementPage, { currentUser: currentUser }),
        activeTab === "errors" && React.createElement(window.ErrorReportsAdminPage, { currentUser: currentUser }),
        activeTab === "settings" && React.createElement(window.SettingsPage, { currentUser: currentUser }),
        activeTab === "updates" && React.createElement(window.UpdatesPage, { currentUser: currentUser })
      )
    ),

    // المشغل العائم المصغر الذكي (سواء أثناء التشغيل المباشر أو استئناف آخر تراك محفوظ)
    (function() {
      var formatAudioTime = function(sec) {
        if (!sec || isNaN(sec) || sec <= 0) return "00:00";
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
      };

      // إذا كان هناك صوت قيد التشغيل المباشر في الذاكرة
      if (floatingAudio && activeTab !== "books") {
        return React.createElement(
          "div",
          {
            className: "fixed bottom-16 md:bottom-6 right-3 sm:right-6 left-3 sm:left-auto sm:w-[24rem] z-40 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-2.5 sm:p-3 shadow-2xl border border-amber-500/40 flex items-center justify-between gap-3 animate-fade-in cursor-pointer select-none ring-1 ring-white/10",
            onClick: function() {
              if (lastAudioRecord && lastAudioRecord.bookId) {
                try {
                  localStorage.setItem("counsel_auto_resume_audio", JSON.stringify(lastAudioRecord));
                  localStorage.setItem("counsel_active_book_id", lastAudioRecord.bookId);
                } catch (e) {}
              }
              setActiveTab("books");
              setTimeout(function() {
                try { window.dispatchEvent(new Event("counsel_trigger_resume_audio")); } catch (e) {}
              }, 60);
            }
          },
          React.createElement(
            "div",
            { className: "flex items-center gap-2.5 min-w-0 flex-1" },
            React.createElement(
              "div",
              {
                className: "w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 text-base " + (floatingAudio.isPlaying ? "animate-pulse" : "")
              },
              "🎧"
            ),
            React.createElement(
              "div",
              { className: "min-w-0 flex-1" },
              React.createElement("p", { className: "text-xs font-black text-amber-300 truncate" }, floatingAudio.title || "فصل صوتي"),
              React.createElement("p", { className: "text-[10px] text-slate-400 truncate" }, floatingAudio.book || "الكتاب الصوتي")
            )
          ),
          React.createElement(
            "div",
            {
              className: "flex items-center gap-1.5 shrink-0",
              onClick: function(e) { e.stopPropagation(); }
            },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() {
                  if (floatingAudio.togglePlay) floatingAudio.togglePlay();
                },
                className: "w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-md transition-transform active:scale-90 text-xs",
                title: floatingAudio.isPlaying ? "إيقاف مؤقت" : "تشغيل"
              },
              floatingAudio.isPlaying ? "⏸" : "▶"
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() {
                  if (floatingAudio.stop) floatingAudio.stop();
                  setFloatingAudio(null);
                },
                className: "w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 font-bold flex items-center justify-center transition-colors text-xs",
                title: "إغلاق المشغل"
              },
              "✕"
            )
          )
        );
      }

      return null;
    })(),

    React.createElement(window.BottomNav, {
      activeTab: activeTab,
      onTabChange: setActiveTab,
      onToggleSidebar: function() { setIsSidebarOpen(function(prev) { return !prev; }); }
    }),

    React.createElement(window.AuthModal, {
      isOpen: isAuthOpen,
      onClose: function() { setIsAuthOpen(false); },
      onLoginSuccess: handleLoginSuccess
    }),

    React.createElement(window.ErrorReporterModal, {
      isOpen: isErrorReportOpen,
      onClose: function() { setIsErrorReportOpen(false); },
      currentUser: currentUser,
      activeTab: activeTab
    }),

    React.createElement(window.FeatureRequestModal, {
      isOpen: isFeatureRequestOpen,
      onClose: function() { setIsFeatureRequestOpen(false); },
      currentUser: currentUser
    }),

    React.createElement(window.RecycleBinModal, {
      isOpen: isRecycleBinOpen,
      onClose: function() { setIsRecycleBinOpen(false); },
      currentUser: currentUser
    }),

    React.createElement(window.InstallPromptModal, {
      isOpen: isInstallPromptOpen,
      onClose: function() { setIsInstallPromptOpen(false); },
      deferredPrompt: deferredPrompt,
      onInstalled: function() {
        setDeferredPrompt(null);
        alert("تهانينا! تم تثبيت تطبيق منصة المشورة بنجاح على جهازك.");
      }
    }),

    isNotificationCenterOpen ? React.createElement(window.NotificationCenterModal, {
      isOpen: isNotificationCenterOpen,
      onClose: function() {
        setIsNotificationCenterOpen(false);
        setReadNotifIds(utils.getLocal("counsel_read_notif_ids", []));
        setDismissedNotifIds(utils.getLocal("counsel_dismissed_notifs", []));
      },
      currentUser: currentUser,
      notifications: notificationsList.filter(function(n) {
        return (dismissedNotifIds || []).indexOf(n.id) === -1;
      }),
      onNotificationsDeleted: function(deletedIds) {
        var cur = utils.getLocal("counsel_dismissed_notifs", []);
        setDismissedNotifIds(cur);
        setNotificationsList(function(prev) {
          return prev.filter(function(n) { return deletedIds.indexOf(n.id) === -1; });
        });
      },
      onSelectNotification: function(notif) {
        if (notif.linkTab) setActiveTab(notif.linkTab);
        else if (notif.lectureId) setActiveTab("lectures");
        else if (notif.type === "user_registration") setActiveTab("users");
        else if (notif.type === "error_report") setActiveTab("errors");
        setReadNotifIds(utils.getLocal("counsel_read_notif_ids", []));
      }
    }) : null,

    // تنبيه الإشعار المنبثق التفاعلي داخل التطبيق (In-App Live Toast)
    activeToast && React.createElement(
      "div",
      {
        onClick: function() {
          if (activeToast.linkTab) setActiveTab(activeToast.linkTab);
          setActiveToast(null);
        },
        className: "fixed top-5 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-900/95 dark:bg-slate-800/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md cursor-pointer flex items-start gap-3 transition-all",
        dir: "rtl"
      },
      React.createElement("div", { className: "text-2xl shrink-0" }, "🔔"),
      React.createElement("div", { className: "flex-1 min-w-0 text-right" },
        React.createElement("h4", { className: "text-xs font-bold text-white truncate" }, activeToast.title),
        React.createElement("p", { className: "text-[11px] text-slate-300 line-clamp-2 mt-0.5" }, activeToast.body),
        React.createElement("span", { className: "text-[10px] text-emerald-400 font-bold block mt-1" }, "اضغط للمعاينة والفتح المباشر ↗")
      ),
      React.createElement("button", {
        type: "button",
        onClick: function(e) {
          e.stopPropagation();
          setActiveToast(null);
        },
        className: "text-slate-400 hover:text-white text-xs p-1"
      }, "✕")
    )
  );
}

ReactDOM.render(
  React.createElement(
    window.ErrorBoundary,
    null,
    React.createElement(App, null)
  ),
  document.getElementById("root")
);
window.__reactMounted = true;

