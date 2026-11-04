// مكون عارض شرائح العرض التقديمي التفاعلي (Responsive Presentation Slides Viewer)
// مصمم ليعمل بسلاسة فائقة على شاشات الموبايل والمتصفحات المكتبية مع إمكانية التعديل والحذف والإضافة للمشرف
window.PresentationSlidesViewer = function(props) {
  var slidesData = props.slides || [];
  var items = Array.isArray(slidesData) ? slidesData : (slidesData.items || []);
  var isDraft = props.isDraft;
  var isAdmin = props.isAdmin;
  var onPublishToggle = props.onPublishToggle;
  var onRequestEdit = props.onRequestEdit;
  var onUpdateSlides = props.onUpdateSlides;

  var [currentIndex, setCurrentIndex] = React.useState(0);
  var [showNotes, setShowNotes] = React.useState(false);
  var [isFullscreen, setIsFullscreen] = React.useState(false);

  // حالة نافذة إضافة وتعديل الشريحة
  var [isSlideModalOpen, setIsSlideModalOpen] = React.useState(false);
  var [editingSlideIndex, setEditingSlideIndex] = React.useState(-1); // -1 = إضافة شريحة جديدة
  var [formSlideTitle, setFormSlideTitle] = React.useState("");
  var [formSlideIcon, setFormSlideIcon] = React.useState("💡");
  var [formSlideBullets, setFormSlideBullets] = React.useState("");
  var [formSlideNotes, setFormSlideNotes] = React.useState("");

  var total = items.length;

  // فتح نافذة تعديل شريحة
  var handleOpenEditSlide = function(idx) {
    var sl = items[idx];
    if (!sl) return;
    setEditingSlideIndex(idx);
    setFormSlideTitle(sl.title || "");
    setFormSlideIcon(sl.icon || "💡");
    setFormSlideBullets(Array.isArray(sl.bullets) ? sl.bullets.join("\n") : "");
    setFormSlideNotes(sl.presenterNotes || "");
    setIsSlideModalOpen(true);
  };

  // فتح نافذة إضافة شريحة جديدة
  var handleOpenAddSlide = function() {
    setEditingSlideIndex(-1);
    setFormSlideTitle("");
    setFormSlideIcon("💡");
    setFormSlideBullets("");
    setFormSlideNotes("");
    setIsSlideModalOpen(true);
  };

  // حفظ الشريحة
  var handleSaveSlide = function() {
    if (!formSlideTitle.trim()) {
      alert("يرجى إدخال عنوان الشريحة.");
      return;
    }

    var bulletsList = formSlideBullets
      .split("\n")
      .map(function(b) { return b.trim(); })
      .filter(Boolean);

    if (bulletsList.length === 0) {
      alert("يرجى إدخال نقطة واحدة على الأقل في الشريحة (سطر واحد على الأقل).");
      return;
    }

    var newSlideObj = {
      slideNumber: editingSlideIndex >= 0 ? (editingSlideIndex + 1) : (items.length + 1),
      title: formSlideTitle.trim(),
      icon: formSlideIcon.trim() || "💡",
      bullets: bulletsList,
      presenterNotes: formSlideNotes.trim()
    };

    var updatedList = items.slice();
    if (editingSlideIndex >= 0) {
      updatedList[editingSlideIndex] = newSlideObj;
    } else {
      updatedList.push(newSlideObj);
    }

    // إعادة ترقيم الشرائح بالتسلسل
    updatedList.forEach(function(s, i) { s.slideNumber = i + 1; });

    if (onUpdateSlides) {
      onUpdateSlides(updatedList);
    }

    setIsSlideModalOpen(false);
    if (editingSlideIndex === -1) {
      setCurrentIndex(updatedList.length - 1);
    }
  };

  // حذف الشريحة مع التأكيد
  var handleDeleteSlide = function(idx) {
    var sNum = idx + 1;
    if (!window.confirm("هل أنت متأكد من حذف الشريحة رقم " + sNum + " نهائياً؟")) {
      return;
    }
    var updatedList = items.filter(function(_, i) { return i !== idx; });
    updatedList.forEach(function(s, i) { s.slideNumber = i + 1; });

    if (onUpdateSlides) {
      onUpdateSlides(updatedList);
    }
    setCurrentIndex(Math.max(0, Math.min(idx, updatedList.length - 1)));
  };

  // نافذة محرر الشريحة المنبثقة
  var renderSlideEditorModal = function() {
    if (!isSlideModalOpen) return null;
    return React.createElement(
      "div",
      {
        className: "fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200",
        onClick: function(e) { if (e.target === e.currentTarget) setIsSlideModalOpen(false); }
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
            React.createElement("span", { className: "text-2xl" }, editingSlideIndex >= 0 ? "✏️" : "➕"),
            React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" },
              editingSlideIndex >= 0 ? ("تعديل الشريحة رقم " + (editingSlideIndex + 1)) : "إضافة شريحة عرض جديدة"
            )
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setIsSlideModalOpen(false); },
              className: "w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold"
            },
            "✕"
          )
        ),

        // جسم النافذة: حقول التعديل
        React.createElement(
          "div",
          { className: "space-y-3.5" },

          // أيقونة الشريحة وعنوانها
          React.createElement(
            "div",
            { className: "grid grid-cols-4 gap-2" },
            React.createElement(
              "div",
              { className: "col-span-1" },
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "الأيقونة:"),
              React.createElement("input", {
                type: "text",
                value: formSlideIcon,
                onChange: function(e) { setFormSlideIcon(e.target.value); },
                placeholder: "💡",
                className: "w-full text-center py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              })
            ),
            React.createElement(
              "div",
              { className: "col-span-3" },
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "عنوان الشريحة:"),
              React.createElement("input", {
                type: "text",
                value: formSlideTitle,
                onChange: function(e) { setFormSlideTitle(e.target.value); },
                placeholder: "اكتب عنواناً جذاباً وموجزاً للشريحة...",
                className: "w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              })
            )
          ),

          // نقاط الشريحة
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "نقاط ومحاور الشريحة (اكتب كل نقطة في سطر مستقل):"),
            React.createElement("textarea", {
              rows: 5,
              value: formSlideBullets,
              onChange: function(e) { setFormSlideBullets(e.target.value); },
              placeholder: "النقطة الأولى...\nالنقطة الثانية...\nالنقطة الثالثة...",
              className: "w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
            })
          ),

          // إضاءة وملاحظات المحاضر
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "💡 إضاءة وملاحظات الشرح للمحاضر (اختياري):"),
            React.createElement("textarea", {
              rows: 3,
              value: formSlideNotes,
              onChange: function(e) { setFormSlideNotes(e.target.value); },
              placeholder: "ملاحظات إرشادية للمشير أو الخادم أثناء عرض هذه الشريحة...",
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
              onClick: function() { setIsSlideModalOpen(false); },
              className: "px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            },
            "إلغاء"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleSaveSlide,
              className: "px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            },
            React.createElement("span", null, "💾"),
            React.createElement("span", null, "حفظ الشريحة")
          )
        )
      )
    );
  };

  // التنقل عبر لوحة المفاتيح
  React.useEffect(function() {
    var handleKeyDown = function(e) {
      if (total <= 1 || isSlideModalOpen) return;
      if (e.key === "ArrowLeft") {
        setCurrentIndex(function(prev) { return Math.min(prev + 1, total - 1); });
      } else if (e.key === "ArrowRight") {
        setCurrentIndex(function(prev) { return Math.max(prev - 1, 0); });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return function() { window.removeEventListener("keydown", handleKeyDown); };
  }, [total, isSlideModalOpen]);

  if (!items || items.length === 0) {
    return React.createElement(
      "div",
      { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
      React.createElement("div", { className: "text-4xl" }, "📊"),
      React.createElement("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200" }, "لا توجد شرائح عرض لهذه المحاضرة بعد"),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto leading-relaxed" },
        "يمكن لمسؤول المنصة توليد شرائح العرض التقديمي بالذكاء الاصطناعي، أو إضافة شرائح يدوياً الآن."
      ),
      isAdmin && React.createElement(
        "button",
        {
          type: "button",
          onClick: handleOpenAddSlide,
          className: "mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-95"
        },
        React.createElement("span", null, "➕"),
        React.createElement("span", null, "إضافة أول شريحة يدوياً")
      ),
      renderSlideEditorModal()
    );
  }

  var currentSlide = items[currentIndex] || {};
  var progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  var containerClasses = isFullscreen
    ? "fixed inset-0 z-50 bg-slate-950 text-white p-4 sm:p-8 flex flex-col justify-between overflow-y-auto"
    : "space-y-4";

  return React.createElement(
    "div",
    { className: containerClasses },

    // شريط علوي للتحكم والحالة
    React.createElement(
      "div",
      { className: "flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement("span", { className: "text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1" },
          "📊 شرائح العرض التقديمي",
          React.createElement("span", { className: "px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-black" },
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
        // زر ملء الشاشة
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { setIsFullscreen(function(v) { return !v; }); },
            className: "px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-all"
          },
          React.createElement("span", null, isFullscreen ? "✕" : "⛶"),
          React.createElement("span", { className: "hidden sm:inline" }, isFullscreen ? "إغلاق ملء الشاشة" : "عرض ملء الشاشة")
        ),

        // أزرار المسؤول: النشر والإضافة والتعديل
        isAdmin && React.createElement(
          "div",
          { className: "flex items-center gap-1.5 flex-wrap" },
          onPublishToggle && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { onPublishToggle("slides", !isDraft); },
              className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 " +
                (isDraft
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200")
            },
            React.createElement("span", null, isDraft ? "🚀 نشر للطلاب" : "🔒 تحويل لمسودة")
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleOpenAddSlide,
              className: "px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 flex items-center gap-1 transition-all"
            },
            React.createElement("span", null, "➕"),
            React.createElement("span", null, "إضافة شريحة جديدة")
          ),
          onRequestEdit && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { onRequestEdit("slides"); },
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

    // بطاقة الشريحة الرئيسية الكبرى
    React.createElement(
      "div",
      {
        className: "relative rounded-3xl p-6 sm:p-10 border transition-all shadow-lg flex flex-col justify-between min-h-[380px] sm:min-h-[440px] " +
          (isFullscreen
            ? "bg-slate-900/90 border-slate-800 text-white"
            : "bg-gradient-to-br from-white via-slate-50 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100")
      },

      // رأس الشريحة: الأيقونة والعنوان ورقم الشريحة وأزرار المسؤول
      React.createElement(
        "div",
        { className: "space-y-4" },
        React.createElement(
          "div",
          { className: "flex items-start justify-between gap-3 flex-wrap" },
          React.createElement(
            "div",
            { className: "flex items-center gap-3" },
            React.createElement(
              "span",
              { className: "w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-2xl flex items-center justify-center shrink-0 shadow-xs border border-indigo-200 dark:border-indigo-800" },
              currentSlide.icon || "💡"
            ),
            React.createElement(
              "div",
              null,
              React.createElement("span", { className: "text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5" },
                "شريحة رقم " + (currentSlide.slideNumber || (currentIndex + 1))
              ),
              React.createElement("h3", { className: "text-lg sm:text-2xl font-extrabold leading-snug" },
                currentSlide.title || "عنوان الشريحة"
              )
            )
          ),
          isAdmin && React.createElement(
            "div",
            { className: "flex items-center gap-1.5" },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { handleOpenEditSlide(currentIndex); },
                className: "px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
              },
              React.createElement("span", null, "✏️"),
              React.createElement("span", null, "تعديل الشريحة")
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { handleDeleteSlide(currentIndex); },
                className: "px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
              },
              React.createElement("span", null, "🗑️"),
              React.createElement("span", null, "حذف الشريحة")
            )
          )
        ),

        // فاصل جمالي
        React.createElement("hr", { className: "border-slate-200/80 dark:border-slate-800" }),

        // محتوى النقاط (Bullet Points)
        React.createElement(
          "div",
          { className: "space-y-3 pt-2" },
          Array.isArray(currentSlide.bullets) && currentSlide.bullets.map(function(bullet, bIdx) {
            return React.createElement(
              "div",
              {
                key: bIdx,
                className: "flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
              },
              React.createElement(
                "span",
                { className: "w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs" },
                (bIdx + 1)
              ),
              React.createElement(
                "p",
                { className: "text-sm sm:text-base font-medium leading-relaxed flex-1 text-slate-800 dark:text-slate-200" },
                bullet
              )
            );
          })
        )
      ),

      // قسم إضاءة المحاضر / الملاحظات الإضافية
      currentSlide.presenterNotes && React.createElement(
        "div",
        { className: "mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { setShowNotes(function(v) { return !v; }); },
            className: "text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          },
          React.createElement("span", null, showNotes ? "🔽 إخفاء إضاءة الشرح" : "💡 إظهار إضاءة وملاحظات الشرح للمحاضر")
        ),
        showNotes && React.createElement(
          "div",
          { className: "mt-2 p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-xs font-medium text-amber-900 dark:text-amber-200 leading-relaxed animate-in fade-in duration-200" },
          currentSlide.presenterNotes
        )
      )
    ),

    // شريط أزرار التنقل
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-3 pt-2" },
      React.createElement(
        "button",
        {
          type: "button",
          disabled: currentIndex === 0,
          onClick: function() { setCurrentIndex(function(p) { return Math.max(p - 1, 0); }); },
          className: "flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-98 shadow-xs"
        },
        React.createElement("span", null, "➡️"),
        React.createElement("span", null, "الشريحة السابقة")
      ),

      // مؤشر الشرائح السريع (Pill Selector)
      React.createElement(
        "div",
        { className: "hidden md:flex items-center gap-1 max-w-xs overflow-x-auto p-1.5 scrollbar-none" },
        items.map(function(_, sIdx) {
          var isCur = sIdx === currentIndex;
          return React.createElement(
            "button",
            {
              key: sIdx,
              type: "button",
              onClick: function() { setCurrentIndex(sIdx); },
              className: "w-7 h-7 rounded-lg text-xs font-bold transition-all shrink-0 " +
                (isCur
                  ? "bg-indigo-600 text-white scale-110 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200")
            },
            sIdx + 1
          );
        })
      ),

      React.createElement(
        "button",
        {
          type: "button",
          disabled: currentIndex === total - 1,
          onClick: function() { setCurrentIndex(function(p) { return Math.min(p + 1, total - 1); }); },
          className: "flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-slate-900 text-white dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-98 shadow-xs"
        },
        React.createElement("span", null, "الشريحة التالية"),
        React.createElement("span", null, "⬅️")
      )
    ),

    // نافذة محرر الشريحة المنبثقة
    renderSlideEditorModal()
  );
};
