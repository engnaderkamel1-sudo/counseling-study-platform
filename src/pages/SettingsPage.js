// شاشة الإعدادات وربط المفاتيح السحابية
window.SettingsPage = function(props) {
  var currentUser = (props && props.currentUser) || { role: "student" };
  var utils = window.APP_UTILS;
  var cfg = window.APP_CONFIG;

  if (!currentUser || currentUser.role !== "admin") {
    return React.createElement(
      "div",
      { className: "p-12 text-center text-slate-500 space-y-3 font-cairo" },
      React.createElement("div", { className: "text-4xl" }, "🔒"),
      React.createElement("h3", { className: "text-base font-bold text-slate-800 dark:text-white" }, "هذه الصفحة مخصصة لمشرف المنصة فقط"),
      React.createElement("p", { className: "text-xs text-slate-400" }, "ليس لديك الصلاحيات الكافية لتعديل إعدادات ومفاتيح المنصة.")
    );
  }

  var [apiKey, setApiKey] = React.useState(function() {
    return utils.getLocal(cfg.storageKeys.apiKey, "");
  });
  var [savedToast, setSavedToast] = React.useState(false);
  var [copiedToast, setCopiedToast] = React.useState(false);

  // إعدادات محرك الصوت Microsoft Azure Speech
  var ttsService = window.EdgeTtsService;
  var initialAzure = ttsService ? ttsService.getAzureConfig() : { key1: "", key2: "", region: "eastus", voice: "ar-EG-SalmaNeural" };
  var [azureKey1, setAzureKey1] = React.useState(initialAzure.key1);
  var [azureKey2, setAzureKey2] = React.useState(initialAzure.key2);
  var [azureRegion, setAzureRegion] = React.useState(initialAzure.region);
  var [azureSavedToast, setAzureSavedToast] = React.useState(false);

  // حالة فحص وتجربة الصوت المباشر
  var [isTestingAudio, setIsTestingAudio] = React.useState(false);
  var [audioTestMsg, setAudioTestMsg] = React.useState("");

  // إحصائيات استهلاك الكوتا
  var usageStats = ttsService ? ttsService.getUsageStats() : { key1Chars: 0, key2Chars: 0 };
  var quotaLimit = (ttsService && ttsService.MONTHLY_QUOTA_LIMIT) || 500000;

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

  // حفظ إعدادات محرك Azure Speech
  var handleSaveAzureConfig = function(e) {
    if (e) e.preventDefault();
    if (ttsService) {
      ttsService.saveAzureConfig({
        key1: azureKey1,
        key2: azureKey2,
        region: azureRegion
      });
    }
    setAzureSavedToast(true);
    setTimeout(function() { setAzureSavedToast(false); }, 2500);
  };

  // تجربة صوت سلمى مباشرة والتأكد من نقائه
  var handleTestAzureAudio = async function() {
    if (!azureKey1 && !azureKey2) {
      alert("يرجى إدخال مفتاح واحد على الأقل أولاً لتجربة الصوت.");
      return;
    }

    // حفظ المفاتيح قبل الفحص
    handleSaveAzureConfig();

    setIsTestingAudio(true);
    setAudioTestMsg("جاري الاتصال بمحرك Azure وتوليد صوت سلمى...");

    try {
      var testText = "إن معرفة النفس وقبول مشاعرنا بصدق، هي الخطوة الأولى نحو الشفاء الداخلي والنضج الروحي الحقيقي.";
      var res = await ttsService.generateAudioForText(testText, null, function(st) {
        setAudioTestMsg(st);
      });

      var audioUrl = (res && typeof res === "object" && res.audioUrl) ? res.audioUrl : res;
      if (!audioUrl) throw new Error("لم يتم استلام رابط صوتي من الخدمة.");

      var audio = new Audio(audioUrl);
      setAudioTestMsg("🔊 جاري تشغيل صوت سلمى الآن...");
      audio.onended = function() {
        setAudioTestMsg("✓ تم الاستماع بنجاح! الصوت شغال ونقي 100%.");
        setTimeout(function() { setAudioTestMsg(""); }, 5000);
      };
      await audio.play();
    } catch (testErr) {
      console.error("Audio test error:", testErr);
      setAudioTestMsg("❌ فشل الاتصال: " + (testErr.message || testErr));
    } finally {
      setIsTestingAudio(false);
    }
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

    // بطاقة محرك الصوت الرسمي Microsoft Azure Speech (باقة مجانية 500,000 حرف لكل حساب)
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5" },
      React.createElement(
        "div",
        { className: "flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4" },
        React.createElement(
          "div",
          null,
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white flex items-center gap-2" },
            React.createElement("span", null, "🎙️"),
            "محرك الصوت الرسمي (Microsoft Azure Speech)"
          ),
          React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1" },
            "توليد صوت «سلمى» الرسمي النقي (`ar-EG-SalmaNeural`) مع دعم مفتاحين للتبديل الذكي ومراقبة الكوتا."
          )
        ),
        React.createElement(
          "span",
          { className: "px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" },
          "500,000 حرف مجاناً / حساب شهرياً"
        )
      ),

      React.createElement(
        "form",
        { onSubmit: handleSaveAzureConfig, className: "space-y-4" },

        // المفتاح الأول
        React.createElement(
          "div",
          { className: "space-y-1.5" },
          React.createElement(
            "div",
            { className: "flex items-center justify-between text-xs" },
            React.createElement("label", { className: "font-bold text-slate-700 dark:text-slate-300" }, "المفتاح الأساسي 1 (Account 1 Key):"),
            React.createElement("span", { className: "text-slate-400 font-mono text-[11px]" },
              "الاستهلاك: " + (usageStats.key1Chars || 0).toLocaleString() + " / " + quotaLimit.toLocaleString() + " حرف"
            )
          ),
          React.createElement("input", {
            type: "password",
            value: azureKey1,
            onChange: function(e) { setAzureKey1(e.target.value); },
            placeholder: "أدخل مفتاح Azure Speech الأول...",
            className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          }),
          // شريط استهلاك المفتاح 1
          React.createElement(
            "div",
            { className: "w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden" },
            React.createElement("div", {
              className: ((usageStats.key1Chars || 0) > 450000 ? "bg-amber-500" : "bg-teal-500") + " h-full transition-all",
              style: { width: Math.min(100, Math.round(((usageStats.key1Chars || 0) / quotaLimit) * 100)) + "%" }
            })
          )
        ),

        // المفتاح الثاني (الاحتياطي لحساب آخر)
        React.createElement(
          "div",
          { className: "space-y-1.5 pt-1" },
          React.createElement(
            "div",
            { className: "flex items-center justify-between text-xs" },
            React.createElement("label", { className: "font-bold text-slate-700 dark:text-slate-300" }, "المفتاح الثاني 2 (Account 2 Key - اختياري لحساب ثانٍ):"),
            React.createElement("span", { className: "text-slate-400 font-mono text-[11px]" },
              "الاستهلاك: " + (usageStats.key2Chars || 0).toLocaleString() + " / " + quotaLimit.toLocaleString() + " حرف"
            )
          ),
          React.createElement("input", {
            type: "password",
            value: azureKey2,
            onChange: function(e) { setAzureKey2(e.target.value); },
            placeholder: "أدخل مفتاح حساب مايكروسوفت الثاني لمضاعفة الكوتا لمليون حرف...",
            className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          }),
          // شريط استهلاك المفتاح 2
          React.createElement(
            "div",
            { className: "w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden" },
            React.createElement("div", {
              className: ((usageStats.key2Chars || 0) > 450000 ? "bg-amber-500" : "bg-blue-500") + " h-full transition-all",
              style: { width: Math.min(100, Math.round(((usageStats.key2Chars || 0) / quotaLimit) * 100)) + "%" }
            })
          )
        ),

        // المنطقة السحابية (Region)
        React.createElement(
          "div",
          { className: "space-y-1.5 pt-1" },
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "منطقة الخادم السحابي (Service Region):"),
          React.createElement("input", {
            type: "text",
            value: azureRegion,
            onChange: function(e) { setAzureRegion(e.target.value); },
            placeholder: "الافتراضي: eastus",
            className: "w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          }),
          React.createElement("p", { className: "text-[11px] text-slate-400" }, "الموقع الافتراضي هو eastus، اضبطه فقط إذا أنشأت المورد في منطقة جغرافية أخرى (مثل westeurope أو uaenorth).")
        ),

        // أزرار الحفظ والتجربة الفورية
        React.createElement(
          "div",
          { className: "pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            azureSavedToast ? React.createElement("span", { className: "text-xs text-emerald-600 font-bold" }, "✓ تم حفظ إعدادات الصوت!") : null,
            audioTestMsg ? React.createElement("span", { className: "text-xs text-blue-600 dark:text-blue-400 font-bold" }, audioTestMsg) : null
          ),
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("button", {
              type: "button",
              onClick: handleTestAzureAudio,
              disabled: isTestingAudio,
              className: "bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-teal-600/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            },
              React.createElement("span", null, isTestingAudio ? "⏳" : "🔊"),
              isTestingAudio ? "جاري التوليد..." : "تجربة واستماع لصوت سلمى"
            ),
            React.createElement("button", {
              type: "submit",
              className: "bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs md:text-sm font-bold border border-slate-700 active:scale-95 transition-all"
            }, "حفظ المفاتيح")
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
