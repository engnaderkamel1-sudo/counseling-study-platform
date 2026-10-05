// المكون الرئيسي App.js مع دمج نظام التقاط وبلاغات الأعطال
function App() {
  var utils = window.APP_UTILS;
  var cfg = window.APP_CONFIG;

  var [activeTab, setActiveTab] = React.useState("lectures");
  var [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  var [isAuthOpen, setIsAuthOpen] = React.useState(false);
  var [isErrorReportOpen, setIsErrorReportOpen] = React.useState(false);

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
        var response = await fetch(base + "?t=" + Date.now(), { cache: "no-store" });
        if (response.ok) {
          var htmlText = await response.text();
          var match = htmlText.match(/version:\s*"([^"]+)"/);
          if (match && match[1] && match[1] !== cfg.version) {
            setHasUpdateAvailable(true);
          }
        }
      } catch (e) {}
    };

    var interval = setInterval(checkAppUpdate, 15000);
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
      unsubscribeNotifs = window.NotificationService.subscribeNotifications(function(list) {
        if (!initialLoad && list.length > 0) {
          var latest = list[0];
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(latest.title, {
                body: latest.body,
                icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%230f172a'/%3E%3Ctext x='50' y='65' font-size='50' text-anchor='middle'%3E🌿%3C/text%3E%3C/svg%3E"
              });
            } catch (err) {}
          }
        }
        initialLoad = false;
      });
    }

    return function() {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      if (typeof unsubscribeNotifs === "function") unsubscribeNotifs();
    };
  }, []);

  var handleToggleNotification = async function() {
    if (window.NotificationService && typeof window.NotificationService.requestPermission === "function") {
      var granted = await window.NotificationService.requestPermission();
      setHasNotificationPermission(granted);
    }
  };

  var [currentUser, setCurrentUser] = React.useState(function() {
    return utils.getLocal("counsel_current_user", {
      fullName: "الأدمن",
      email: "eng.nader.reda@gmail.com",
      phone: "01275571569",
      role: "admin",
      status: "approved"
    });
  });

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
    alert("مرحباً بك يا " + (userData.fullName || "زميلنا العزيز") + "! تم تسجيل الدخول بنجاح.");
  };

  return React.createElement(
    "div",
    { className: "min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-cairo" },

    React.createElement(window.Sidebar, {
      activeTab: activeTab,
      onTabChange: setActiveTab,
      currentUser: currentUser,
      onOpenAuth: function() { setIsAuthOpen(true); },
      isOpen: isSidebarOpen,
      onClose: function() { setIsSidebarOpen(false); },
      hasNotificationPermission: hasNotificationPermission,
      onToggleNotification: handleToggleNotification,
      onOpenInstallPrompt: function() { setIsInstallPromptOpen(true); },
      onOpenErrorReport: function() { setIsErrorReportOpen(true); }
    }),

    React.createElement(
      "div",
      { className: "flex-1 flex flex-col min-w-0 transition-all duration-300 w-full" },

      // الترويسة العلوية الثابتة دائماً أثناء التمرير
      React.createElement(
        "div",
        { className: "sticky top-0 z-30 flex flex-col shadow-sm" },
        React.createElement(window.Header, {
          isSidebarOpen: isSidebarOpen,
          onOpenSidebar: function() { setIsSidebarOpen(function(prev) { return !prev; }); },
          theme: theme,
          onToggleTheme: handleToggleTheme,
          currentUser: currentUser,
          onOpenErrorReport: function() { setIsErrorReportOpen(true); },
          hasNotificationPermission: hasNotificationPermission,
          onToggleNotification: handleToggleNotification,
          onOpenInstallPrompt: function() { setIsInstallPromptOpen(true); }
        }),

        // شريط إشعار بوجود تحديث جديد يظهر مباشرة ويثبت في الأعلى
        hasUpdateAvailable && React.createElement(
          "div",
          {
            className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between shadow-md animate-pulse border-b border-orange-600"
          },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("span", { className: "text-base" }, "🚀"),
            React.createElement("span", null, "يتوفر تحديث جديد للمنصة الآن! اضغط لتطبيقه فوراً.")
          ),
          React.createElement(
            "button",
            {
              onClick: function() { window.location.reload(true); },
              className: "bg-white text-orange-600 px-3.5 py-1 rounded-lg text-xs font-bold hover:bg-orange-50 shadow-sm transition-all active:scale-95 whitespace-nowrap"
            },
            "اضغط هنا للتحديث 🔄"
          )
        )
      ),

      React.createElement(
        "main",
        { className: "flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 md:px-8 py-5 pb-20 md:pb-8" },
        activeTab === "lectures" && React.createElement(window.LecturesPage, { currentUser: currentUser }),
        activeTab === "books" && React.createElement(window.BooksPage, { currentUser: currentUser }),
        activeTab === "curriculum" && React.createElement(window.CurriculumPage, { currentUser: currentUser }),
        activeTab === "notes" && React.createElement(window.NotesPage, { currentUser: currentUser }),
        activeTab === "users" && React.createElement(window.UsersManagementPage, { currentUser: currentUser }),
        activeTab === "errors" && React.createElement(window.ErrorReportsAdminPage, { currentUser: currentUser }),
        activeTab === "settings" && React.createElement(window.SettingsPage, { currentUser: currentUser })
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

    React.createElement(window.InstallPromptModal, {
      isOpen: isInstallPromptOpen,
      onClose: function() { setIsInstallPromptOpen(false); },
      deferredPrompt: deferredPrompt,
      onInstalled: function() {
        setDeferredPrompt(null);
        alert("تهانينا! تم تثبيت تطبيق منصة المشورة بنجاح على جهازك.");
      }
    })
  );
}

ReactDOM.render(React.createElement(App, null), document.getElementById("root"));
