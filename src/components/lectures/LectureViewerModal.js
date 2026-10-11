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
  var [selectedHandoutIndex, setSelectedHandoutIndex] = React.useState(0);
  var [isHandoutFullScreen, setIsHandoutFullScreen] = React.useState(false);
  var [handoutRotation, setHandoutRotation] = React.useState(0); // 0, 90, 180, 270
  var [handoutZoom, setHandoutZoom] = React.useState(100); // 100%, 125%, 150%, 175%, 200%
  var [handoutCurrentPage, setHandoutCurrentPage] = React.useState(function() {
    var saved = utils.getLocal ? utils.getLocal("handout_page_" + (activeLecture ? activeLecture.id : ""), 1) : 1;
    return parseInt(saved) || 1;
  });

  // إعادة ضبط إجابات الكويز والهاند آوت عند تغيير المحاضرة
  React.useEffect(function() {
    setQuizUserAnswers({});
    setQuizSubmitted(false);
    setSelectedHandoutIndex(0);
    setIsHandoutFullScreen(false);
    setHandoutRotation(0);
    setHandoutZoom(100);
    if (activeLecture && activeLecture.id && utils.getLocal) {
      var saved = utils.getLocal("handout_page_" + activeLecture.id, 1);
      setHandoutCurrentPage(parseInt(saved) || 1);
    }
  }, [activeLecture ? activeLecture.id : null]);

  var handleHandoutPageChange = function(newPage) {
    var p = Math.max(1, newPage);
    setHandoutCurrentPage(p);
    if (activeLecture && activeLecture.id && utils.setLocal) {
      utils.setLocal("handout_page_" + activeLecture.id, p);
    }
  };

  var handoutScrollContainerRef = React.useRef(null);

  var handleRotateHandout = function() {
    setHandoutRotation(function(prev) { return (prev + 90) % 360; });
  };

  var handleHandoutPageUp = function() {
    if (handoutScrollContainerRef.current) {
      handoutScrollContainerRef.current.scrollBy({ top: -window.innerHeight * 0.8, behavior: "smooth" });
    }
  };

  var handleHandoutPageDown = function() {
    if (handoutScrollContainerRef.current) {
      handoutScrollContainerRef.current.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
    }
  };

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
        { className: "flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60" },
        React.createElement("span", { className: "text-xs font-bold text-slate-500 dark:text-slate-400 ml-1" }, "إدارة المحتوى:"),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (openEditModal) openEditModal(activeLecture, "all"); },
            className: "px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
          },
          "تعديل البيانات والروابط"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (handleDeleteLecture) handleDeleteLecture(activeLecture); },
            className: "px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs border border-rose-200 dark:border-rose-900 mr-auto",
            title: "نقل المحاضرة إلى المحذوفات"
          },
          "حذف المحاضرة"
        )
      ),

      // الألسنة الداخلية الخمسة بتصميم نظيف
      React.createElement(
        "div",
        { className: "flex border-b border-slate-200 dark:border-slate-800 gap-4 sm:gap-6 overflow-x-auto scrollbar-thin pb-0.5" },
        [
          { id: "media", label: "المشاهدة والاستماع" },
          { id: "handout", label: "المرفقات والملفات" },
          { id: "summary", label: "الملخص المكتوب" },
          { id: "audio_summary", label: "الملخص الصوتي" },
          { id: "quiz", label: "الاختبار التفاعلي" }
        ].map(function(tab) {
          var isCurrent = activeSubTab === tab.id;
          return React.createElement(
            "button",
            {
              key: tab.id,
              onClick: function() { setActiveSubTab(tab.id); },
              className: "pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap " +
                (isCurrent ? "border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")
            },
            tab.label
          );
        })
      ),

      // 1. تبويب الفيديو والمشغل
      activeSubTab === "media" && React.createElement(
        "div",
        { className: "space-y-4" },
        // كارت رابط زوم المباشر للمحاضرة
        activeLecture.zoomUrl && React.createElement(
          "div",
          { className: "p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-lg border border-blue-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4" },
          React.createElement(
            "div",
            { className: "space-y-1.5" },
            React.createElement("div", { className: "flex items-center gap-2" },
              React.createElement("span", { className: "px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-[11px] font-bold text-blue-200" }, "🎥 بث زوم المباشر"),
              activeLecture.zoomTimeStr && React.createElement("span", { className: "text-xs font-mono text-blue-200" }, "⏰ " + activeLecture.zoomTimeStr)
            ),
            React.createElement("h4", { className: "text-base font-bold text-white" }, "رابط قاعة الزوم متاح الآن لحضور المحاضرة"),
            React.createElement(
              "div",
              { className: "flex flex-wrap items-center gap-3 text-xs text-blue-200 pt-0.5" },
              activeLecture.meetingId && React.createElement(
                "span",
                {
                  onClick: function() {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(activeLecture.meetingId);
                      alert("تم نسخ Meeting ID: " + activeLecture.meetingId);
                    }
                  },
                  className: "cursor-pointer hover:underline bg-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono",
                  title: "اضغط للنسخ"
                },
                "ID: " + activeLecture.meetingId + " 📋"
              ),
              activeLecture.passcode && React.createElement(
                "span",
                {
                  onClick: function() {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(activeLecture.passcode);
                      alert("تم نسخ Passcode: " + activeLecture.passcode);
                    }
                  },
                  className: "cursor-pointer hover:underline bg-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono",
                  title: "اضغط للنسخ"
                },
                "Passcode: " + activeLecture.passcode + " 📋"
              )
            )
          ),
          React.createElement(
            "a",
            {
              href: activeLecture.zoomUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "w-full md:w-auto px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:scale-102 transition-all active:scale-95 shrink-0"
            },
            React.createElement("span", { className: "text-base" }, "🚀"),
            React.createElement("span", null, "دخول زوم المباشر")
          )
        ),
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
        activeSubTab === "handout" && (function() {
          var handoutsList = [];
          if (Array.isArray(activeLecture.handouts) && activeLecture.handouts.length > 0) {
            handoutsList = activeLecture.handouts.filter(function(h) { return h && (h.url || h.name); });
          } else if (activeLecture.handoutUrl) {
            handoutsList = [{
              id: "legacy",
              name: activeLecture.handoutName || "ملف الهاند آوت للمحاضرة",
              url: activeLecture.handoutUrl
            }];
          }

          var activeIdx = Math.min(Math.max(0, selectedHandoutIndex), Math.max(0, handoutsList.length - 1));
          var currentHandout = handoutsList[activeIdx] || null;

          return React.createElement(
            "div",
            { className: "space-y-4" },
            currentUser.role === "admin" && React.createElement(
              "div",
              { className: "flex items-center justify-between p-3 rounded-2xl bg-indigo-50/60 dark:bg-slate-800/40 border border-indigo-100 dark:border-slate-800" },
              React.createElement("div", { className: "text-xs text-indigo-900 dark:text-indigo-200 font-bold flex items-center gap-1.5" },
                React.createElement("span", null, "📂"),
                React.createElement("span", null, "إدارة هاند آوت المحاضرة (" + (handoutsList.length > 0 ? (handoutsList.length + " ملفات مرفقة") : "ملف PDF أو عرض تقديمي") + ")")
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { if (openEditModal) openEditModal(activeLecture, "handout"); },
                  className: "px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1 shadow-sm"
                },
                React.createElement("span", null, "⬆️"),
                React.createElement("span", null, handoutsList.length > 0 ? "إدارة ورفع المزيد" : "رفع هاند آوت جديد")
              )
            ),
            handoutsList.length > 0 ? React.createElement(
              "div",
              { className: "space-y-3" },
              // شريط التنقل بين ملفات الهاند آوت إذا وُجد أكثر من ملف
              handoutsList.length > 1 && React.createElement(
                "div",
                { className: "flex items-center gap-2 overflow-x-auto pb-1 p-1.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60" },
                handoutsList.map(function(item, idx) {
                  var isSelected = idx === activeIdx;
                  return React.createElement(
                    "button",
                    {
                      key: item.id || idx,
                      type: "button",
                      onClick: function() { setSelectedHandoutIndex(idx); },
                      className: "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 " + (
                        isSelected
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/80"
                      )
                    },
                    React.createElement("span", null, "📄"),
                    React.createElement("span", { className: "max-w-[180px] truncate" }, item.name || ("ملف " + (idx + 1))),
                    React.createElement("span", { className: "text-[10px] opacity-70 px-1.5 py-0.2 bg-black/10 dark:bg-white/10 rounded-full" }, idx + 1)
                  );
                })
              ),
              // بطاقة الملف النشط وروابط الفتح/التحميل
              currentHandout && React.createElement(
                "div",
                { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-3 min-w-0" },
                  React.createElement("div", { className: "w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0" }, "📄"),
                  React.createElement(
                    "div",
                    { className: "min-w-0" },
                    React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white truncate" }, currentHandout.name || "ملف الهاند آوت والعرض التقديمي للمحاضرة"),
                    React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" },
                      handoutsList.length > 1 ? ("الملف " + (activeIdx + 1) + " من أصل " + handoutsList.length + " - متاح للتحميل والقراءة المباشرة") : "متاح للتحميل والقراءة المباشرة أثناء متابعة المحاضرة"
                    )
                  )
                ),
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2 w-full sm:w-auto shrink-0" },
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: function() { setIsHandoutFullScreen(true); },
                      className: "flex-1 sm:flex-none text-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                    },
                    React.createElement("span", null, "⛶"),
                    React.createElement("span", null, "قراءة بملء الشاشة في التطبيق")
                  ),
                  handoutCurrentPage > 1 && React.createElement(
                    "span",
                    { className: "text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" },
                    "🔖 صفحة " + handoutCurrentPage
                  ),
                  React.createElement(
                    "a",
                    {
                      href: currentHandout.url,
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
              // عارض الملفات المباشر المضمن
              currentHandout && currentHandout.url && React.createElement(
                "div",
                { className: "relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 aspect-[4/3] md:aspect-[16/10] shadow-inner flex items-center justify-center" },
                React.createElement("iframe", {
                  key: "tab-handout",
                  src: (function() {
                    var url = currentHandout.url;
                    if (url.includes("drive.google.com/file/d/")) {
                      return url.replace(/\/view(\?.*)?$/, "/preview");
                    }
                    return url;
                  })(),
                  className: "w-full h-full border-0",
                  title: currentHandout.name || "Handout Viewer"
                })
              ),
              // قائمة تنزيل سريعة لكافة الملفات إذا كان هناك أكثر من ملف
              handoutsList.length > 1 && React.createElement(
                "div",
                { className: "p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2" },
                React.createElement("div", { className: "text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "📥 قائمة جميع الملفات المرفقة للتحميل المباشر:"),
                React.createElement(
                  "div",
                  { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
                  handoutsList.map(function(h, i) {
                    return React.createElement(
                      "div",
                      { key: h.id || i, className: "flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs" },
                      React.createElement("span", { className: "font-medium text-slate-800 dark:text-slate-200 truncate pr-2" }, (i + 1) + ". " + (h.name || ("ملف " + (i + 1)))),
                      React.createElement(
                        "a",
                        {
                          href: h.url,
                          target: "_blank",
                          rel: "noopener noreferrer",
                          download: true,
                          className: "px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100 transition-colors shrink-0 flex items-center gap-1"
                        },
                        React.createElement("span", null, "⬇️"),
                        React.createElement("span", null, "تحميل")
                      )
                    );
                  })
                )
              )
            ) : React.createElement(
              "div",
              { className: "p-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
              React.createElement("div", { className: "text-3xl" }, "📂"),
              React.createElement("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200" }, "لم يتم إرفاق ملفات أو مذكرات لهذه المحاضرة بعد"),
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
                "⬆️ رفع ملفات أو مرفقات الآن"
              )
            )
          );
        })(),

      // 3. تبويب الملخص المكتوب
      activeSubTab === "summary" && React.createElement(
        "div",
        { className: "space-y-4" },
        currentUser.role === "admin" && React.createElement(
          "div",
          { className: "flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800" },
          React.createElement("span", { className: "text-xs font-bold text-slate-600 dark:text-slate-300" }, "خيارات الملخص"),
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement(
              "button",
              {
                onClick: function() { if (openEditModal) openEditModal(activeLecture, "summary"); },
                className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-100 flex items-center gap-1"
              },
              React.createElement("span", null, activeLecture.writtenSummary ? "تعديل الملخص" : "كتابة ملخص")
            ),
            React.createElement(
              "button",
              {
                onClick: handleGenerateSummary,
                disabled: isAiGenerating,
                className: "px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 text-xs font-bold hover:opacity-90 flex items-center gap-1"
              },
              React.createElement("span", null, isAiGenerating ? "جاري التلخيص..." : "تلخيص تلقائي")
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
          React.createElement("p", null, "لا يوجد ملخص مكتوب لهذه المحاضرة حتى الآن."),
          currentUser.role === "admin" && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { if (openEditModal) openEditModal(activeLecture, "summary"); },
              className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-sm"
            },
            "إضافة ملخص مكتوب"
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
          React.createElement("span", { className: "text-xs font-bold text-slate-600 dark:text-slate-300" }, "إدارة الملف الصوتي"),
          React.createElement(
            "button",
            {
              onClick: function() { if (openEditModal) openEditModal(activeLecture, "audio"); },
              className: "px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-100 flex items-center gap-1"
            },
            React.createElement("span", null, (activeLecture.audioSummaryUrl || activeLecture.mediaUrl) ? "تعديل رابط الصوت" : "إضافة رابط الصوت")
          )
        ),
        (activeLecture.audioSummaryUrl || activeLecture.mediaUrl) ? React.createElement(
          "div",
          { className: "p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3 text-center" },
          React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, "الاستماع للملخص الصوتي"),
          React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto" }, "يتم حفظ موضع التوقف تلقائياً للرجوع إليه لاحقاً."),
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
    ),

    // عارض الهاند آوت بملء الشاشة المدمج في التطبيق مع شريط التقليب العائم وحفظ الموضع
    isHandoutFullScreen && (function() {
      var handoutsList = [];
      if (Array.isArray(activeLecture.handouts) && activeLecture.handouts.length > 0) {
        handoutsList = activeLecture.handouts.filter(function(h) { return h && (h.url || h.name); });
      } else if (activeLecture.handoutUrl) {
        handoutsList = [{ id: "legacy", name: activeLecture.handoutName || "ملف الهاند آوت", url: activeLecture.handoutUrl }];
      }
      var activeIdx = Math.min(Math.max(0, selectedHandoutIndex), Math.max(0, handoutsList.length - 1));
      var currentHandout = handoutsList[activeIdx] || null;
      if (!currentHandout || !currentHandout.url) return null;

      return React.createElement(
        "div",
        { className: "fixed inset-0 z-[70] bg-slate-950 flex flex-col font-cairo text-white animate-in fade-in duration-200" },
        // شريط ترويسة عارض الهاند آوت
        React.createElement(
          "div",
          { className: "h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 z-10" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2.5 min-w-0" },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setIsHandoutFullScreen(false); },
                className: "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm active:scale-95 transition-all"
              },
              "✕ رجوع للمحاضرة"
            ),
            React.createElement("div", { className: "min-w-0" },
              React.createElement("h4", { className: "text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md" }, currentHandout.name || activeLecture.title),
              React.createElement("p", { className: "text-[10px] text-slate-400 hidden sm:block truncate" }, (activeLecture.subject || "") + " • " + (activeLecture.speaker || ""))
            )
          ),
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement(
              "a",
              {
                href: currentHandout.url,
                download: true,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 shadow-sm active:scale-95"
              },
              React.createElement("span", null, "⬇️"),
              React.createElement("span", null, "تحميل")
            )
          )
        ),

        // مساحة عرض الـ PDF كاملة الشاشة داخل التطبيق مع دعم التدوير
        React.createElement(
          "div",
          {
            ref: handoutScrollContainerRef,
            className: "flex-1 w-full h-[calc(100vh-56px)] bg-slate-950 relative overflow-y-auto overflow-x-hidden flex items-start justify-center"
          },
          React.createElement("iframe", {
            key: "fullscreen-handout",
            src: (function() {
              var url = currentHandout.url;
              if (url.includes("drive.google.com/file/d/")) {
                return url.replace(/\/view(\?.*)?$/, "/preview");
              }
              return url;
            })(),
            className: "w-full h-full border-0 transition-transform duration-300",
            style: {
              transform: handoutRotation ? ("rotate(" + handoutRotation + "deg)") : "none",
              transformOrigin: "center center",
              minHeight: handoutRotation % 180 !== 0 ? "100vw" : "100%",
              minWidth: handoutRotation % 180 !== 0 ? "100vh" : "100%"
            },
            title: currentHandout.name || "Handout Fullscreen Viewer"
          }),

          // شريط الأدوات العائم الزجاجي الشفاف بمتناول الإبهام بالأسفل
          React.createElement(
            "div",
            {
              className: "fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/40 backdrop-blur-md text-white border border-white/15 shadow-2xl transition-all hover:bg-slate-950/60"
            },
            // زر التدوير 90 درجة
            React.createElement(
              "button",
              {
                type: "button",
                onClick: handleRotateHandout,
                title: "تدوير الصفحة 90 درجة",
                className: "px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-teal-300 font-bold flex items-center gap-1 active:scale-95 transition-all text-xs border border-white/10"
              },
              React.createElement("span", null, "🔄"),
              React.createElement("span", { className: "font-mono text-[11px]" }, handoutRotation + "°")
            ),
            // خط فاصل رفيع
            React.createElement("div", { className: "w-[1px] h-4 bg-white/20 mx-0.5" }),
            // زر الصفحة السابقة (Page Up)
            React.createElement(
              "button",
              {
                type: "button",
                onClick: handleHandoutPageUp,
                title: "الصفحة السابقة (Page Up)",
                className: "w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center active:scale-95 transition-all text-xs border border-white/10"
              },
              "▲"
            ),
            // نص أو أيقونة التصفح
            React.createElement(
              "span",
              { className: "text-[11px] font-bold text-slate-300 px-1 select-none" },
              "صفحة"
            ),
            // زر الصفحة التالية (Page Down)
            React.createElement(
              "button",
              {
                type: "button",
                onClick: handleHandoutPageDown,
                title: "الصفحة التالية (Page Down)",
                className: "w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center active:scale-95 transition-all text-xs border border-white/10"
              },
              "▼"
            )
          )
        )
      );
    })()
  );
};
