// شاشة التلخيص والبودكاست التفاعلي مع الربط الفعلي بنماذج جيميني
window.SummaryPodcastPage = function() {
  var utils = window.APP_UTILS;
  var cfg = window.APP_CONFIG;
  var ai = window.GeminiAIService;

  var [lectures, setLectures] = React.useState(function() {
    return utils.getLocal(cfg.storageKeys.lectures, []);
  });

  var [selectedLectureId, setSelectedLectureId] = React.useState(lectures[0] ? lectures[0].id : "");
  var [summaryType, setSummaryType] = React.useState("podcast"); // podcast or exam
  var [isGenerating, setIsGenerating] = React.useState(false);
  var [generatedContent, setGeneratedContent] = React.useState("");
  var [errorMsg, setErrorMsg] = React.useState("");
  var [isDisclaimerDismissed, setIsDisclaimerDismissed] = React.useState(false);

  var selectedLecture = lectures.find(function(l) { return l.id === selectedLectureId; }) || lectures[0] || null;

  var handleGenerate = async function() {
    if (!selectedLecture) {
      alert("يرجى اختيار محاضرة أولاً");
      return;
    }

    setIsGenerating(true);
    setErrorMsg("");
    setGeneratedContent("");

    try {
      var result = "";
      if (summaryType === "podcast") {
        result = await ai.generatePodcastDialogue(selectedLecture.title, selectedLecture.notes);
      } else {
        result = await ai.generateExamSummary(selectedLecture.title, selectedLecture.notes);
      }
      setGeneratedContent(result);
    } catch (err) {
      setErrorMsg(err.message || "حدث خطأ أثناء التوليد");
    } finally {
      setIsGenerating(false);
    }
  };

  return React.createElement(
    "div",
    { className: "space-y-6 pb-12" },

    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm" },
      React.createElement("h2", { className: "text-xl font-bold text-slate-900 dark:text-white" }, "الملخصات والحوار الصوتي"),
      React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1" }, "تحويل موضوعات وملاحظات المحاضرات إلى حوار بودكاست تفاعلي أو مراجعة سريعة ليلة الامتحان")
    ),

    // أدوات الاختيار
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
      React.createElement(
        "div",
        { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" },
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1" }, "اختر المحاضرة من الأرشيف"),
          React.createElement("select", {
            value: selectedLectureId,
            onChange: function(e) { setSelectedLectureId(e.target.value); },
            className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs md:text-sm text-slate-900 dark:text-white"
          }, lectures.map(function(l) {
            return React.createElement("option", { key: l.id, value: l.id }, l.title + " (" + l.speaker + ")");
          }))
        ),
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1" }, "الصيغة المطلوبة"),
          React.createElement(
            "div",
            { className: "flex items-center gap-2 mt-1" },
            React.createElement(
              "button",
              {
                onClick: function() { setSummaryType("podcast"); },
                className: "flex-1 py-2 rounded-xl text-xs font-bold border transition-all " +
                  (summaryType === "podcast"
                    ? "bg-slate-900 dark:bg-emerald-600 text-white border-transparent"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700")
              },
              "🎙️ حوار بودكاست مسموع"
            ),
            React.createElement(
              "button",
              {
                onClick: function() { setSummaryType("exam"); },
                className: "flex-1 py-2 rounded-xl text-xs font-bold border transition-all " +
                  (summaryType === "exam"
                    ? "bg-slate-900 dark:bg-emerald-600 text-white border-transparent"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700")
              },
              "📝 كبسولة مراجعة الامتحان"
            )
          )
        )
      ),

      React.createElement(
        "div",
        { className: "flex justify-end pt-2" },
        React.createElement(
          "button",
          {
            onClick: handleGenerate,
            disabled: isGenerating,
            className: "bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
          },
          React.createElement("span", null, isGenerating ? "⏳" : "✨"),
          React.createElement("span", null, isGenerating ? "جاري الإعداد والتحليل..." : "بدء التلخيص")
        )
      )
    ),

    // رسائل الخطأ إن وجدت
    errorMsg && React.createElement(
      "div",
      { className: "p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs" },
      errorMsg
    ),

    // عرض المخرجات المولدة
    generatedContent && React.createElement(
      "div",
      { className: "space-y-4" },
      !isDisclaimerDismissed && React.createElement(
        "div",
        {
          className: "flex items-start sm:items-center justify-between gap-3 p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 dark:border-amber-400/20 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium transition-all shadow-xs animate-fadeIn"
        },
        React.createElement(
          "div",
          { className: "flex items-start sm:items-center gap-2 sm:gap-2.5 flex-1 leading-relaxed" },
          React.createElement("span", { className: "text-base sm:text-lg shrink-0 mt-0.5 sm:mt-0" }, "💡"),
          React.createElement(
            "p",
            null,
            React.createElement("strong", { className: "font-black ml-1 text-amber-800 dark:text-amber-300" }, "تنبيه استرشادي:"),
            "هذه الملخصات والأدوات الذكية أُنشئت آلياً للمساعدة في المراجعة السريعة وترتيب الأفكار، ولا تغني بأي حال عن الرجوع للمحاضرة الأصلية والمرجع المعتمد."
          )
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { setIsDisclaimerDismissed(true); },
            title: "إخفاء التنبيه لهذه الجلسة",
            className: "p-1.5 rounded-xl text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 hover:bg-amber-500/20 dark:hover:bg-amber-400/20 transition-all shrink-0 cursor-pointer flex items-center justify-center",
            "aria-label": "إغلاق التنبيه"
          },
          React.createElement(
            "svg",
            { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2.5" },
            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" })
          )
        )
      ),
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" },
            summaryType === "podcast" ? "🎧 سيناريو حوار البودكاست (فادي وسارة)" : "📋 كبسولة مراجعة الامتحان"
          ),
          React.createElement("span", { className: "text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg font-bold" }, "جاهز للاستماع والقراءة")
        ),
        React.createElement(
          "div",
          { className: "text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl" },
          generatedContent
        )
      )
    )
  );
};
