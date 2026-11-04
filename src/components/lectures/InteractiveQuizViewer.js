// مكون مشغل الكويز والاختبار التفاعلي الشامل (Responsive Interactive Quiz Viewer)
// متجاوب بالكامل مع شاشات الموبايل والمتصفحات مع تصحيح فوري وتفسير تعليمي وإمكانية التحرير والحذف والإضافة للمشرف
window.InteractiveQuizViewer = function(props) {
  var quizData = props.quiz || [];
  var questions = Array.isArray(quizData) ? quizData : (quizData.questions || []);
  var isDraft = props.isDraft;
  var isAdmin = props.isAdmin;
  var onPublishToggle = props.onPublishToggle;
  var onRequestEdit = props.onRequestEdit;
  var onUpdateQuiz = props.onUpdateQuiz;

  var [currentIndex, setCurrentIndex] = React.useState(0);
  var [userAnswers, setUserAnswers] = React.useState({});
  var [showFinalScore, setShowFinalScore] = React.useState(false);

  // حالة نافذة إضافة وتعديل السؤال يدوياً للمشرف
  var [isModalOpen, setIsModalOpen] = React.useState(false);
  var [editingIndex, setEditingIndex] = React.useState(-1); // -1 تعني إضافة سؤال جديد
  var [formQuestion, setFormQuestion] = React.useState("");
  var [formOptions, setFormOptions] = React.useState(["", "", "", ""]);
  var [formCorrectIdx, setFormCorrectIdx] = React.useState(0);
  var [formExplanation, setFormExplanation] = React.useState("");

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
    setIsModalOpen(true);
  };

  // فتح نافذة إضافة سؤال جديد
  var handleOpenAddQuestion = function() {
    setEditingIndex(-1);
    setFormQuestion("");
    setFormOptions(["", "", "", ""]);
    setFormCorrectIdx(0);
    setFormExplanation("");
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
      explanation: formExplanation.trim()
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
      React.createElement("div", { className: "text-4xl" }, "📝"),
      React.createElement("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200" }, "لا يوجد اختبار تفاعلي لهذه المحاضرة بعد"),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto leading-relaxed" },
        "يمكن لمسؤول المنصة توليد أسئلة الكويز بالذكاء الاصطناعي، أو كتابة وإضافة أسئلة يدوياً الآن."
      ),
      isAdmin && React.createElement(
        "button",
        {
          type: "button",
          onClick: handleOpenAddQuestion,
          className: "mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-95"
        },
        React.createElement("span", null, "➕"),
        React.createElement("span", null, "إضافة أول سؤال يدوياً")
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
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleOpenAddQuestion,
              className: "px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 flex items-center gap-1 transition-all"
            },
            React.createElement("span", null, "➕"),
            React.createElement("span", null, "إضافة سؤال جديد")
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

    // بطاقة السؤال الحالية
    React.createElement(
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
