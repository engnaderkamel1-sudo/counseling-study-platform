// شريط الترويسة العلوي مع زر الإبلاغ عن عطل السريع
window.Header = function(props) {
  var onOpenSidebar = props.onOpenSidebar;
  var theme = props.theme;
  var onToggleTheme = props.onToggleTheme;
  var currentUser = props.currentUser;
  var onOpenErrorReport = props.onOpenErrorReport;
  var onLogout = props.onLogout;
  var onOpenAuth = props.onOpenAuth;
  var onOpenNotifications = props.onOpenNotifications;
  var unreadNotificationsCount = props.unreadNotificationsCount || 0;
  var isAdmin = !!(currentUser && currentUser.role === "admin");
  var [isTopResumeDismissed, setIsTopResumeDismissed] = React.useState(false);
  var utils = window.APP_UTILS || {};
  var formatAudioTime = function(sec) {
    if (!sec || isNaN(sec) || sec <= 0) return "00:00";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  };

  return React.createElement(
    "header",
    {
      className: "sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-sm"
    },
    React.createElement(
      "div",
      { className: "px-4 md:px-8 h-16 flex items-center justify-between" },

      React.createElement(
        "div",
        { className: "flex items-center gap-3" },
        React.createElement(
          "button",
          {
            onClick: onOpenSidebar,
            title: props.isSidebarOpen ? "إخفاء القائمة الجانبية لتوسيع الشاشة" : "إظهار القائمة الجانبية",
            className: "hidden md:flex items-center justify-center w-9 h-9 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all border border-slate-300 dark:border-slate-700 shadow-2xs active:scale-95 text-base"
          },
          "☰"
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2.5" },
          React.createElement("img", { src: "icon-192.png", alt: "أيقونة التطبيق", className: "w-8 h-8 rounded-xl shadow-2xs object-cover border border-slate-200 dark:border-slate-700 shrink-0" }),
          React.createElement(
            "div",
            { className: "flex flex-col" },
            React.createElement("h1", { className: "text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight" }, "الرفيق الذكي"),
            React.createElement("span", { className: "text-[10px] text-amber-600 dark:text-amber-400 font-semibold leading-none hidden xs:inline" }, "لدارسي معهد المشورة")
          )
        )
      ),

      React.createElement(
        "div",
        { className: "flex items-center gap-2" },

        // شارة المستخدم الحالي والترحيب بصباح الخير ومساء الخير
        currentUser && (function() {
          var currentHour = new Date().getHours();
          var timeGreeting = currentHour >= 4 && currentHour < 12 ? "صباح الخير" : "مساء الخير";
          var displayName = currentUser.fullName ? currentUser.fullName.split(" ")[0] : (isAdmin ? "المشرف" : "دارس");
          return React.createElement(
            "div",
            {
              onClick: onOpenAuth,
              title: "الحساب: " + (currentUser.fullName || "") + (isAdmin ? " (مشرف)" : " (دارس)"),
              className: "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            },
            React.createElement("span", { className: "w-2 h-2 rounded-full " + (isAdmin ? "bg-purple-500" : "bg-emerald-500") }),
            React.createElement(
              "span",
              { className: "font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" },
              timeGreeting + "، " + displayName
            ),
            React.createElement("span", { className: "hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold " + (isAdmin ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300") },
              isAdmin ? "مشرف" : "دارس"
            )
          );
        })(),

        // نقطة وشارة آخر تحديث المباشرة للأدمن فقط
        isAdmin && React.createElement(
          "button",
          {
            onClick: function() {
              if (props.onTabChange) props.onTabChange("updates");
              else window.location.hash = "updates";
            },
            title: "اضغط لفتح سجل التحديثات ومعرفة أحدث التغييرات",
            className: "hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/70 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 transition-all active:scale-95 shadow-2xs"
          },
          React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }),
          React.createElement("span", null, "سجل التحديثات 🚀")
        ),

        // زر تحديث فوري للمنصة وإفراغ الذاكرة
        React.createElement(
          "button",
          {
            onClick: function() {
              if ("caches" in window) {
                caches.keys().then(function(names) {
                  for (var i = 0; i < names.length; i++) caches.delete(names[i]);
                });
              }
              window.location.reload(true);
            },
            title: "تحديث فوري وإفراغ الذاكرة المؤقتة",
            className: "flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-all text-xs font-bold border border-slate-200 dark:border-slate-700 active:scale-95"
          },
          React.createElement("span", null, "🔄"),
          React.createElement("span", { className: "hidden sm:inline" }, "تحديث")
        ),

        // زر مركز الإشعارات والتنبيهات
        React.createElement(
          "button",
          {
            onClick: onOpenNotifications,
            title: unreadNotificationsCount > 0 ? ("لديك " + unreadNotificationsCount + " إشعار جديد") : "مركز الإشعارات والتنبيهات",
            className: "relative w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all text-sm border border-slate-200 dark:border-slate-700 active:scale-95"
          },
          React.createElement("span", null, "🔔"),
          unreadNotificationsCount > 0 && React.createElement(
            "span",
            { className: "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold font-mono flex items-center justify-center shadow-xs animate-pulse" },
            unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount
          )
        ),

        // تبديل المظهر
        React.createElement(
          "button",
          {
            onClick: onToggleTheme,
            title: "تبديل المظهر",
            className: "w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all text-sm"
          },
          theme === "dark" ? "☀️" : "🌙"
        )
      )
    ),

    // السطر الثاني: شريط متابعة الاستماع المخصص والأنيق (لا يزاحم أي زر إطلاقاً)
    (props.lastAudioRecord && !isTopResumeDismissed && (props.activeTab !== "books" || (utils.getLocal && utils.getLocal("counsel_active_book_id") !== props.lastAudioRecord.bookId))) && React.createElement(
      "div",
      {
        className: "border-t border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/30 px-3 sm:px-6 md:px-8 py-1.5 flex items-center justify-between gap-2 text-xs shadow-2xs animate-fade-in"
      },
      React.createElement(
        "div",
        {
          className: "flex items-center gap-2 min-w-0 flex-1 cursor-pointer",
          onClick: function() {
            if (props.onResumeAudio) props.onResumeAudio();
          }
        },
        React.createElement("span", { className: "text-base shrink-0 animate-pulse" }, "🎧"),
        React.createElement("span", { className: "font-black text-amber-800 dark:text-amber-400 shrink-0 text-xs" }, "استئناف:"),
        React.createElement(
          "span",
          {
            className: "font-bold text-slate-900 dark:text-slate-100 truncate text-xs",
            title: (props.lastAudioRecord.bookTitle || "") + " — " + (props.lastAudioRecord.chapterTitle || props.lastAudioRecord.title || "")
          },
          (props.lastAudioRecord.bookTitle ? (props.lastAudioRecord.bookTitle + " — ") : "") + (props.lastAudioRecord.chapterTitle || props.lastAudioRecord.title || "فصل صوتي")
        ),
        (props.lastAudioRecord.position > 0) && React.createElement(
          "span",
          { className: "text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0 hidden xs:inline" },
          "(" + formatAudioTime(props.lastAudioRecord.position) + ")"
        )
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-1.5 shrink-0" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() {
              if (props.onResumeAudio) props.onResumeAudio();
            },
            className: "inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs active:scale-95 transition-all"
          },
          React.createElement("span", null, "▶"),
          React.createElement("span", null, "استئناف")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() {
              setIsTopResumeDismissed(true);
            },
            title: "إخفاء شريط الاستئناف",
            className: "w-6 h-6 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center font-bold text-xs transition-colors"
          },
          "✕"
        )
      )
    )
  );
};
