// القائمة الجانبية المركزة مع قسم بلاغات الأعطال للمسؤول
window.Sidebar = function(props) {
  var activeTab = props.activeTab;
  var onTabChange = props.onTabChange;
  var currentUser = props.currentUser;
  var onSwitchRole = props.onSwitchRole;
  var onOpenAuth = props.onOpenAuth;
  var isOpen = props.isOpen;
  var onClose = props.onClose;

  var menuItems = [
    { id: "lectures", label: "المحاضرات الدراسية", icon: "🎙️" },
    { id: "books", label: "المراجع والكتب", icon: "📚" },
    { id: "curriculum", label: "المنهج الدراسي والتقارير", icon: "📑" },
    { id: "notes", label: "ملاحظاتي الدراسية", icon: "📝" }
  ];

  var isAdmin = !!(currentUser && currentUser.role === "admin");
  if (isAdmin) {
    menuItems.push({ id: "users", label: "إدارة الدارسين والطلبات", icon: "👥" });
    menuItems.push({ id: "errors", label: "بلاغات الأعطال والصيانة", icon: "🛠️" });
  }

  menuItems.push({ id: "settings", label: "الإعدادات العامة", icon: "⚙️" });

  return React.createElement(
    React.Fragment,
    null,
    isOpen && React.createElement("div", {
      onClick: onClose,
      className: "fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
    }),

    React.createElement(
      "aside",
      {
        className: "fixed top-0 bottom-0 right-0 z-50 w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out " +
          (isOpen ? "translate-x-0 shadow-2xl" : "translate-x-full")
      },
      React.createElement(
        "div",
        { className: "p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between" },
        React.createElement(
          "div",
          { className: "flex items-center gap-3" },
          React.createElement("div", { className: "w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-lg shadow-sm" }, "🌿"),
          React.createElement(
            "div",
            null,
            React.createElement("h2", { className: "text-base font-bold text-slate-900 dark:text-white" }, "دراسة المشورة"),
            React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400" }, "منظومة متابعة الدارسين")
          )
        ),
        React.createElement("button", {
          onClick: onClose,
          title: "إخفاء القائمة الجانبية لتوسيع الشاشة",
          className: "text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold"
        },
          React.createElement("span", { className: "text-base" }, "✕"),
          React.createElement("span", { className: "hidden sm:inline text-[11px]" }, "إخفاء")
        )
      ),

      React.createElement(
        "div",
        { className: "p-4 mx-4 my-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between" },
          React.createElement(
            "div",
            null,
            React.createElement("span", { className: "text-xs text-slate-500 block" }, "الحساب الحالي:"),
            React.createElement("span", { className: "text-sm font-bold text-slate-900 dark:text-white" }, (currentUser && currentUser.fullName) || "الأدمن")
          ),
          React.createElement("span", { className: "text-[11px] px-2 py-0.5 rounded-md font-bold " + (isAdmin ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700") },
            isAdmin ? "مسؤول" : "دارس"
          )
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2 pt-1" },
          React.createElement(
            "button",
            {
              onClick: onOpenAuth,
              className: "flex-1 text-xs py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-center"
            },
            "تبديل الحساب"
          )
        ),
        React.createElement(
          "div",
          { className: "space-y-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50" },
          // زر تفعيل التنبيهات البارز
          React.createElement(
            "button",
            {
              onClick: props.onToggleNotification,
              className: "w-full text-xs py-2 px-3 rounded-xl border font-bold flex items-center justify-between transition-all " +
                (props.hasNotificationPermission
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-sm")
            },
            React.createElement("div", { className: "flex items-center gap-2" },
              React.createElement("span", { className: "text-base" }, "🔔"),
              React.createElement("span", null, props.hasNotificationPermission ? "الإشعارات مفعلة بنجاح" : "اضغط هنا لتفعيل التنبيهات")
            ),
            React.createElement("span", { className: "text-[11px] opacity-75" }, props.hasNotificationPermission ? "✓" : "👈")
          ),
          React.createElement(
            "div",
            { className: "grid grid-cols-2 gap-2" },
            // زر تثبيت التطبيق
            React.createElement(
              "button",
              {
                onClick: props.onOpenInstallPrompt,
                className: "text-[11px] py-1.5 px-2 rounded-xl bg-slate-800 dark:bg-slate-200 border border-slate-700 text-white dark:text-slate-900 font-bold flex items-center justify-center gap-1.5 shadow-2xs"
              },
              React.createElement("span", null, "📲"),
              React.createElement("span", null, "تثبيت التطبيق")
            ),
            // زر إبلاغ عن عطل
            React.createElement(
              "button",
              {
                onClick: function() {
                  if (props.onOpenErrorReport) props.onOpenErrorReport();
                  if (onClose) onClose();
                },
                className: "text-[11px] py-1.5 px-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center gap-1.5"
              },
              React.createElement("span", null, "🚨"),
              React.createElement("span", null, "إبلاغ عن عطل")
            )
          )
        )
      ),

      React.createElement(
        "nav",
        { className: "flex-1 px-3 py-2 space-y-1 overflow-y-auto" },
        menuItems.map(function(item) {
          var isActive = activeTab === item.id;
          return React.createElement(
            "button",
            {
              key: item.id,
              onClick: function() {
                onTabChange(item.id);
                onClose();
              },
              className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-right " +
                (isActive
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60")
            },
            React.createElement("span", { className: "text-lg" }, item.icon),
            React.createElement("span", null, item.label)
          );
        })
      ),

      React.createElement(
        "div",
        { className: "p-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400" },
        "منصة المشورة • دراسة شخصية مستقلة للدارسين"
      )
    )
  );
};
