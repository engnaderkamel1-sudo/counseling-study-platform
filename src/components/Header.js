// شريط الترويسة العلوي مع زر الإبلاغ عن عطل السريع
window.Header = function(props) {
  var onOpenSidebar = props.onOpenSidebar;
  var theme = props.theme;
  var onToggleTheme = props.onToggleTheme;
  var currentUser = props.currentUser;
  var onOpenErrorReport = props.onOpenErrorReport;

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
            title: props.isSidebarOpen ? "إغفاء القائمة الجانبية لتوسيع الشاشة" : "إظهار القائمة الجانبية",
            className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all border border-slate-300 dark:border-slate-700 shadow-2xs active:scale-95"
          },
          React.createElement("span", { className: "text-base" }, "☰"),
          React.createElement("span", { className: "text-[11px]" }, props.isSidebarOpen ? "إخفاء القائمة" : "القائمة")
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2" },
          React.createElement("h1", { className: "text-base md:text-lg font-bold text-slate-900 dark:text-white" }, "منصة متابعة المشورة"),
          React.createElement("span", { className: "hidden sm:inline-block text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-medium" }, "دفعة المشورة")
        )
      ),

      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
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
