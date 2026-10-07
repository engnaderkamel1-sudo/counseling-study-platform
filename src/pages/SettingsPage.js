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

    // دليل دورة تجهيز الكتب الصوتية المتكامل
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5" },
      React.createElement("div", null,
        React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white flex items-center gap-2" }, "🎧 ستوديو تجهيز الكتب الصوتية المدمج"),
        React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1" }, "ثلاث خطوات عملية وبسيطة لتحويل أي كتاب مصور إلى تراك صوتي نقي يعمل مباشرة داخل التطبيق للدارسين:")
      ),

      // الخطوة 1
      React.createElement(
        "div",
        { className: "p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2" },
        React.createElement("div", { className: "text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5" },
          React.createElement("span", { className: "w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]" }, "1"),
          "الخطوة الأولى: استخراج النص العربي من الكتاب المصور"
        ),
        React.createElement("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed" }, "افتح أداة الاستخراج، اختر ملف الكتاب، وسيتم قراءة الصفحات واستخراج الكلمات العربية الأصلية بنسبة 100% بدون أي تلخيص."),
        React.createElement("a", {
          href: "/ocr-tool.html?key=" + encodeURIComponent(apiKey || ""),
          target: "_blank",
          className: "inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all mt-1"
        }, "🚀 فتح أداة استخراج نصوص الكتاب")
      ),

      // الخطوة 2
      React.createElement(
        "div",
        { className: "p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2" },
        React.createElement("div", { className: "text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5" },
          React.createElement("span", { className: "w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]" }, "2"),
          "الخطوة الثانية: توليد ملف الصوت البشري (MP3) مجاناً"
        ),
        React.createElement("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed" }, "انسخ النص الناتج وافتحه في موقع الصوت المجاني، اختر صوت شاكر أو سلمى واضغط تحميل ملف الصوت:"),
        React.createElement("a", {
          href: "https://edge-tts.com",
          target: "_blank",
          className: "inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all mt-1"
        }, "🌐 فتح موقع تحويل النصوص لصوت (Edge-TTS)")
      ),

      // الخطوة 3
      React.createElement(
        "div",
        { className: "p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-2" },
        React.createElement("div", { className: "text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5" },
          React.createElement("span", { className: "w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]" }, "3"),
          "الخطوة الثالثة: ربط الكتاب والصوت بالتطبيق بضغطة زر"
        ),
        React.createElement("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed" }, "اذهب لقسم المراجع والكتب، واضغط إضافة كتاب جديد. اختر ملف الـ PDF للقراءة، واختر ملف الصوت الذي حملته للاستماع، والتطبيق سيتولى ربطهما تلقائياً للدارسين!"),
        React.createElement("a", {
          href: "/#books",
          className: "inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all mt-1"
        }, "📚 الذهاب لقسم الكتب لإضافة التراك")
      )
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
