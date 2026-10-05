// شاشة المنهج الدراسي والتقارير التفاعلية المجهزة للمستقبل (Interactive Report & NotebookLM style)
window.CurriculumPage = function(props) {
  var currentUser = props.currentUser || { role: "admin" };
  var ai = window.GeminiAIService;
  var [reportText, setReportText] = React.useState("");
  var [isGenerating, setIsGenerating] = React.useState(false);

  var handleGenerateReport = async function() {
    if (currentUser.role !== "admin") return;
    setIsGenerating(true);
    try {
      var prompt = "قم بإعداد تقرير دراسي تفاعلي شامل (Interactive Study Guide) لدراسة المشورة:\n" +
        "1. الخريطة الذهنية الكبرى للمنهج.\n" +
        "2. شبكة العلاقات بين الموضوعات (الصدمات، آليات الدفاع، الشفاء الداخلي، والحدود).\n" +
        "3. بنك أسئلة استبصار وتطبيقات لحالات واقعية مع الإجابات النموذجية.\n" +
        "أخرج التقرير بأسلوب تفاعلي جذاب وعميق يخدم الدارس المتقدم.";
      var res = await ai.callGemini(prompt);
      setReportText(res);
    } catch (err) {
      alert("خطأ أثناء التوليد: " + err.message);
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
      React.createElement("h2", { className: "text-xl font-bold text-slate-900 dark:text-white" }, "المنهج الدراسي والتقارير التفاعلية"),
      React.createElement("p", { className: "text-xs text-slate-500 mt-1" }, "قسم مخصص لاستيعاب وثيقة المنهج الكاملة واستخراج التقارير والخرائط الذهنية وبنك الأسئلة")
    ),

    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4" },
        React.createElement(
          "div",
          null,
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "التقرير الدراسي المجمع للمنهج (Interactive Guide)"),
          React.createElement("p", { className: "text-xs text-slate-400" }, "ربط شامل بين المحاضرات والمراجع والأسئلة التطبيقية")
        ),
        currentUser.role === "admin" && React.createElement(
          "button",
          {
            onClick: handleGenerateReport,
            disabled: isGenerating,
            className: "bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
          },
          isGenerating ? "جاري التحليل الشامل للمنهج..." : "✨ توليد التقرير التفاعلي"
        )
      ),

      reportText ? React.createElement(
        "div",
        { className: "p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs md:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap" },
        reportText
      ) : React.createElement(
        "div",
        { className: "p-10 text-center text-slate-400 text-xs space-y-2 border border-dashed rounded-2xl" },
        React.createElement("div", { className: "text-2xl" }, "📑"),
        React.createElement("p", null, "هذا القسم مجهز لاستقبال وثيقة المنهج المجمعة فور نزولها وتوليد التقرير التفاعلي منها.")
      )
    )
  );
};
