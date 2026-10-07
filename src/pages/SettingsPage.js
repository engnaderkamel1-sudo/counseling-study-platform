// شاشة الإعدادات وربط المفاتيح السحابية
window.SettingsPage = function() {
  var utils = window.APP_UTILS;
  var cfg = window.APP_CONFIG;

  var [apiKey, setApiKey] = React.useState(function() {
    return utils.getLocal(cfg.storageKeys.apiKey, "");
  });
  var [savedToast, setSavedToast] = React.useState(false);
  var [copiedToast, setCopiedToast] = React.useState(false);

  React.useEffect(function() {
    var loadCloudKey = async function() {
      if (window.GeminiAIService && window.GeminiAIService.getApiKey) {
        var cloudKey = await window.GeminiAIService.getApiKey();
        if (cloudKey && !apiKey) {
          setApiKey(cloudKey);
        }
      }
    };
    loadCloudKey();
  }, []);

  var handleCopyKey = function() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(function() {
      setCopiedToast(true);
      setTimeout(function() { setCopiedToast(false); }, 2500);
    }).catch(function() {
      // Fallback
      var ta = document.createElement("textarea");
      ta.value = apiKey;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedToast(true);
      setTimeout(function() { setCopiedToast(false); }, 2500);
    });
  };
  var handleSaveKey = async function(e) {
    e.preventDefault();
    if (window.GeminiAIService && window.GeminiAIService.saveApiKey) {
      await window.GeminiAIService.saveApiKey(apiKey);
    }
    utils.setLocal(cfg.storageKeys.apiKey, apiKey.trim());
    setSavedToast(true);
    setTimeout(function() { setSavedToast(false); }, 2500);
  };

  return React.createElement(
    "div",
    { className: "max-w-3xl mx-auto space-y-6 pb-20 md:pb-8" },

    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm" },
      React.createElement("h2", { className: "text-xl font-bold text-slate-900 dark:text-white" }, "⚙️ إعدادات المنصة والربط السحابي"),
      React.createElement("p", { className: "text-sm text-slate-500 dark:text-slate-400 mt-1" }, "إدارة مفاتيح الذكاء الاصطناعي السحابية وربط التخزين")
    ),

    // بطاقة مفتاح الذكاء الاصطناعي
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
      React.createElement(
        "div",
        null,
        React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "مفتاح واجهة برمجة التطبيقات للذكاء الاصطناعي"),
        React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1" }, "يُخزن المفتاح بأمان داخل متصفحك الشخصي فقط، ويُستخدم لتوليد البودكاست وتلخيص المراجع.")
      ),
      React.createElement(
        "form",
        { onSubmit: handleSaveKey, className: "space-y-3" },
        React.createElement("input", {
          type: "password",
          value: apiKey,
          onChange: function(e) { setApiKey(e.target.value); },
          placeholder: "ضع المفتاح السحابي هنا...",
          className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        }),
        React.createElement(
          "div",
          { className: "flex flex-wrap items-center justify-between gap-2 pt-1" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            savedToast ? React.createElement("span", { className: "text-xs text-emerald-600 font-bold" }, "✓ تم حفظ المفتاح!") : null,
            copiedToast ? React.createElement("span", { className: "text-xs text-blue-600 font-bold" }, "📋 تم نسخ المفتاح!") : null
          ),
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("button", {
              type: "button",
              onClick: handleCopyKey,
              className: "bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1"
            }, "📋 نسخ المفتاح"),
            React.createElement("button", {
              type: "submit",
              className: "bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            }, "حفظ المفتاح")
          )
        )
      )
    ),

    // أداة استخراج النصوص المخفية
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3" },
      React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "أداة استخراج النصوص من الكتب"),
      React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4" }, "أداة خاصة ومخفية لرفع الكتاب واستخراج النص منه أوتوماتيكيا."),
      React.createElement("a", {
        href: "/ocr-tool.html",
        target: "_blank",
        className: "inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 text-center w-full sm:w-auto"
      }, "فتح أداة الاستخراج الآلي")
    ),
    // إرشادات ربط جوجل درايف
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3" },
      React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "💡 كيفية ربط ملفات جوجل درايف الكبيرة"),
      React.createElement(
        "ul",
        { className: "space-y-2 text-xs md:text-sm text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed" },
        React.createElement("li", null, "ارفع ملف المحاضرة (صوت أو فيديو) أو ملف الكتاب (PDF) إلى مجلد في حساب جوجل درايف الخاص بك."),
        React.createElement("li", null, "اضغط على مشاركة، واجعل الوصول: 'أي شخص لديه الرابط يمكنه العرض'."),
        React.createElement("li", null, "انسخ رابط الملف وضعه في خانة الرابط عند إضافة محاضرة أو كتاب جديد داخل التطبيق."),
        React.createElement("li", null, "المنصة ستقوم بتضمين الملف وتشغيله مباشرة دون استهلاك أي مساحة من خادم التطبيق.")
      )
    )
  );
};
