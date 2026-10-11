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
          React.createElement("h1", { className: "text-base md:text-lg font-bold text-slate-900 dark:text-white" }, "رفيق المشورة"),
          React.createElement("span", { className: "hidden sm:inline-block text-xs bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-medium" }, "لدارسي معهد المشورة")
        )
      ),

      React.createElement(
        "div",
        { className: "flex items-center gap-2" },

        // شارة المستخدم الحالي
        currentUser && React.createElement(
          "div",
          {
            onClick: onOpenAuth,
            title: "الحساب: " + (currentUser.fullName || "") + (isAdmin ? " (مشرف)" : " (دارس)"),
            className: "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          },
          React.createElement("span", { className: "w-2 h-2 rounded-full " + (isAdmin ? "bg-purple-500" : "bg-emerald-500") }),
          React.createElement("span", { className: "font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]" }, currentUser.fullName || (isAdmin ? "المشرف" : "دارس")),
          React.createElement("span", { className: "text-[10px] px-1.5 py-0.2 rounded font-semibold " + (isAdmin ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300") },
            isAdmin ? "مشرف" : "دارس"
          )
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
    )
  );
};
