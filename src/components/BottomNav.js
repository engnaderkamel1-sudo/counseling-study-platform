// شريط التنقل السفلي المخصص لشاشات الهواتف المحمولة
window.BottomNav = function(props) {
  var activeTab = props.activeTab;
  var onTabChange = props.onTabChange;

  var items = [
    { id: "lectures", label: "المحاضرات", icon: "🎙️" },
    { id: "books", label: "المراجع", icon: "📚" },
    { id: "curriculum", label: "المنهج", icon: "📑" },
    { id: "notes", label: "ملاحظاتي", icon: "📝" },
    { id: "menu", label: "القائمة", icon: "☰" }
  ];

  return React.createElement(
    "nav",
    {
      className: "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-lg px-2 pt-1.5 mobile-bottom-nav flex items-center justify-around"
    },
    items.map(function(item) {
      var isActive = activeTab === item.id;
      return React.createElement(
        "button",
        {
          key: item.id,
          onClick: function() {
            if (item.id === "menu") {
              if (props.onToggleSidebar) props.onToggleSidebar();
            } else {
              onTabChange(item.id);
            }
          },
          className: "flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[44px] rounded-xl transition-all active:scale-95 " +
            (isActive
              ? "text-emerald-600 dark:text-emerald-400 font-bold scale-105"
              : "text-slate-500 dark:text-slate-400 font-medium")
        },
        React.createElement("span", { className: "text-lg leading-none mb-1" }, item.icon),
        React.createElement("span", { className: "text-[11px]" }, item.label)
      );
    })
  );
};
