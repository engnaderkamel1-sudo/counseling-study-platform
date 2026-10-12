// المكون الرئيسي App.js مع دمج نظام التقاط وبلاغات الأعطال
function App() {
  var utils = window.APP_UTILS;
  var cfg = window.APP_CONFIG;

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

  React.useEffect(function() {
    var updateFloatingAudio = function() {
      if (window.__ACTIVE_PLAYING_AUDIO) {
        setFloatingAudio(Object.assign({}, window.__ACTIVE_PLAYING_AUDIO));
      } else {
        setFloatingAudio(null);
      }
    };
    window.addEventListener("counsel_audio_state_change", updateFloatingAudio);
    return function() {
      window.removeEventListener("counsel_audio_state_change", updateFloatingAudio);
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
          if (match && match[1] && match[1] !== cfg.version) {
            setHasUpdateAvailable(true);
          } else if (bTimeMatch && bTimeMatch[1] && bTimeMatch[1] !== cfg.buildTime) {
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
            return;
          }

          if (latest.id === lastNotifiedId) {
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

  // فحص دوري مجدول كل دقيقة لتذكيرات الزوم (قبل المحاضرة بساعة وقبل الفتح / الصلاة)
  React.useEffect(function() {
    var checkZoomReminders = function() {
      try {
        var lectures = utils.getLocal(cfg.storageKeys.lectures, []);
        if (!Array.isArray(lectures) || lectures.length === 0) return;

        var now = new Date();
        var sentReminders = utils.getLocal("counsel_sent_zoom_reminders", {});

        lectures.forEach(function(lec) {
          if (!lec || !lec.zoomUrl || !lec.date) return;

          // استخراج وتحديد التوقيت الدقيق للمحاضرة
          var targetDate = null;
          var timeStr = lec.startTime || "";
          if (!timeStr && lec.zoomTimeStr) {
            // محاولة التقاط الوقت من نص زوم مثل "05:45 PM"
            var tMatch = lec.zoomTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (tMatch) {
              var hours = parseInt(tMatch[1]);
              var mins = parseInt(tMatch[2]);
              var ampm = (tMatch[3] || "").toUpperCase();
              if (ampm === "PM" && hours < 12) hours += 12;
              if (ampm === "AM" && hours === 12) hours = 0;
              timeStr = (hours < 10 ? "0" + hours : hours) + ":" + (mins < 10 ? "0" + mins : mins);
            }
          }

          // التوقيت الافتراضي المعتاد لبدء فتح الزوم (05:45 مساءً) إذا لم يُحدد وقت
          if (!timeStr) {
            timeStr = "17:45";
          }

          try {
            var parts = lec.date.split("-");
            var timeParts = timeStr.split(":");
            if (parts.length === 3 && timeParts.length >= 2) {
              targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(timeParts[0]), parseInt(timeParts[1]), 0);
            }
          } catch(eDate) {}

          if (!targetDate || isNaN(targetDate.getTime())) return;

          var diffMs = targetDate.getTime() - now.getTime();
          var diffMinutes = Math.round(diffMs / 60000);

          var reminder1HourKey = lec.id + "_1h";
          var reminderOpenKey = lec.id + "_opening";

          // 1. تذكير قبل المحاضرة بساعة (بين 50 إلى 65 دقيقة)
          if (diffMinutes >= 50 && diffMinutes <= 65 && !sentReminders[reminder1HourKey]) {
            sentReminders[reminder1HourKey] = Date.now();
            utils.setLocal("counsel_sent_zoom_reminders", sentReminders);
            if (window.NotificationService && typeof window.NotificationService.broadcastZoomReminder === "function") {
              window.NotificationService.broadcastZoomReminder(lec, "1hour");
            }
          }

          // 2. تذكير فتح القاعة وبدء الصلاة (بين 0 إلى 15 دقيقة قبل الموعد، أو عند حلول الموعد)
          if (diffMinutes >= -5 && diffMinutes <= 15 && !sentReminders[reminderOpenKey]) {
            sentReminders[reminderOpenKey] = Date.now();
            utils.setLocal("counsel_sent_zoom_reminders", sentReminders);
            if (window.NotificationService && typeof window.NotificationService.broadcastZoomReminder === "function") {
              window.NotificationService.broadcastZoomReminder(lec, "opening");
            }
          }
        });
      } catch (eLoop) {}
    };

    var zoomTimer = setInterval(checkZoomReminders, 60000);
    // تشغيل فحص فوري عند التحميل
    checkZoomReminders();

    return function() { clearInterval(zoomTimer); };
  }, []);


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
      var unsubscribeUser = window.db.collection("users").doc(currentUser.id).onSnapshot(function(doc) {
        if (doc.exists) {
          var uData = doc.data();
          if (uData.status !== "approved") {
            alert("تنبيه: تم تعليق حسابك أو تعديل حالته من قِبل مشرف المنصة.");
            utils.removeLocal("counsel_current_user");
            setCurrentUser(null);
          }
        }
      });
      return function() { unsubscribeUser(); };
    } catch (e) {}
  }, [currentUser]);

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

      return function() {
        clearInterval(heartbeatInterval);
        window.removeEventListener("focus", onUserAction);
        window.removeEventListener("click", onUserAction);
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
            onTabChange: setActiveTab
          });
        })()
      ),

      React.createElement(
        "main",
        { className: "flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 md:px-8 py-5 pb-20 md:pb-8 " + (hasUpdateAvailable ? "pt-28 sm:pt-32" : "pt-20 sm:pt-22") },
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

    // مشغل عائم مصغر دائم عند الانتقال لأي تبويب آخر أثناء تشغيل الصوت (Floating Mini-Player)
    (floatingAudio && activeTab !== "books") && React.createElement(
      "div",
      {
        className: "fixed bottom-16 md:bottom-6 right-3 sm:right-6 left-3 sm:left-auto sm:w-[22rem] z-40 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-2.5 sm:p-3 shadow-2xl border border-amber-500/30 flex items-center justify-between gap-3 animate-fade-in cursor-pointer select-none ring-1 ring-white/10",
        onClick: function() {
          setActiveTab("books");
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
    ),

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

