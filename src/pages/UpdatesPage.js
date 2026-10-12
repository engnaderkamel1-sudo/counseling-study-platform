// صفحة سجل التحديثات للمشرف (Changelog & Platform Updates Tracker)
window.UpdatesPage = function(props) {
  var currentUser = props.currentUser;
  var isAdmin = !!(currentUser && currentUser.role === "admin");
  var cfg = window.APP_CONFIG || {};

  var [historyList, setHistoryList] = React.useState(function() {
    return window.APP_UPDATES_HISTORY || [];
  });
  var [searchTerm, setSearchTerm] = React.useState("");
  var [isChecking, setIsChecking] = React.useState(false);
  var [serverBuildTime, setServerBuildTime] = React.useState(null);
  var [hasNewOnServer, setHasNewOnServer] = React.useState(false);

  // تنسيق التاريخ والوقت بصيغة 12 ساعة (ص / م) وحساب الوقت النسبي (منذ دقائق/ساعات)
  var formatUpdateDate = function(dateStr) {
    if (!dateStr) return { time: "", relative: "", full: "" };
    try {
      // التعامل مع الصيغ: 2026-10-12 18:54 أو ISO
      var normalized = dateStr.replace(" ", "T");
      var d = new Date(normalized);
      if (isNaN(d.getTime())) {
        d = new Date(dateStr);
      }
      if (isNaN(d.getTime())) return { time: dateStr, relative: "", full: dateStr };

      var now = new Date();
      var diffMs = now.getTime() - d.getTime();
      var diffSec = Math.floor(diffMs / 1000);
      var diffMin = Math.floor(diffSec / 60);
      var diffHours = Math.floor(diffMin / 60);
      var diffDays = Math.floor(diffHours / 24);

      var relative = "";
      if (diffSec < 60 && diffSec >= -30) {
        relative = "الآن";
      } else if (diffMin === 1) {
        relative = "منذ دقيقة";
      } else if (diffMin === 2) {
        relative = "منذ دقيقتين";
      } else if (diffMin >= 3 && diffMin <= 10) {
        relative = "منذ " + diffMin + " دقائق";
      } else if (diffMin > 10 && diffMin < 60) {
        relative = "منذ " + diffMin + " دقيقة";
      } else if (diffHours === 1) {
        relative = "منذ ساعة";
      } else if (diffHours === 2) {
        relative = "منذ ساعتين";
      } else if (diffHours >= 3 && diffHours <= 10) {
        relative = "منذ " + diffHours + " ساعات";
      } else if (diffHours > 10 && diffHours < 24) {
        relative = "منذ " + diffHours + " ساعة";
      } else if (diffDays === 1) {
        relative = "منذ يوم";
      } else if (diffDays === 2) {
        relative = "منذ يومين";
      } else if (diffDays >= 3 && diffDays <= 10) {
        relative = "منذ " + diffDays + " أيام";
      } else {
        relative = "منذ " + diffDays + " يوم";
      }

      // تنسيق بصيغة 12 ساعة (مثلاً 06:54 PM)
      var hours = d.getHours();
      var minutes = d.getMinutes();
      var period = hours >= 12 ? "PM" : "AM";
      var h12 = hours % 12;
      if (h12 === 0) h12 = 12;
      var pad = function(n) { return (n < 10 ? "0" : "") + n; };
      var time12 = pad(h12) + ":" + pad(minutes) + " " + period;
      var datePart = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

      return {
        time: time12,
        date: datePart,
        relative: relative,
        full: time12 + " • " + datePart
      };
    } catch (e) {
      return { time: dateStr, relative: "", full: dateStr };
    }
  };

  var formatTime = function(isoStr) {
    if (!isoStr) return "";
    var res = formatUpdateDate(isoStr);
    return res.full + (res.relative ? (" (" + res.relative + ")") : "");
  };

  // فحص السيرفر ومقارنة الإصدار النشط
  var handleCheckServer = async function() {
    setIsChecking(true);
    try {
      var base = window.location.href.split("#")[0].split("?")[0];
      var resp = await fetch(base + "?t=" + Date.now(), {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      if (resp.ok) {
        var text = await resp.text();
        var matchTime = text.match(/buildTime:\s*"([^"]+)"/);
        var matchVer = text.match(/version:\s*"([^"]+)"/);
        var sTime = matchTime ? matchTime[1] : null;
        var sVer = matchVer ? matchVer[1] : null;
        setServerBuildTime(sTime);

        if (sTime && sTime !== cfg.buildTime) {
          setHasNewOnServer(true);
        } else if (sVer && sVer !== cfg.version) {
          setHasNewOnServer(true);
        } else {
          setHasNewOnServer(false);
          alert("✓ النسخة الحالية في متصفحك مطابقة 100% لأحدث نسخة منشورة على السيرفر!");
        }
      }
    } catch (err) {
      alert("تعذر الوصول للسيرفر للتحقق: " + err.message);
    } finally {
      setIsChecking(false);
    }
  };

  // إفراغ الكاش وإعادة التحميل الفوري
  var handleHardRefresh = function() {
    if ("caches" in window) {
      caches.keys().then(function(names) {
        for (var i = 0; i < names.length; i++) caches.delete(names[i]);
      });
    }
    var cleanUrl = window.location.href.split("?")[0].split("#")[0] + "?v=" + Date.now() + (window.location.hash || "");
    window.location.href = cleanUrl;
  };

  var filteredList = historyList.filter(function(item) {
    if (!searchTerm) return true;
    var q = searchTerm.toLowerCase();
    return (item.message && item.message.toLowerCase().indexOf(q) !== -1) ||
           (item.hash && item.hash.toLowerCase().indexOf(q) !== -1) ||
           (item.date && item.date.indexOf(q) !== -1);
  });

  return React.createElement(
    "div",
    { className: "space-y-6 pb-12 animate-fade-in" },

    // بطاقة الرأس والتحكم بالإصدار
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm" },
      React.createElement(
        "div",
        { className: "flex flex-col md:flex-row md:items-center justify-between gap-4" },
        React.createElement(
          "div",
          { className: "flex items-start gap-3.5" },
          React.createElement(
            "div",
            { className: "w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl shrink-0" },
            "🚀"
          ),
          React.createElement(
            "div",
            null,
            React.createElement("h1", { className: "text-xl font-black text-slate-900 dark:text-white" }, "سجل تحديثات المنصة (آخر 50 تحديث)"),
            React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1" },
              "تتبع حي لكافة التعديلات، الإصلاحات والميزات المضافة في النظام لحظة بلحظة"
            )
          )
        ),

        // أزرار التحقق والتحديث
        React.createElement(
          "div",
          { className: "flex items-center gap-2 flex-wrap" },
          React.createElement(
            "button",
            {
              onClick: handleCheckServer,
              disabled: isChecking,
              className: "flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            },
            React.createElement("span", { className: isChecking ? "animate-spin" : "" }, "📡"),
            React.createElement("span", null, isChecking ? "جاري الفحص..." : "فحص السيرفر الآن")
          ),
          React.createElement(
            "button",
            {
              onClick: handleHardRefresh,
              className: "flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition-all active:scale-95"
            },
            React.createElement("span", null, "🔄"),
            React.createElement("span", null, "إفراغ الذاكرة المؤقتة وإعادة التحميل")
          )
        )
      ),

      // بطاقة الإصدار الحالي النشط في متصفحك
      React.createElement(
        "div",
        { className: "mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3" },
        React.createElement(
          "div",
          { className: "p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80" },
          React.createElement("p", { className: "text-[11px] text-slate-500 font-semibold" }, "الإصدار النشط على جهازك:"),
          React.createElement("p", { className: "text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5" }, cfg.version || "1.2.0")
        ),
        React.createElement(
          "div",
          { className: "p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80" },
          React.createElement("p", { className: "text-[11px] text-slate-500 font-semibold" }, "وقت بناء النسخة الحالية:"),
          React.createElement("p", { className: "text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5" }, formatTime(cfg.buildTime))
        ),
        React.createElement(
          "div",
          { className: "p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800" },
          React.createElement("p", { className: "text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold" }, "حالة الاتصال والتشغيل:"),
          React.createElement("div", { className: "flex items-center gap-1.5 mt-0.5" },
            React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }),
            React.createElement("span", { className: "text-xs font-black text-emerald-800 dark:text-emerald-300" }, "النظام يعمل بأحدث كود")
          )
        )
      ),

      // تنبيه إذا وجد تحديث على السيرفر
      hasNewOnServer && React.createElement(
        "div",
        { className: "mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center justify-between gap-3 animate-pulse" },
        React.createElement(
          "div",
          { className: "flex items-center gap-2 text-xs font-bold" },
          React.createElement("span", { className: "text-base" }, "🔔"),
          React.createElement("span", null, "تم رصد نسخة أحدث على السيرفر! اضغط هنا لتحميلها فوراً:")
        ),
        React.createElement(
          "button",
          {
            onClick: handleHardRefresh,
            className: "px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95"
          },
          "تطبيق التحديث 🔄"
        )
      )
    ),

    // شريط البحث في التحديثات
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-4" },
      React.createElement(
        "div",
        { className: "relative flex-1 max-w-md" },
        React.createElement("input", {
          type: "text",
          value: searchTerm,
          onChange: function(e) { setSearchTerm(e.target.value); },
          placeholder: "ابحث في تفاصيل التحديثات أو رقم الـ Commit...",
          className: "w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
        }),
        React.createElement("span", { className: "absolute left-3 top-2.5 text-xs text-slate-400" }, "🔍")
      ),
      React.createElement(
        "span",
        { className: "text-xs text-slate-500 font-medium" },
        "إجمالي المعروض: " + filteredList.length + " تحديث"
      )
    ),

    // الجدول الزمني (Timeline) لآخر 50 تحديث
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
      filteredList.length === 0 ? React.createElement(
        "p",
        { className: "text-center py-8 text-xs text-slate-400" },
        "لا توجد نتائج مطابقة لبحثك."
      ) : filteredList.map(function(item, idx) {
        var isLatest = idx === 0;
        return React.createElement(
          "div",
          {
            key: item.hash || idx,
            className: "flex items-start gap-4 p-3.5 rounded-xl transition-colors " +
              (isLatest
                ? "bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80"
                : "hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800")
          },
          // أيقونة الترتيب أو الشارة
          React.createElement(
            "div",
            {
              className: "w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 " +
                (isLatest
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400")
            },
            isLatest ? "★" : (idx + 1)
          ),

          // المحتوى
          React.createElement(
            "div",
            { className: "flex-1 min-w-0" },
            React.createElement(
              "div",
              { className: "flex flex-wrap items-center justify-between gap-2" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2" },
                React.createElement(
                  "span",
                  { className: "font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100" },
                  item.message || "تحديث عام للمنصة"
                ),
                isLatest ? React.createElement(
                  "span",
                  { className: "px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white animate-pulse" },
                  "أحدث تحديث منشُور"
                ) : null
              ),
              (function() {
                var dt = formatUpdateDate(item.date);
              return React.createElement(
                "div",
                { className: "flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 shrink-0 flex-wrap" },
                dt.relative ? React.createElement(
                  "span",
                  { className: "px-2 py-0.5 rounded-full font-sans font-bold text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 shadow-2xs" },
                  "⏱️ " + dt.relative
                ) : null,
                React.createElement(
                  "span",
                  { className: "font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1" },
                  React.createElement("span", null, "🕒"),
                  React.createElement("span", null, dt.time || item.date)
                ),
                dt.date ? React.createElement(
                  "span",
                  { className: "text-slate-400 text-[10px] hidden sm:inline" },
                  dt.date
                ) : null,
                React.createElement(
                  "span",
                  { className: "bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300" },
                  item.hash
                )
              );
            })()
            )
          )
        );
      })
    )
  );
};
