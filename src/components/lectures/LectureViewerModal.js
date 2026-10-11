// نافذة مشغل المحاضرة التفاعلي بجميع ألسنتها مع أزرار التحكم والتنقل
window.LectureViewerModal = function(props) {
  var activeLecture = props.activeLecture;
  var onClose = props.onClose;
  var currentUser = props.currentUser || {};
  var utils = props.utils || window.APP_UTILS;
  var cloud = props.cloud || window.CloudSyncService;
  var ai = props.ai || window.GeminiAIService;
  var itemSeqInfo = props.itemSeqInfo || {};
  var isItemExam = props.isItemExam;
  var getLectureStatus = props.getLectureStatus;
  var openEditModal = props.openEditModal;
  var handleDeleteLecture = props.handleDeleteLecture;
  var handleSavePosition = props.handleSavePosition;
  var filteredLectures = props.filteredLectures || [];
  var onSelectLecture = props.onSelectLecture;

  var [activeSubTab, setActiveSubTab] = React.useState("media"); // 'media', 'handout', 'summary', 'audio_summary', 'quiz'
  var [isAiGenerating, setIsAiGenerating] = React.useState(false);
  var [quizUserAnswers, setQuizUserAnswers] = React.useState({});
  var [quizSubmitted, setQuizSubmitted] = React.useState(false);

  // إعادة ضبط إجابات الكويز عند تغيير المحاضرة
  React.useEffect(function() {
    setQuizUserAnswers({});
    setQuizSubmitted(false);
  }, [activeLecture ? activeLecture.id : null]);

  if (!activeLecture) return null;

  var st = getLectureStatus ? getLectureStatus(activeLecture) : {};
  var actSeq = itemSeqInfo[activeLecture.id] || { isExam: isItemExam && isItemExam(activeLecture), num: 1, titleBadge: "#1", fullLabel: "المحاضرة" };

  var handleGenerateSummary = async function() {
    if (!activeLecture || currentUser.role !== "admin") return;
    setIsAiGenerating(true);
    try {
      var prompt = "قم بإعداد تلخيص شامل ودقيق وواضح لمحاضرة المشورة: '" + activeLecture.title + "'.\n" +
        "المحاضر: " + activeLecture.speaker + "\n" +
        "الملاحظات الأساسية:\n" + (activeLecture.notes || "مفاهيم الشفاء والنمو النفسي") + "\n\n" +
        "المطلوب: استخراج الأفكار الرئيسية، المفاهيم المحورية، وتطبيقات عملية للدارس بلغة عربية رصينة.";
      var summaryText = await ai.callGemini(prompt);
      var updated = Object.assign({}, activeLecture, { writtenSummary: summaryText });
      cloud.saveLecture(updated);
      if (onSelectLecture) onSelectLecture(updated);
    } catch (err) {
      alert("خطأ أثناء التوليد: " + err.message);
    } finally {
      setIsAiGenerating(false);
    }
  };

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto",
      onClick: function(e) { if (e.target === e.currentTarget && onClose) onClose(); }
    },
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto" },

      // رأس المحاضرة داخل النافذة
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4" },
        React.createElement(
          "div",
          null,
          React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-1" },
            activeLecture.subject && React.createElement("span", { className: "text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800" }, "📚 " + activeLecture.subject),
            React.createElement("span", { className: "text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg" }, "تاريخ: " + (activeLecture.date || "غير محدد")),
            actSeq.isExam
              ? React.createElement("span", { className: "text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800" }, "📝 امتحان وتقييم نهائي")
              : React.createElement("span", { className: "text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-lg" }, "المحاضرة رقم: " + actSeq.num),
            React.createElement("span", { className: "text-xs font-bold px-2.5 py-0.5 rounded-lg " + (st.badgeClass || "") }, st.label || "")
          ),
          React.createElement("h3", { className: "text-lg font-bold text-slate-900 dark:text-white" }, activeLecture.title),
          React.createElement("p", { className: "text-xs text-slate-500 mt-0.5" }, "المحاضر: " + activeLecture.speaker)
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2.5" },
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (openEditModal) openEditModal(activeLecture); },
              title: "تعديل المادة أو بيانات المحاضرة",
              className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 shadow-2xs"
            },
            React.createElement("span", null, "✏️"),
            React.createElement("span", null, "تعديل")
          ),
          React.createElement(
            "div",
            { className: "text-left sm:text-right hidden sm:block" },
            React.createElement("span", { className: "text-[11px] text-slate-400 block" }, "التوقف المحفوظ"),
            React.createElement("span", { className: "text-xs font-bold text-emerald-600 dark:text-emerald-400" }, utils.formatDuration(activeLecture.lastPosition || 0))
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (onClose) onClose(); },
              className: "px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
            },
            React.createElement("span", null, "✕"),
            React.createElement("span", null, "إغلاق والعودة للجدول")
          )
        )
      ),

      // شريط أزرار التحكم السريع للمسؤول
      currentUser.role === "admin" && React.createElement(
        "div",
        { className: "flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60" },
        React.createElement("span", { className: "text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-1" },
          React.createElement("span", null, "⚡"),
          React.createElement("span", null, "أزرار التحكم:")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (openEditModal) openEditModal(activeLecture, "video"); },
            className: "px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-1.5 shadow-2xs"
          },
          React.createElement("span", null, "📺"),
          React.createElement("span", null, "رابط الفيديو")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (openEditModal) openEditModal(activeLecture, "handout"); },
            className: "px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-1.5 shadow-2xs"
          },
          React.createElement("span", null, "📂"),
          React.createElement("span", null, "الهاند آوت (PDF/PPT)")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (openEditModal) openEditModal(activeLecture, "audio"); },
            className: "px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-1.5 shadow-2xs"
          },
          React.createElement("span", null, "🎙️"),
          React.createElement("span", null, "الملخص الصوتي (NotebookLM)")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (openEditModal) openEditModal(activeLecture, "summary"); },
            className: "px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-1.5 shadow-2xs"
          },
          React.createElement("span", null, "📄"),
          React.createElement("span", null, "ريبورت الملخص المكتوب")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (openEditModal) openEditModal(activeLecture, "quiz"); },
            className: "px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-1.5 shadow-2xs"
          },
          React.createElement("span", null, "📝"),
          React.createElement("span", null, "كويز المحاضرة")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (openEditModal) openEditModal(activeLecture, "all"); },
            className: "px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs mr-auto"
          },
          React.createElement("span", null, "✏️"),
          React.createElement("span", null, "تعديل الكل")
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (handleDeleteLecture) handleDeleteLecture(activeLecture); },
            className: "px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs border border-rose-200 dark:border-rose-900",
            title: "نقل المحاضرة إلى سلة المحذوفات"
          },
          React.createElement("span", null, "🗑️"),
          React.createElement("span", null, "حذف")
        )
      ),

      // الألسنة الداخلية الخمسة
      React.createElement(
        "div",
        { className: "flex border-b border-slate-200 dark:border-slate-800 gap-4 overflow-x-auto scrollbar-thin pb-0.5" },
        [
          { id: "media", label: "📺 المشاهدة والاستماع" },
          { id: "handout", label: "📂 الهاند آوت والمرفقات" },
          { id: "summary", label: "📄 الملخص المكتوب" },
          { id: "audio_summary", label: "🎙️ ملخص مسموع (MP3)" },
          { id: "quiz", label: "📝 كويز واختبار تفاعلي" }
        ].map(function(tab) {
          var isCurrent = activeSubTab === tab.id;
          return React.createElement(
            "button",
            {
              key: tab.id,
              onClick: function() { setActiveSubTab(tab.id); },
              className: "pb-3 text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap " +
                (isCurrent ? "border-slate-900 dark:border-emerald-500 text-slate-900 dark:text-white" : "border-transparent text-slate-400 hover:text-slate-600")
            },
            tab.label
          );
        })
      ),

      // 1. تبويب الفيديو والمشغل
      activeSubTab === "media" && React.createElement(
        "div",
        { className: "space-y-4" },
        activeLecture.mediaUrl ? React.createElement(
          "div",
          { className: "w-full rounded-2xl overflow-hidden bg-slate-950 aspect-video md:aspect-[21/9] flex items-center justify-center relative shadow-inner" },
          React.createElement("iframe", {
            src: utils.getMediaEmbedUrl(activeLecture.mediaUrl),
            className: "w-full h-full border-0",
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
            allowFullScreen: true
          })
        ) : (function() {
          return React.createElement(
            "div",
            { className: "p-8 md:p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
            React.createElement("div", { className: "text-3xl" }, st.type === "upcoming" ? "⏳" : "🎬"),
            React.createElement("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200" },
              st.type === "upcoming"
                ? "محاضرة قادمة مجدولة بتاريخ: " + (activeLecture.date || "قريباً")
                : "تسجيل المحاضرة غير متوفر حالياً"
            ),
            React.createElement("p", { className: "text-xs text-slate-500 max-w-md mx-auto leading-relaxed" },
              st.type === "upcoming"
                ? "ستقام المحاضرة في موعدها المحدد، وسيتم رفع التسجيل وروابط المشاهدة فور انتهاء الجلسة."
                : "جاري تجهيز ورفع تسجيل المحاضرة من قبل الإدارة وسيكون متاحاً هنا فور توفره."
            ),
            currentUser.role === "admin" && React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { if (openEditModal) openEditModal(activeLecture, "video"); },
                className: "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm hover:scale-102 transition-all mt-2"
              },
              "📺 إضافة أو تعديل رابط الفيديو الآن"
            )
          );
        })(),
        // أزرار التحكم
        React.createElement(
          "div",
          { className: "flex items-center justify-between text-xs pt-1" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("button", {
              onClick: function() { if (handleSavePosition) handleSavePosition(Math.max(0, (activeLecture.lastPosition || 0) - 15)); },
              className: "px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
            }, "◀ 15 ثانية"),
            React.createElement("button", {
              onClick: function() { if (handleSavePosition) handleSavePosition((activeLecture.lastPosition || 0) + 15); },
              className: "px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
            }, "15 ثانية ▶")
          ),
          React.createElement("span", { className: "text-slate-400" }, "يتم حفظ واستئناف موضع التوقف تلقائياً")
        )
      ),

      // 2. تبويب الهاند آوت والمرفقات (PDF / PPT)
      activeSubTab === "handout" && React.createElement(
        "div",
        { className: "space-y-4" },
        currentUser.role === "admin" && React.createElement(
          "div",
          { className: "flex items-center justify-between p-3 rounded-2xl bg-indigo-50/60 dark:bg-slate-800/40 border border-indigo-100 dark:border-slate-800" },
          React.createElement("div", { className: "text-xs text-indigo-900 dark:text-indigo-200 font-bold flex items-center gap-1.5" },
            React.createElement("span", null, "📂"),
            React.createElement("span", null, "إدارة هاند آوت المحاضرة (ملف PDF أو عرض تقديمي)")
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (openEditModal) openEditModal(activeLecture, "handout"); },
              className: "px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1"
            },
            React.createElement("span", null, "⬆️"),
            React.createElement("span", null, activeLecture.handoutUrl ? "تعديل أو استبدال الملف" : "رفع هاند آوت جديد")
          )
        ),
        activeLecture.handoutUrl ? React.createElement(
          "div",
          { className: "space-y-3" },
          React.createElement(
            "div",
            { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs" },
            React.createElement(
              "div",
              { className: "flex items-center gap-3" },
              React.createElement("div", { className: "w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0" }, "📄"),
              React.createElement(
                "div",
                null,
                React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, activeLecture.handoutName || "ملف الهاند آوت والعرض التقديمي للمحاضرة"),
                React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5" }, "متاح للتحميل والقراءة المباشرة أثناء متابعة المحاضرة")
              )
            ),
            React.createElement(
              "div",
              { className: "flex items-center gap-2 w-full sm:w-auto" },
              React.createElement(
                "a",
                {
                  href: activeLecture.handoutUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "flex-1 sm:flex-none text-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                },
                React.createElement("span", null, "👁️"),
                React.createElement("span", null, "فتح في نافذة كاملة")
              ),
              React.createElement(
                "a",
                {
                  href: activeLecture.handoutUrl,
                  download: true,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
                },
                React.createElement("span", null, "⬇️"),
                React.createElement("span", null, "تحميل")
              )
            )
          ),
          // عارض الملفات المباشر المضمن (Google Drive أو مستند)
          React.createElement(
            "div",
            { className: "w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 aspect-[4/3] md:aspect-[16/10] shadow-inner" },
            React.createElement("iframe", {
              src: (function() {
                var url = activeLecture.handoutUrl;
                if (url.includes("drive.google.com/file/d/")) {
                  return url.replace(/\/view(\?.*)?$/, "/preview");
                }
                return url;
              })(),
              className: "w-full h-full border-0",
              title: "Handout Viewer"
            })
          )
        ) : React.createElement(
          "div",
          { className: "p-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
          React.createElement("div", { className: "text-3xl" }, "📂"),
          React.createElement("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200" }, "لم يتم إرفاق ملف هاند آوت لهذه المحاضرة بعد"),
          React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto leading-relaxed" },
            "في حال وفر المحاضر عرض تقديمي أو مذكرات ملحقة، سيتم رفعها هنا تلقائياً لتكون متاحة للقراءة والتحميل."
          ),
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (openEditModal) openEditModal(activeLecture, "handout"); },
              className: "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm hover:scale-102 transition-all mt-2"
            },
            "⬆️ رفع ملف هاند آوت الآن"
          )
        )
      ),

      // 3. تبويب الملخص المكتوب
      activeSubTab === "summary" && React.createElement(
        "div",
        { className: "space-y-4" },
        currentUser.role === "admin" && React.createElement(
          "div",
          { className: "flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800" },
          React.createElement("span", { className: "text-xs font-bold text-slate-600 dark:text-slate-300" }, "أدوات التلخيص الذكي (NotebookLM)"),
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement(
              "button",
              {
                onClick: function() { if (openEditModal) openEditModal(activeLecture, "summary"); },
                className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-100 flex items-center gap-1"
              },
              React.createElement("span", null, "✏️"),
              React.createElement("span", null, activeLecture.writtenSummary ? "تعديل ريبورت الملخص" : "لصق ريبورت الملخص")
            ),
            React.createElement(
              "button",
              {
                onClick: handleGenerateSummary,
                disabled: isAiGenerating,
                className: "px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 text-xs font-bold hover:opacity-90 flex items-center gap-1"
              },
              React.createElement("span", null, isAiGenerating ? "⏳" : "✨"),
              React.createElement("span", null, isAiGenerating ? "جاري التوليد..." : "توليد ملخص بالذكاء")
            )
          )
        ),
        activeLecture.writtenSummary ? React.createElement(
          "div",
          { className: "p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans select-text" },
          activeLecture.writtenSummary
        ) : React.createElement(
          "div",
          { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs space-y-2" },
          React.createElement("p", null, "لم يتم إضافة ملخص مكتوب لهذه المحاضرة بعد."),
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (openEditModal) openEditModal(activeLecture, "summary"); },
              className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm"
            },
            "📄 لصق الملخص المكتوب الآن"
          )
        )
      ),

      // 4. تبويب الملخص الصوتي المسموع
      activeSubTab === "audio_summary" && React.createElement(
        "div",
        { className: "space-y-4" },
        currentUser.role === "admin" && React.createElement(
          "div",
          { className: "flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800" },
          React.createElement("span", { className: "text-xs font-bold text-slate-600 dark:text-slate-300" }, "إدارة الملف الصوتي (NotebookLM Audio Overview)"),
          React.createElement(
            "button",
            {
              onClick: function() { if (openEditModal) openEditModal(activeLecture, "audio"); },
              className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-100 flex items-center gap-1"
            },
            React.createElement("span", null, "🎙️"),
            React.createElement("span", null, (activeLecture.audioSummaryUrl || activeLecture.mediaUrl) ? "تعديل رابط الصوت" : "إضافة رابط الصوت")
          )
        ),
        (activeLecture.audioSummaryUrl || activeLecture.mediaUrl) ? React.createElement(
          "div",
          { className: "p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-4 text-center" },
          React.createElement("div", { className: "text-3xl" }, "🎙️"),
          React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, "استماع إلى الملخص الصوتي للمحاضرة"),
          React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto" }, "يمكنك الاستماع مباشرة مع حفظ موضع التوقف تلقائياً والتحكم بالسرعة."),
          React.createElement(
            "audio",
            {
              controls: true,
              className: "w-full max-w-lg mx-auto mt-2",
              src: utils.getAudioStreamUrl(activeLecture.audioSummaryUrl || activeLecture.mediaUrl),
              onError: function(e) {
                console.warn("Direct audio tag error, showing embedded fallback if Google Drive", e);
                var dId = utils.extractDriveId ? utils.extractDriveId(activeLecture.audioSummaryUrl || activeLecture.mediaUrl) : null;
                if (dId) {
                  var el = e.target;
                  if (el && el.parentElement && !el.parentElement.querySelector("iframe")) {
                    var fallbackIframe = document.createElement("iframe");
                    fallbackIframe.src = "https://drive.google.com/file/d/" + dId + "/preview";
                    fallbackIframe.className = "w-full h-20 border-0 rounded-xl mt-3";
                    fallbackIframe.allow = "autoplay";
                    el.parentElement.appendChild(fallbackIframe);
                    el.style.display = "none";
                  }
                }
              }
            }
          )
        ) : React.createElement(
          "div",
          { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs space-y-2" },
          React.createElement("p", null, "لم يتم رفع ملف صوتي مباشر (MP3) لهذه المحاضرة بعد."),
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (openEditModal) openEditModal(activeLecture, "audio"); },
              className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm"
            },
            "🎙️ إضافة رابط ملف صوتي الآن"
          )
        )
      ),

      // 5. تبويب الكويز والاختبار التفاعلي
      activeSubTab === "quiz" && React.createElement(
        "div",
        { className: "space-y-4" },
        currentUser.role === "admin" && React.createElement(
          "div",
          { className: "flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800" },
          React.createElement("span", { className: "text-xs font-bold text-slate-600 dark:text-slate-300" }, "إدارة أسئلة الكويز الذاتي"),
          React.createElement(
            "button",
            {
              onClick: function() { if (openEditModal) openEditModal(activeLecture, "quiz"); },
              className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-100 flex items-center gap-1"
            },
            React.createElement("span", null, "📝"),
            React.createElement("span", null, (activeLecture.quizQuestions && activeLecture.quizQuestions.length > 0) ? "تعديل أسئلة الكويز" : "إضافة أسئلة كويز")
          )
        ),
        (activeLecture.quizQuestions && activeLecture.quizQuestions.length > 0) ? React.createElement(
          "div",
          { className: "space-y-4" },
          activeLecture.quizQuestions.map(function(q, qIdx) {
            var userAns = quizUserAnswers[qIdx];
            var isAnswered = userAns !== undefined;
            var isCorrect = userAns === q.correct;
            return React.createElement(
              "div",
              { key: qIdx, className: "p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3" },
              React.createElement(
                "div",
                { className: "flex items-start gap-2" },
                React.createElement("span", { className: "w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-emerald-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" }, qIdx + 1),
                React.createElement("h4", { className: "text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug" }, q.question)
              ),
              React.createElement(
                "div",
                { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1" },
                q.options.map(function(opt, oIdx) {
                  var selected = userAns === oIdx;
                  var showSuccess = quizSubmitted && oIdx === q.correct;
                  var showDanger = quizSubmitted && selected && !isCorrect;
                  var btnClass = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400";
                  if (selected && !quizSubmitted) btnClass = "border-slate-900 dark:border-emerald-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold ring-1 ring-slate-900 dark:ring-emerald-500";
                  if (showSuccess) btnClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold ring-1 ring-emerald-500";
                  if (showDanger) btnClass = "border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold ring-1 ring-rose-500";

                  return React.createElement(
                    "button",
                    {
                      key: oIdx,
                      type: "button",
                      disabled: quizSubmitted,
                      onClick: function() {
                        setQuizUserAnswers(function(prev) {
                          var n = Object.assign({}, prev);
                          n[qIdx] = oIdx;
                          return n;
                        });
                      },
                      className: "p-3 rounded-xl border text-right text-xs transition-all flex items-center gap-2 " + btnClass
                    },
                    React.createElement("span", { className: "w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0" },
                      String.fromCharCode(65 + oIdx)
                    ),
                    React.createElement("span", { className: "flex-1" }, opt)
                  );
                })
              ),
              quizSubmitted && q.explanation && React.createElement(
                "div",
                { className: "p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1" },
                React.createElement("span", { className: "font-bold text-slate-800 dark:text-slate-200 block" }, "💡 الشرح والتوضيح:"),
                React.createElement("p", null, q.explanation)
              )
            );
          }),
          React.createElement(
            "div",
            { className: "flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800" },
            !quizSubmitted ? React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setQuizSubmitted(true); },
                className: "px-6 py-2 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 text-xs font-bold hover:opacity-90 shadow-sm"
              },
              "تسليم الإجابات والتحقق ✓"
            ) : (function() {
              var total = activeLecture.quizQuestions.length;
              var score = 0;
              activeLecture.quizQuestions.forEach(function(q, i) {
                if (quizUserAnswers[i] === q.correct) score++;
              });
              var pct = Math.round((score / total) * 100);
              return React.createElement(
                "div",
                { className: "flex items-center gap-3" },
                React.createElement(
                  "div",
                  { className: "text-xs font-bold text-slate-800 dark:text-slate-200" },
                  "نتيجتك: " + score + " من " + total + " (" + pct + "%) " + (pct >= 70 ? "🎉 أحسنت عمل رائع!" : "💡 راجع الملاحظات وحاول مجدداً")
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() {
                      setQuizUserAnswers({});
                      setQuizSubmitted(false);
                    },
                    className: "px-4 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-slate-700 text-xs font-bold hover:bg-slate-800"
                  },
                  "🔄 إعادة حل الكويز"
                )
              );
            })()
          )
        ) : React.createElement(
          "div",
          { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs space-y-2" },
          React.createElement("p", null, "لم يتم وضع أسئلة كويز لهذه المحاضرة بعد."),
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (openEditModal) openEditModal(activeLecture, "quiz"); },
              className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm"
            },
            "📝 إعداد أسئلة الكويز الآن"
          )
        )
      ),

      // تذييل النافذة للتنقل بين المحاضرات
      (function() {
        var currentIdx = filteredLectures.findIndex(function(l) { return l.id === activeLecture.id; });
        var prevLec = currentIdx > 0 ? filteredLectures[currentIdx - 1] : null;
        var nextLec = currentIdx >= 0 && currentIdx < filteredLectures.length - 1 ? filteredLectures[currentIdx + 1] : null;
        return React.createElement(
          "div",
          { className: "flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs" },
          prevLec ? React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (onSelectLecture) onSelectLecture(prevLec); },
              className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all text-slate-700 dark:text-slate-200"
            },
            "◀ " + (itemSeqInfo[prevLec.id] ? itemSeqInfo[prevLec.id].titleBadge : "") + " " + prevLec.title
          ) : React.createElement("div"),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (onClose) onClose(); },
              className: "px-4 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 font-bold hover:opacity-90 transition-all text-xs"
            },
            "العودة للجدول الكامل ✓"
          ),
          nextLec ? React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (onSelectLecture) onSelectLecture(nextLec); },
              className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all text-slate-700 dark:text-slate-200"
            },
            nextLec.title + " " + (itemSeqInfo[nextLec.id] ? itemSeqInfo[nextLec.id].titleBadge : "") + " ▶"
          ) : React.createElement("div")
        );
      })()
    )
  );
};
