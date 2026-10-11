// مركز الإشعارات الداخلي والتعميمات (In-App Notification Center)
window.NotificationCenterModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var currentUser = props.currentUser;
  var notifications = props.notifications || [];
  var onSelectNotification = props.onSelectNotification;
  var onSendBroadcast = props.onSendBroadcast;

  var utils = window.APP_UTILS || {};
  var isAdmin = !!(currentUser && currentUser.role === "admin");

  var [activeFilter, setActiveFilter] = React.useState("all"); // 'all', 'unread'
  var [showBroadcastForm, setShowBroadcastForm] = React.useState(false);
  var [broadcastTitle, setBroadcastTitle] = React.useState("");
  var [broadcastBody, setBroadcastBody] = React.useState("");
  var [broadcastTarget, setBroadcastTarget] = React.useState("all");
  var [isSendingBroadcast, setIsSendingBroadcast] = React.useState(false);

  // معرفات الإشعارات المقروءة محلياً
  var [readIds, setReadIds] = React.useState(function() {
    return utils.getLocal ? utils.getLocal("counsel_read_notif_ids", []) : [];
  });

  var markAsRead = function(id) {
    if (!id || readIds.indexOf(id) !== -1) return;
    var updated = readIds.concat([id]);
    setReadIds(updated);
    if (utils.setLocal) utils.setLocal("counsel_read_notif_ids", updated);
  };

  var markAllAsRead = function() {
    var allIds = notifications.map(function(n) { return n.id; }).filter(Boolean);
    setReadIds(allIds);
    if (utils.setLocal) utils.setLocal("counsel_read_notif_ids", allIds);
  };

  if (!isOpen) return null;

  var filteredNotifications = notifications.filter(function(n) {
    // تصفية إشعارات التسجيل للمشرف فقط
    if (n.type === "user_registration" && !isAdmin) return false;
    if (n.type === "password_reset" && !isAdmin) return false;

    var isRead = readIds.indexOf(n.id) !== -1;
    if (activeFilter === "unread") return !isRead;
    return true;
  });

  var unreadCount = notifications.filter(function(n) {
    if (n.type === "user_registration" && !isAdmin) return false;
    if (n.type === "password_reset" && !isAdmin) return false;
    return readIds.indexOf(n.id) === -1;
  }).length;

  var handleBroadcastSubmit = async function(e) {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setIsSendingBroadcast(true);
    try {
      if (window.NotificationService && typeof window.NotificationService.broadcastCustomAnnouncement === "function") {
        await window.NotificationService.broadcastCustomAnnouncement(broadcastTitle.trim(), broadcastBody.trim(), broadcastTarget);
      }
      setBroadcastTitle("");
      setBroadcastBody("");
      setShowBroadcastForm(false);
      alert("✅ تم إرسال التعميم بنجاح لجميع الدارسين مع التنبيه الصوتي والرنين!");
    } catch (err) {
      alert("حدث خطأ أثناء إرسال التعميم: " + (err.message || err));
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  var formatNotifTime = function(createdAt) {
    if (!createdAt) return "الآن";
    var date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    var now = new Date();
    var diffMs = now - date;
    var diffMins = Math.floor(diffMs / 60000);
    var diffHours = Math.floor(diffMins / 60);
    var diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return "منذ لحظات";
    if (diffMins < 60) return "منذ " + diffMins + " دقيقة";
    if (diffHours < 24) return "منذ " + diffHours + " ساعة";
    if (diffDays === 1) return "أمس";
    if (diffDays < 7) return "منذ " + diffDays + " أيام";
    return date.toLocaleDateString("ar-EG");
  };

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto",
      onClick: function(e) { if (e.target === e.currentTarget && onClose) onClose(); }
    },
    React.createElement(
      "div",
      {
        className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-auto max-h-[90vh] flex flex-col font-cairo"
      },

      // رأس النافذة
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3" },
        React.createElement(
          "div",
          { className: "flex items-center gap-2.5" },
          React.createElement("div", { className: "w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0 shadow-2xs" }, "🔔"),
          React.createElement(
            "div",
            null,
            React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white leading-tight" }, "مركز الإشعارات والتنبيهات"),
            React.createElement("p", { className: "text-[11px] text-slate-500 dark:text-slate-400 mt-0.5" },
              unreadCount > 0 ? ("لديك " + unreadCount + " إشعار جديد غير مقروء") : "جميع الإشعارات والتحديثات الدراسية"
            )
          )
        ),
        React.createElement(
          "button",
          {
            onClick: onClose,
            className: "w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
          },
          "✕"
        )
      ),

      // قسم المشرف: إرسال تعميم رسمي للدارسين
      isAdmin && React.createElement(
        "div",
        { className: "border-b border-slate-100 dark:border-slate-800 pb-3" },
        !showBroadcastForm ? React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { setShowBroadcastForm(true); },
            className: "w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
          },
          React.createElement("span", null, "📢"),
          React.createElement("span", null, "إرسال تعميم أو تنبيه عام لجميع الدارسين")
        ) : React.createElement(
          "form",
          { onSubmit: handleBroadcastSubmit, className: "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5" },
          React.createElement("div", { className: "flex items-center justify-between" },
            React.createElement("h4", { className: "text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5" },
              React.createElement("span", null, "📢"),
              React.createElement("span", null, "كتابة تعميم جديد")
            ),
            React.createElement("button", { type: "button", onClick: function() { setShowBroadcastForm(false); }, className: "text-slate-400 text-xs hover:text-slate-600" }, "إلغاء")
          ),
          React.createElement("input", {
            type: "text",
            required: true,
            value: broadcastTitle,
            onChange: function(e) { setBroadcastTitle(e.target.value); },
            placeholder: "عنوان التعميم (مثال: موعد المحاضرة القادمة / امتحان المادة)",
            className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
          }),
          React.createElement("textarea", {
            rows: 2,
            required: true,
            value: broadcastBody,
            onChange: function(e) { setBroadcastBody(e.target.value); },
            placeholder: "نص التنبيه بالتفصيل للدارسين...",
            className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          }),
          React.createElement(
            "div",
            { className: "flex items-center justify-between pt-1" },
            React.createElement(
              "select",
              {
                value: broadcastTarget,
                onChange: function(e) { setBroadcastTarget(e.target.value); },
                className: "px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300"
              },
              React.createElement("option", { value: "all" }, "جميع الدارسين"),
              React.createElement("option", { value: "first_year" }, "السنة الأولى فقط"),
              React.createElement("option", { value: "second_year" }, "السنة الثانية فقط")
            ),
            React.createElement(
              "button",
              {
                type: "submit",
                disabled: isSendingBroadcast,
                className: "px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs shadow-xs hover:opacity-90 active:scale-95 disabled:opacity-50"
              },
              isSendingBroadcast ? "جاري الإرسال..." : "بث التنبيه فوراً 🚀"
            )
          )
        )
      ),

      // شريط الفرز وزر تحديد الكل كمقروء
      React.createElement(
        "div",
        { className: "flex items-center justify-between gap-2 pt-1 text-xs" },
        React.createElement(
          "div",
          { className: "flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setActiveFilter("all"); },
              className: "px-3 py-1 rounded-lg font-bold transition-all " +
                (activeFilter === "all" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs" : "text-slate-500 hover:text-slate-800")
            },
            "الكل (" + notifications.length + ")"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setActiveFilter("unread"); },
              className: "px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 " +
                (activeFilter === "unread" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs" : "text-slate-500 hover:text-slate-800")
            },
            React.createElement("span", null, "غير المقروءة"),
            unreadCount > 0 && React.createElement("span", { className: "w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-mono flex items-center justify-center font-bold" }, unreadCount)
          )
        ),
        unreadCount > 0 && React.createElement(
          "button",
          {
            type: "button",
            onClick: markAllAsRead,
            className: "text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
          },
          "تحديد الكل كمقروء ✓"
        )
      ),

      // قائمة الإشعارات القابلة للتمرير
      React.createElement(
        "div",
        { className: "flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[50vh]" },
        filteredNotifications.length === 0 ? React.createElement(
          "div",
          { className: "py-12 text-center text-slate-400 space-y-2" },
          React.createElement("div", { className: "text-3xl" }, "🔕"),
          React.createElement("p", { className: "font-bold text-sm text-slate-700 dark:text-slate-300" }, "لا توجد إشعارات حالياً"),
          React.createElement("p", { className: "text-xs text-slate-400" }, "ستصلك هنا تنبيهات فور نزول أي محاضرة أو ملف دراسي جديد.")
        ) : filteredNotifications.map(function(item) {
          var isRead = readIds.indexOf(item.id) !== -1;
          var timeStr = formatNotifTime(item.createdAt);

          return React.createElement(
            "div",
            {
              key: item.id,
              onClick: function() {
                markAsRead(item.id);
                if (onSelectNotification) onSelectNotification(item);
                if (onClose) onClose();
              },
              className: "p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 " +
                (isRead
                  ? "bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/60"
                  : "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/70 text-slate-900 dark:text-white shadow-2xs hover:bg-emerald-50/70")
            },
            // نقطة حالة القراءة
            React.createElement("div", { className: "pt-1 shrink-0" },
              !isRead ? React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500 block shadow-xs" })
                      : React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 block" })
            ),
            // محتوى الإشعار
            React.createElement(
              "div",
              { className: "flex-1 min-w-0" },
              React.createElement(
                "div",
                { className: "flex items-center justify-between gap-2 mb-0.5" },
                React.createElement("h4", { className: "text-xs font-bold truncate " + (isRead ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white") },
                  item.title
                ),
                React.createElement("span", { className: "text-[10px] text-slate-400 font-mono shrink-0" }, timeStr)
              ),
              React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed" },
                item.body
              )
            )
          );
        })
      )
    )
  );
};
