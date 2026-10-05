// شريط التنقل العلوي
window.Navbar = function(props) {
  var activeTab = props.activeTab;
  var onTabChange = props.onTabChange;
  var theme = props.theme;
  var onToggleTheme = props.onToggleTheme;

  return React.createElement(
    "header",
    {
      className: "sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-sm"
    },
    React.createElement(
      "div",
      { className: "max-w-6xl mx-auto px-4 h-16 flex items-center justify-between" },
      // العنوان والشعار
      React.createElement(
        "div",
        { className: "flex items-center gap-3 cursor-pointer", onClick: function() { onTabChange("lectures"); } },
        React.createElement(
          "div",
          { className: "w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-bold text-lg" },
          "🌿"
        ),
        React.createElement(
          "div",
          null,
          React.createElement("h1", { className: "text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight" }, "منصة المشورة الذكية"),
          React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400" }, "متابعة دراسية وتعلم ذكي")
        )
      ),

      // قائمة شاشات الحاسوب
      React.createElement(
        "nav",
        { className: "hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60" },
        [
          { id: "lectures", label: "المحاضرات", icon: "🎧" },
          { id: "books", label: "الكتب والمراجع", icon: "📚" },
          { id: "podcast", label: "التلخيص والبودكاست", icon: "🎙️" },
          { id: "tasks", label: "الجدول والمهام", icon: "📅" },
          { id: "settings", label: "الإعدادات", icon: "⚙️" }
        ].map(function(item) {
          var isActive = activeTab === item.id;
          return React.createElement(
            "button",
            {
              key: item.id,
              onClick: function() { onTabChange(item.id); },
              className: "px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 " +
                (isActive
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")
            },
            React.createElement("span", null, item.icon),
            React.createElement("span", null, item.label)
          );
        })
      ),

      // أزرار التحكم الجانبية (تبديل المظهر وإعدادات سريعة)
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
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
