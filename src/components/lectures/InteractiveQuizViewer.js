// مكون مشغل الكويز والاختبار التفاعلي الشامل (Responsive Interactive Quiz Viewer)
// متجاوب بالكامل مع شاشات الموبايل والمتصفحات مع تصحيح فوري وتفسير تعليمي وإمكانية التحرير والحذف والإضافة للمشرف
window.InteractiveQuizViewer = function(props) {
  var utils = window.APP_UTILS || {};
  var quizData = props.quiz || [];
  var questions = Array.isArray(quizData) ? quizData : (quizData.questions || []);
  var isDraft = props.isDraft;
  var isAdmin = props.isAdmin;
  var onPublishToggle = props.onPublishToggle;
  var onRequestEdit = props.onRequestEdit;
  var onUpdateQuiz = props.onUpdateQuiz;
  var onRegenerateQuiz = props.onRegenerateQuiz;
  var mediaUrl = props.mediaUrl;
  var onJumpToTimestamp = props.onJumpToTimestamp;
  var isGenerating = props.isGenerating;
  var generatingStatus = props.generatingStatus;

  var [currentIndex, setCurrentIndex] = React.useState(0);
  var [userAnswers, setUserAnswers] = React.useState({});
  var [showFinalScore, setShowFinalScore] = React.useState(false);
  var [showHelp, setShowHelp] = React.useState(false);
  var [showAllQuestionsView, setShowAllQuestionsView] = React.useState(false);

  // حالة نافذة إضافة وتعديل السؤال يدوياً للمشرف
  var [isModalOpen, setIsModalOpen] = React.useState(false);
  var [editingIndex, setEditingIndex] = React.useState(-1); // -1 تعني إضافة سؤال جديد
  var [formQuestion, setFormQuestion] = React.useState("");
  var [formOptions, setFormOptions] = React.useState(["", "", "", ""]);
  var [formCorrectIdx, setFormCorrectIdx] = React.useState(0);
  var [formExplanation, setFormExplanation] = React.useState("");
  var [formSourceQuote, setFormSourceQuote] = React.useState("");
  var [formTimestamp, setFormTimestamp] = React.useState("");
  var [formHint, setFormHint] = React.useState("");

  // إخفاء كارت المساعدة عند الانتقال بين الأسئلة
  React.useEffect(function() {
    setShowHelp(false);
  }, [currentIndex]);

  var total = questions.length;

  // فتح نافذة التعديل لسؤال محدد
  var handleOpenEditQuestion = function(idx) {
    var q = questions[idx];
    if (!q) return;
    setEditingIndex(idx);
    setFormQuestion(q.question || "");
    var opts = Array.isArray(q.options) ? q.options.slice() : [];
    while (opts.length < 4) opts.push("");
    setFormOptions(opts.slice(0, 4));
    setFormCorrectIdx(typeof q.correctAnswerIndex === "number" ? q.correctAnswerIndex : 0);
    setFormExplanation(q.explanation || "");
    setFormSourceQuote(q.sourceQuote || "");
    setFormTimestamp(q.timestamp || "");
    setFormHint(q.hint || "");
    setIsModalOpen(true);
  };

  // فتح نافذة إضافة سؤال جديد
  var handleOpenAddQuestion = function() {
    setEditingIndex(-1);
    setFormQuestion("");
    setFormOptions(["", "", "", ""]);
    setFormCorrectIdx(0);
    setFormExplanation("");
    setFormSourceQuote("");
    setFormTimestamp("");
    setFormHint("");
    setIsModalOpen(true);
  };

  // حفظ السؤال (إضافة أو تعديل)
  var handleSaveQuestion = function() {
    if (!formQuestion.trim()) {
      alert("يرجى كتابة نص السؤال أولاً.");
      return;
    }
    if (formOptions.some(function(opt) { return !opt.trim(); })) {
      alert("يرجى كتابة جميع خيارات الإجابة الأربعة.");
      return;
    }

    var newQuestionObj = {
      id: (editingIndex >= 0 && questions[editingIndex] && questions[editingIndex].id)
        ? questions[editingIndex].id
        : ("q_" + Date.now()),
      question: formQuestion.trim(),
      options: formOptions.map(function(o) { return o.trim(); }),
      correctAnswerIndex: formCorrectIdx,
      explanation: formExplanation.trim(),
      sourceQuote: formSourceQuote.trim(),
      timestamp: formTimestamp.trim(),
      hint: formHint.trim()
    };

    var updatedList = questions.slice();
    if (editingIndex >= 0) {
      updatedList[editingIndex] = newQuestionObj;
    } else {
      updatedList.push(newQuestionObj);
    }

    if (onUpdateQuiz) {
      onUpdateQuiz(updatedList);
    }

    setIsModalOpen(false);
    if (editingIndex === -1) {
      setCurrentIndex(updatedList.length - 1);
    }
    setUserAnswers({});
  };

  // حذف السؤال مع التأكيد
  var handleDeleteQuestion = function(idx) {
    var qNum = idx + 1;
    if (!window.confirm("هل أنت متأكد من حذف السؤال رقم " + qNum + " نهائياً من هذا الاختبار؟")) {
      return;
    }
    var updatedList = questions.filter(function(_, i) { return i !== idx; });
    if (onUpdateQuiz) {
      onUpdateQuiz(updatedList);
    }
    setCurrentIndex(Math.max(0, Math.min(idx, updatedList.length - 1)));
    setUserAnswers({});
  };

  // نافذة محرر السؤال المنبثقة
  var renderEditorModal = function() {
    if (!isModalOpen) return null;
    return React.createElement(
      "div",
      {
        className: "fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200",
        onClick: function(e) { if (e.target === e.currentTarget) setIsModalOpen(false); }
      },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" },

        // رأس النافذة
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("span", { className: "text-2xl" }, editingIndex >= 0 ? "✏️" : "➕"),
            React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" },
              editingIndex >= 0 ? ("تعديل السؤال رقم " + (editingIndex + 1)) : "إضافة سؤال جديد للاختبار"
            )
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setIsModalOpen(false); },
              className: "w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold"
            },
            "✕"
          )
        ),

        // جسم النافذة: حقول التعديل
        React.createElement(
          "div",
          { className: "space-y-3" },

          // نص السؤال
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "نص السؤال:"),
            React.createElement("textarea", {
              rows: 3,
              value: formQuestion,
              onChange: function(e) { setFormQuestion(e.target.value); },
              placeholder: "اكتب نص السؤال هنا بدقة...",
              className: "w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            })
          ),

          // خيارات الإجابة الأربعة
          React.createElement(
            "div",
            { className: "space-y-2 pt-1" },
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "خيارات الإجابة (حدد الدائرة للإجابة الصحيحة):"),
            [0, 1, 2, 3].map(function(optIdx) {
              var isCorrect = formCorrectIdx === optIdx;
              return React.createElement(
                "div",
                {
                  key: optIdx,
                  className: "flex items-center gap-2 p-2 rounded-xl border transition-all " +
                    (isCorrect
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/80"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700")
                },
                React.createElement("input", {
                  type: "radio",
                  name: "correctOptionRadio",
                  checked: isCorrect,
                  onChange: function() { setFormCorrectIdx(optIdx); },
                  className: "w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                }),
                React.createElement("span", { className: "text-xs font-bold text-slate-500 shrink-0 w-5 text-center" }, String.fromCharCode(65 + optIdx)),
                React.createElement("input", {
                  type: "text",
                  value: formOptions[optIdx] || "",
                  onChange: function(e) {
                    var val = e.target.value;
                    setFormOptions(function(prev) {
                      var next = prev.slice();
                      next[optIdx] = val;
                      return next;
                    });
                  },
                  placeholder: "نص الخيار " + String.fromCharCode(65 + optIdx),
                  className: "flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                })
              );
            })
          ),

          // المقتطف المرجعي من المحاضرة (sourceQuote)
          React.createElement(
            "div",
            { className: "pt-1" },
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "📖 المقتطف النصي من صلب المحاضرة (موضع الإجابة):"),
            React.createElement("textarea", {
              rows: 2,
              value: formSourceQuote,
              onChange: function(e) { setFormSourceQuote(e.target.value); },
              placeholder: "اقتبس الفقرة من كلام المحاضر التي تتضمن إجابة السؤال وموضعه...",
              className: "w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-serif"
            })
          ),

          // التوقيت الزمني في الفيديو (timestamp)
          React.createElement(
            "div",
            { className: "pt-1" },
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "⏱️ التوقيت في الفيديو (مثال: 14:25):"),
            React.createElement("input", {
              type: "text",
              value: formTimestamp,
              onChange: function(e) { setFormTimestamp(e.target.value); },
              placeholder: "مثال: 14:25 أو 01:05:20",
              className: "w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            })
          ),

          // التلميح الإرشادي (hint)
          React.createElement(
            "div",
            { className: "pt-1" },
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "💡 تلميح للمساعدة (يوجه الدارس دون كشف الحل):"),
            React.createElement("input", {
              type: "text",
              value: formHint,
              onChange: function(e) { setFormHint(e.target.value); },
              placeholder: "مثال: راجع حديث المحاضر حول الحاجة إلى الأمان...",
              className: "w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            })
          ),

          // التفسير والشرح العلمي
          React.createElement(
            "div",
            { className: "pt-1" },
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "💡 التفسير والشرح لسبب صحة الإجابة:"),
            React.createElement("textarea", {
              rows: 2,
              value: formExplanation,
              onChange: function(e) { setFormExplanation(e.target.value); },
              placeholder: "اشرح لماذا هذه الإجابة صحيحة وما الدليل من المحاضرة...",
              className: "w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            })
          )
        ),

        // أزرار الحفظ والإلغاء
        React.createElement(
          "div",
          { className: "flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setIsModalOpen(false); },
              className: "px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            },
            "إلغاء"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleSaveQuestion,
              className: "px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            },
            React.createElement("span", null, "💾"),
            React.createElement("span", null, "حفظ السؤال")
          )
        )
      )
    );
  };

  if (!questions || total === 0) {
    return React.createElement(
      "div",
      { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
      React.createElement("div", { className: "text-4xl" }, isGenerating ? "⏳" : "📝"),
      React.createElement("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200" },
        isGenerating ? "جاري استخراج وتوليد أسئلة الكويز..." : "لا يوجد اختبار تفاعلي لهذه المحاضرة بعد"
      ),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto leading-relaxed" },
        isGenerating
          ? (generatingStatus || "يقوم الذكاء الاصطناعي الآن بقراءة وتحليل نص وتفريغ المحاضرة واستخراج أسئلة دقيقة...")
          : "يمكن لمسؤول المنصة توليد أسئلة الكويز بالذكاء الاصطناعي، أو كتابة وإضافة أسئلة يدوياً الآن."
      ),
      isGenerating ? React.createElement(
        "div",
        { className: "pt-2 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse" },
        React.createElement("span", { className: "w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin inline-block" }),
        React.createElement("span", null, "يرجى الانتظار بضع ثوانٍ حتى اكتمال المعالجة...")
      ) : React.createElement(
        "div",
        { className: "flex items-center justify-center gap-2 flex-wrap pt-2" },
        isAdmin && onRegenerateQuiz && React.createElement(
          "button",
          {
            type: "button",
            onClick: onRegenerateQuiz,
            className: "px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          },
          React.createElement("span", null, "🔄"),
          React.createElement("span", null, "توليد الكويز بالذكاء الاصطناعي")
        ),
        isAdmin && React.createElement(
          "button",
          {
            type: "button",
            onClick: handleOpenAddQuestion,
            className: "px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-95"
          },
          React.createElement("span", null, "➕"),
          React.createElement("span", null, "إضافة أول سؤال يدوياً")
        )
      ),
      renderEditorModal()
    );
  }

  // حساب الدرجة النهائية
  var calculateScore = function() {
    var score = 0;
    questions.forEach(function(q, idx) {
      if (userAnswers[idx] !== undefined && userAnswers[idx] === q.correctAnswerIndex) {
        score++;
      }
    });
    return score;
  };

  var handleSelectOption = function(optIndex) {
    if (userAnswers[currentIndex] !== undefined) return;
    setUserAnswers(function(prev) {
      var next = Object.assign({}, prev);
      next[currentIndex] = optIndex;
      return next;
    });
  };

  var handleResetQuiz = function() {
    setUserAnswers({});
    setCurrentIndex(0);
    setShowFinalScore(false);
  };

  var currentQuestion = questions[currentIndex] || {};
  var answeredCurrent = userAnswers[currentIndex] !== undefined;
  var currentSelectedOpt = userAnswers[currentIndex];
  var progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  var totalAnswered = Object.keys(userAnswers).length;

  // شاشة النتيجة النهائية
  if (showFinalScore) {
    var finalScore = calculateScore();
    var percentage = Math.round((finalScore / total) * 100);

    var badgeText = "ممتاز جداً ومستوعب ببراعة 🌟";
    var badgeColor = "bg-emerald-500 text-white";
    if (percentage < 60) {
      badgeText = "تحتاج لمراجعة المحاضرة مرة أخرى 📚";
      badgeColor = "bg-amber-500 text-white";
    } else if (percentage < 85) {
      badgeText = "أداء جيد جداً ومجهود رائع 👍";
      badgeColor = "bg-indigo-600 text-white";
    }

    return React.createElement(
      "div",
      { className: "p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-6 shadow-xl max-w-lg mx-auto animate-in zoom-in-95 duration-200" },
      React.createElement("div", { className: "text-5xl" }, percentage >= 70 ? "🎉" : "📖"),
      React.createElement(
        "div",
        { className: "space-y-2" },
        React.createElement("span", { className: "inline-block px-4 py-1.5 rounded-full text-xs font-bold " + badgeColor }, badgeText),
        React.createElement("h3", { className: "text-2xl font-black text-slate-800 dark:text-slate-100" }, "نتيجة تقييم الاختبار"),
        React.createElement(
          "div",
          { className: "text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 py-2" },
          finalScore + " / " + total,
          React.createElement("span", { className: "text-lg font-bold text-slate-400 mr-2" }, "(" + percentage + "%)")
        )
      ),
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row items-center justify-center gap-3 pt-2" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleResetQuiz,
            className: "w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-md hover:bg-indigo-700 transition-all active:scale-98"
          },
          "🔄 إعادة الاختبار من البداية"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { setShowFinalScore(false); setCurrentIndex(0); },
            className: "w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-200 transition-all"
          },
          "🔍 مراجعة الإجابات والتفسيرات"
        )
      )
    );
  }

  return React.createElement(
    "div",
    { className: "space-y-4" },

    // مؤشر حالة التوليد الجاري في الواجهة
    isGenerating && React.createElement(
      "div",
      { className: "p-3.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-3 text-xs font-bold text-indigo-700 dark:text-indigo-300 animate-pulse shadow-xs" },
      React.createElement("div", { className: "w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" }),
      React.createElement(
        "div",
        { className: "flex-1" },
        React.createElement("div", { className: "text-indigo-900 dark:text-indigo-100 font-extrabold text-xs" }, "جاري إعداد وتوليد أسئلة الكويز بالذكاء الاصطناعي..."),
        React.createElement("div", { className: "text-[11px] text-indigo-600/80 dark:text-indigo-400 font-normal mt-0.5" }, generatingStatus || "يقوم النموذج بتحليل تفريغ المحاضرة واستخراج أسئلة دقيقة مع الاقتباسات والتوقيتات الزمنية.")
      )
    ),

    // شريط علوي للمسؤول والتحكم والحالة
    React.createElement(
      "div",
      { className: "flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement("span", { className: "text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1" },
          "📝 الاختبار التفاعلي",
          React.createElement("span", { className: "px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-black" },
            (currentIndex + 1) + " / " + total
          )
        ),
        isDraft && React.createElement(
          "span",
          { className: "px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold" },
          "🔒 مسودة خاصة (غير منشورة للطلاب)"
        )
      ),

      React.createElement(
        "div",
        { className: "flex items-center gap-1.5 flex-wrap" },
        // مؤشر الإجابات المكتملة
        React.createElement("span", { className: "text-xs font-bold text-slate-500" },
          "تم حل: " + totalAnswered + " من " + total
        ),

        // أزرار المسؤول
        isAdmin && React.createElement(
          "div",
          { className: "flex items-center gap-1.5 flex-wrap" },
          onPublishToggle && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { onPublishToggle("quiz", !isDraft); },
              className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " +
                (isDraft
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200")
            },
            isDraft ? "🚀 نشر للطلاب" : "🔒 تحويل لمسودة"
          ),
          isAdmin && onRegenerateQuiz && React.createElement(
            "button",
            {
              type: "button",
              disabled: isGenerating,
              onClick: onRegenerateQuiz,
              className: "px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 " +
                (isGenerating
                  ? "bg-indigo-400 dark:bg-indigo-800 cursor-not-allowed opacity-80"
                  : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer active:scale-95") +
                " text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
            },
            React.createElement("span", { className: isGenerating ? "animate-spin inline-block" : "" }, isGenerating ? "⏳" : "🔄"),
            React.createElement("span", null, isGenerating ? "جاري استخراج وتوليد الكويز..." : "إعادة استخراج وتوليد الكويز")
          ),
          isAdmin && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setShowAllQuestionsView(function(v) { return !v; }); },
              className: "px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-100/90 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-200 text-xs font-bold hover:bg-indigo-200 flex items-center gap-1.5 shadow-2xs"
            },
            React.createElement("span", null, showAllQuestionsView ? "🎯 وضع الاختبار الفردي" : "📋 إدارة ومراجعة كافة الأسئلة")
          ),
          isAdmin && React.createElement(
            "button",
            {
              type: "button",
              onClick: handleOpenAddQuestion,
              className: "px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 flex items-center gap-1 transition-all"
            },
            React.createElement("span", null, "➕"),
            React.createElement("span", null, "إضافة سؤال")
          ),
          onRequestEdit && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { onRequestEdit("quiz"); },
              className: "px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 flex items-center gap-1"
            },
            React.createElement("span", null, "✨"),
            React.createElement("span", { className: "hidden sm:inline" }, "تعديل بالذكاء الاصطناعي")
          )
        )
      )
    ),

    // شريط التقدم المرئي
    React.createElement(
      "div",
      { className: "w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden" },
      React.createElement("div", {
        className: "bg-emerald-500 h-full transition-all duration-300 rounded-full",
        style: { width: progress + "%" }
      })
    ),

    // مؤشر التنقل السريع بين الأسئلة (نقاط ملونة للأجهزة والموبايل)
    React.createElement(
      "div",
      { className: "flex items-center gap-1.5 overflow-x-auto p-1 scrollbar-none" },
      questions.map(function(q, qIdx) {
        var isCur = qIdx === currentIndex;
        var ans = userAnswers[qIdx];
        var isAns = ans !== undefined;
        var isRight = isAns && ans === q.correctAnswerIndex;

        var dotClass = isCur
          ? "ring-2 ring-indigo-500 ring-offset-2 scale-110 font-black "
          : "";

        if (isAns) {
          dotClass += isRight
            ? "bg-emerald-500 text-white"
            : "bg-rose-500 text-white";
        } else {
          dotClass += "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200";
        }

        return React.createElement(
          "button",
          {
            key: qIdx,
            type: "button",
            onClick: function() { setCurrentIndex(qIdx); },
            className: "w-7 h-7 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center " + dotClass
          },
          qIdx + 1
        );
      })
    ),

    // التحويل بين: قائمة إدارة كافة الأسئلة دفعة واحدة / أو بطاقة السؤال الفردي
    showAllQuestionsView ? React.createElement(
      "div",
      { className: "space-y-4 animate-in fade-in duration-200" },
      // رأس شاشة الإدارة المجمعة
      React.createElement(
        "div",
        { className: "p-4 sm:p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between flex-wrap gap-3" },
        React.createElement(
          "div",
          null,
          React.createElement("h4", { className: "text-sm sm:text-base font-black text-indigo-950 dark:text-indigo-100 flex items-center gap-2" },
            React.createElement("span", null, "📋"),
            React.createElement("span", null, "إدارة ومراجعة كافة الأسئلة المسرودة (" + total + " سؤال)")
          ),
          React.createElement("p", { className: "text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5" },
            "يمكنك هنا تصفح ومراجعة كل الأسئلة دفعة واحدة، وحذف أي سؤال تافه أو تعديله بضغطة واحدة دون الحاجة للتنقل."
          )
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleOpenAddQuestion,
              className: "px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-xs flex items-center gap-1"
            },
            React.createElement("span", null, "➕"),
            React.createElement("span", null, "إضافة سؤال جديد")
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setShowAllQuestionsView(false); },
              className: "px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1"
            },
            React.createElement("span", null, "🎯"),
            React.createElement("span", null, "العودة لوضع الاختبار")
          )
        )
      ),

      // قائمة الأسئلة المسرودة
      questions.map(function(q, qIdx) {
        return React.createElement(
          "div",
          {
            key: q.id || qIdx,
            className: "p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative hover:border-indigo-300 transition-all"
          },
          // رأس بطاقة السؤال
          React.createElement(
            "div",
            { className: "flex items-start justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-2.5" },
            React.createElement(
              "div",
              { className: "flex items-center gap-2 flex-1" },
              React.createElement("span", { className: "w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center font-mono shrink-0" }, qIdx + 1),
              React.createElement("h5", { className: "text-xs sm:text-sm font-black text-slate-900 dark:text-white" }, q.question)
            ),
            React.createElement(
              "div",
              { className: "flex items-center gap-1.5 shrink-0" },
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { handleOpenEditQuestion(qIdx); },
                  className: "px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 flex items-center gap-1 shadow-2xs"
                },
                React.createElement("span", null, "✏️"),
                React.createElement("span", null, "تعديل")
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { handleDeleteQuestion(qIdx); },
                  className: "px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 flex items-center gap-1 shadow-2xs"
                },
                React.createElement("span", null, "🗑️"),
                React.createElement("span", null, "حذف")
              )
            )
          ),

          // خيارات السؤال مع تلوين الإجابة الصحيحة بالأخضر
          React.createElement(
            "div",
            { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" },
            (q.options || []).map(function(opt, optI) {
              var isCorrect = optI === q.correctAnswerIndex;
              return React.createElement(
                "div",
                {
                  key: optI,
                  className: "p-2.5 rounded-xl border flex items-center justify-between " +
                    (isCorrect
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300")
                },
                React.createElement("span", null, String.fromCharCode(65 + optI) + ". " + opt),
                isCorrect && React.createElement("span", { className: "text-emerald-600 font-bold text-[11px]" }, "✓ الصحيحة")
              );
            })
          ),

          // المقتطف المرجعي والتوقيت في الفيديو
          (q.sourceQuote || q.timestamp) && React.createElement(
            "div",
            { className: "p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed space-y-1" },
            React.createElement(
              "div",
              { className: "flex items-center justify-between flex-wrap gap-2" },
              React.createElement("span", { className: "font-bold" }, "📖 المقتطف من صلب المحاضرة:"),
              q.timestamp && React.createElement("span", { className: "font-mono font-black text-amber-800 dark:text-amber-300" }, "⏱️ " + q.timestamp)
            ),
            q.sourceQuote && React.createElement("p", { className: "italic text-slate-800 dark:text-slate-200" }, q.sourceQuote)
          ),

          // التفسير
          q.explanation && React.createElement(
            "p",
            { className: "text-xs text-slate-500 dark:text-slate-400 leading-relaxed" },
            "💡 " + q.explanation
          )
        );
      })
    ) : React.createElement(
      "div",
      { className: "p-5 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-5 relative" },

      // شريط عنوان السؤال وأزرار تعديل وحذف السؤال للمسؤول
      React.createElement(
        "div",
        { className: "flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3" },
        React.createElement("span", { className: "text-xs font-bold text-indigo-600 dark:text-indigo-400 block" },
          "السؤال رقم " + (currentIndex + 1) + " من " + total
        ),
        isAdmin && React.createElement(
          "div",
          { className: "flex items-center gap-1.5" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { handleOpenEditQuestion(currentIndex); },
              className: "px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
            },
            React.createElement("span", null, "✏️"),
            React.createElement("span", null, "تعديل هذا السؤال")
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { handleDeleteQuestion(currentIndex); },
              className: "px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
            },
            React.createElement("span", null, "🗑️"),
            React.createElement("span", null, "حذف السؤال")
          )
        )
      ),

      // نص السؤال
      React.createElement(
        "div",
        { className: "space-y-1" },
        React.createElement("h3", { className: "text-base sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-snug" },
          currentQuestion.question || "نص السؤال"
        )
      ),

      // قائمة الخيارات الأربعة (Responsive Tap Cards)
      React.createElement(
        "div",
        { className: "space-y-2.5 pt-1" },
        Array.isArray(currentQuestion.options) && currentQuestion.options.map(function(optText, optIdx) {
          var isChosen = currentSelectedOpt === optIdx;
          var isCorrectAnswer = optIdx === currentQuestion.correctAnswerIndex;

          var optClasses = "flex items-center justify-between p-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ";

          if (!answeredCurrent) {
            optClasses += "bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:border-indigo-400 active:scale-99";
          } else {
            if (isCorrectAnswer) {
              optClasses += "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold shadow-xs";
            } else if (isChosen && !isCorrectAnswer) {
              optClasses += "bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-800 dark:text-rose-200 font-bold";
            } else {
              optClasses += "bg-slate-50/40 dark:bg-slate-800/20 border-slate-200/40 dark:border-slate-800 text-slate-400 opacity-60";
            }
          }

          return React.createElement(
            "div",
            {
              key: optIdx,
              onClick: function() { handleSelectOption(optIdx); },
              className: optClasses
            },
            React.createElement(
              "div",
              { className: "flex items-center gap-3" },
              React.createElement(
                "span",
                { className: "w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border " +
                  (answeredCurrent && isCorrectAnswer
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : (answeredCurrent && isChosen
                      ? "bg-rose-500 text-white border-rose-500"
                      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"))
                },
                String.fromCharCode(65 + optIdx)
              ),
              React.createElement("span", null, optText)
            ),
            // أيقونة الحالة بعد الإجابة
            answeredCurrent && React.createElement(
              "span",
              { className: "text-sm font-bold" },
              isCorrectAnswer ? "✓ صحيحة" : (isChosen ? "✕ غير صحيحة" : "")
            )
          );
        })
      ),

      // زر المساعدة وإظهار موضع الإجابة من صلب المحاضرة
      React.createElement(
        "div",
        { className: "pt-1 flex items-center gap-2 flex-wrap" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { setShowHelp(function(v) { return !v; }); },
            className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all shadow-2xs"
          },
          React.createElement("span", null, "💡"),
          React.createElement("span", null, showHelp ? "إخفاء المساعدة" : "مساعدة: أين وردت هذه النقطة في المحاضرة؟")
        )
      ),

      // بطاقة المساعدة المنبثقة الموثقة بالتوقيت الدقيق في الفيديو
      showHelp && React.createElement(
        "div",
        { className: "p-4 sm:p-5 rounded-2xl bg-amber-50/95 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-xs sm:text-sm text-amber-950 dark:text-amber-200 space-y-2.5 animate-in fade-in duration-200" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between flex-wrap gap-2 border-b border-amber-200/60 dark:border-amber-900/40 pb-2" },
          React.createElement(
            "div",
            { className: "font-black flex items-center gap-1.5 text-amber-900 dark:text-amber-300" },
            React.createElement("span", null, "📖"),
            React.createElement("span", null, "مقتطف صريح من كلام المحاضر:")
          ),
          currentQuestion.timestamp && React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("span", { className: "font-mono font-black px-2 py-0.5 rounded-lg bg-amber-200/80 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 text-xs" }, "⏱️ " + currentQuestion.timestamp),
            (onJumpToTimestamp || mediaUrl) && React.createElement(
              "div",
              { className: "flex items-center gap-1.5 flex-wrap" },
              onJumpToTimestamp && React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() {
                    onJumpToTimestamp(currentQuestion.timestamp);
                  },
                  title: "الانتقال لمشغل الفيديو المدمج في المنصة مباشرة",
                  className: "px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                },
                React.createElement("span", null, "🎬"),
                React.createElement("span", null, "استمع في المشغل")
              ),
              mediaUrl && (function() {
                var sec = (utils && typeof utils.parseTimeToSeconds === "function")
                  ? utils.parseTimeToSeconds(currentQuestion.timestamp)
                  : 0;
                var ytId = (utils && typeof utils.getYouTubeVideoId === "function")
                  ? utils.getYouTubeVideoId(mediaUrl)
                  : "";
                var externalUrl = ytId
                  ? ("https://youtu.be/" + ytId + (sec > 0 ? ("?t=" + sec) : ""))
                  : (mediaUrl + (mediaUrl.indexOf("?") >= 0 ? "&" : "?") + "t=" + sec);
                return React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function() {
                      window.open(externalUrl, "_blank");
                    },
                    title: "فتح في تطبيق يوتيوب عند نفس التوقيت بالثانية",
                    className: "px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  },
                  React.createElement("span", null, "↗️"),
                  React.createElement("span", null, "يوتيوب")
                );
              })()
            )
          )
        ),
        React.createElement("p", { className: "leading-relaxed italic bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40" },
          currentQuestion.sourceQuote || currentQuestion.hint || currentQuestion.explanation || "يرجى مراجعة الشرح الوارد في تفريغ هذه المحاضرة."
        ),
        (currentQuestion.hint && currentQuestion.sourceQuote) && React.createElement(
          "p",
          { className: "text-[11px] text-amber-800 dark:text-amber-300 font-medium" },
          "💡 إرشاد: " + currentQuestion.hint
        )
      ),

      // بطاقة التفسير والشرح التعليمي (تظهر تلقائياً بعد الإجابة)
      (answeredCurrent && currentQuestion.explanation) && React.createElement(
        "div",
        { className: "p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 space-y-1.5 animate-in fade-in duration-200" },
        React.createElement("div", { className: "font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300" },
          "💡 التفسير والشرح التعليمي:"
        ),
        React.createElement("p", { className: "leading-relaxed" },
          currentQuestion.explanation
        )
      )
    ),

    // شريط أزرار التنقل السفلية
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-3 pt-2" },
      React.createElement(
        "button",
        {
          type: "button",
          disabled: currentIndex === 0,
          onClick: function() { setCurrentIndex(function(p) { return Math.max(p - 1, 0); }); },
          className: "px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center gap-2"
        },
        "➡️ السابق"
      ),

      // إذا وصل لآخر سؤال أو أنهى الأسئلة، زر عرض النتيجة
      (currentIndex === total - 1 || totalAnswered === total) ? React.createElement(
        "button",
        {
          type: "button",
          onClick: function() { setShowFinalScore(true); },
          className: "px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 active:scale-98"
        },
        "🏆 عرض النتيجة النهائية"
      ) : React.createElement(
        "button",
        {
          type: "button",
          onClick: function() { setCurrentIndex(function(p) { return Math.min(p + 1, total - 1); }); },
          className: "px-5 py-3 rounded-2xl bg-slate-900 text-white dark:bg-indigo-600 hover:opacity-90 font-bold text-sm shadow-xs transition-all flex items-center gap-2"
        },
        "التالي ⬅️"
      )
    ),

    // نافذة محرر السؤال المنبثقة
    renderEditorModal()
  );
};
