// نافذة إدارة وتعديل المحاضرة أو الفعالية لمدير المنصة
window.LectureEditModal = function(props) {
  var editingLecture = props.editingLecture;
  var setEditingLecture = props.setEditingLecture;
  var editModalTab = props.editModalTab;
  var setEditModalTab = props.setEditModalTab;
  var editingHandoutUrl = props.editingHandoutUrl;
  var editingHandoutName = props.editingHandoutName;
  var isUploadingHandout = props.isUploadingHandout;
  var handleUploadHandout = props.handleUploadHandout;
  var editingQuizText = props.editingQuizText;
  var setEditingQuizText = props.setEditingQuizText;
  var onSave = props.onSave;
  var onClose = props.onClose;
  var subjectsList = props.subjectsList || [];

  if (!editingLecture) return null;

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: function(e) { if (e.target === e.currentTarget && onClose) onClose(); }
    },
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto" },
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b pb-3" },
        React.createElement("div", null,
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "✏️ إدارة وتعديل المحاضرة"),
          React.createElement("p", { className: "text-xs text-slate-400 mt-0.5" }, editingLecture.title)
        ),
        React.createElement("button", { onClick: function() { if (onClose) onClose(); }, className: "text-slate-400 text-lg hover:text-slate-600" }, "✕")
      ),

      // تبويبات النافذة للتنقل السريع
      React.createElement(
        "div",
        { className: "flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800 scrollbar-none" },
        [
          { id: "all", label: "الكل" },
          { id: "info", label: "ℹ️ البيانات العامة" },
          { id: "video", label: "📺 الفيديو" },
          { id: "handout", label: "📂 الهاند آوت" },
          { id: "audio", label: "🎙️ الملخص الصوتي" },
          { id: "summary", label: "📄 تقرير الملخص" },
          { id: "quiz", label: "📝 الكويز" }
        ].map(function(t) {
          var active = editModalTab === t.id;
          return React.createElement(
            "button",
            {
              key: t.id,
              type: "button",
              onClick: function() { if (setEditModalTab) setEditModalTab(t.id); },
              className: "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all " +
                (active ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200")
            },
            t.label
          );
        })
      ),

      React.createElement(
        "form",
        { onSubmit: onSave, className: "space-y-4 pt-1" },

        // قسم 1: البيانات العامة (العنوان والمحاضر والتاريخ والنوع)
        (editModalTab === "all" || editModalTab === "info") && React.createElement(
          "div",
          { className: "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-3" },
          React.createElement(
            "div",
            { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "نوع الفعالية / العنصر"),
              React.createElement("select", {
                value: (editingLecture.isExam || editingLecture.itemType === "exam") ? "exam" : (editingLecture.itemType || "lecture"),
                onChange: function(e) {
                  var val = e.target.value;
                  setEditingLecture(function(prev) {
                    return Object.assign({}, prev, {
                      itemType: val,
                      isExam: val === "exam"
                    });
                  });
                },
                className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-bold"
              }, [
                React.createElement("option", { key: "lecture", value: "lecture" }, "🎓 محاضرة دراسية"),
                React.createElement("option", { key: "exam", value: "exam" }, "📝 امتحان وتقييم نهائي"),
                React.createElement("option", { key: "workshop", value: "workshop" }, "🤝 ورشة عمل / نشاط")
              ])
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "تاريخ اليوم الدراسي"),
              React.createElement("input", {
                type: "date",
                required: true,
                value: editingLecture.date || "",
                onChange: function(e) {
                  var val = e.target.value;
                  setEditingLecture(function(prev) { return Object.assign({}, prev, { date: val }); });
                },
                className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
              })
            )
          ),
          React.createElement(
            "div",
            { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "ترتيب الجلسة في اليوم"),
              React.createElement("select", {
                value: editingLecture.sessionOrder || 1,
                onChange: function(e) {
                  var val = parseInt(e.target.value) || 1;
                  setEditingLecture(function(prev) { return Object.assign({}, prev, { sessionOrder: val }); });
                },
                className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
              }, [
                React.createElement("option", { key: 1, value: 1 }, "الجلسة الأولى (1)"),
                React.createElement("option", { key: 2, value: 2 }, "الجلسة الثانية (2)"),
                React.createElement("option", { key: 3, value: 3 }, "الجلسة الثالثة (3)")
              ])
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "المادة الدراسية"),
              React.createElement("input", {
                type: "text",
                value: editingLecture.subject || "",
                onChange: function(e) {
                  var val = e.target.value;
                  setEditingLecture(function(prev) { return Object.assign({}, prev, { subject: val }); });
                },
                list: "counseling-subjects-list-edit",
                placeholder: "مثال: مادة علم المشورة، النمو النفسي...",
                className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
              })
            )
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "عنوان المحاضرة أو الامتحان"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: editingLecture.title || "",
              onChange: function(e) {
                var val = e.target.value;
                setEditingLecture(function(prev) { return Object.assign({}, prev, { title: val }); });
              },
              placeholder: "اكتب العنوان هنا...",
              className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-bold"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "المحاضر / الدكتور / المسؤول"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: editingLecture.speaker || "",
              onChange: function(e) {
                var val = e.target.value;
                setEditingLecture(function(prev) { return Object.assign({}, prev, { speaker: val }); });
              },
              placeholder: "مثال: د. مجدي اسحق أو إدارة المعهد",
              className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "ملاحظات وتفاصيل الفعالية"),
            React.createElement("textarea", {
              rows: 2,
              value: editingLecture.notes || "",
              onChange: function(e) {
                var val = e.target.value;
                setEditingLecture(function(prev) { return Object.assign({}, prev, { notes: val }); });
              },
              placeholder: "ملاحظات هامة للدارسين...",
              className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
            })
          )
        ),

        // قسم 2: رابط الفيديو
        (editModalTab === "all" || editModalTab === "video") && React.createElement(
          "div",
          { className: "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5" },
          React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" },
            React.createElement("span", null, "📺"),
            React.createElement("span", null, "رابط المحاضرة على YouTube أو Google Drive")
          ),
          React.createElement("input", {
            type: "url",
            value: editingLecture.mediaUrl || "",
            onChange: function(e) {
              var val = e.target.value;
              setEditingLecture(function(prev) { return Object.assign({}, prev, { mediaUrl: val }); });
            },
            placeholder: "https://www.youtube.com/watch?v=... أو رابط جوجل درايف",
            className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
          }),
          React.createElement("p", { className: "text-[11px] text-slate-400" }, "يدعم روابط يوتيوب العادية والمختصرة وقوائم التشغيل وملفات درايف.")
        ),

        // قسم 3: ملفات الهاند آوت / العروض التقديمية (دعم ملفات متعددة)
        (editModalTab === "all" || editModalTab === "handout") && (function() {
          var handoutsList = Array.isArray(editingLecture.handouts)
            ? editingLecture.handouts
            : (editingLecture.handoutUrl
                ? [{ id: "h-0", url: editingLecture.handoutUrl, name: editingLecture.handoutName || "ملف الهاند آوت" }]
                : []);

          var updateHandout = function(idx, field, val) {
            var updated = handoutsList.slice();
            var target = Object.assign({}, updated[idx] || { id: "h-" + Date.now() });
            target[field] = val;
            updated[idx] = target;
            setEditingLecture(function(prev) {
              return Object.assign({}, prev, {
                handouts: updated,
                handoutUrl: updated[0] ? updated[0].url : "",
                handoutName: updated[0] ? updated[0].name : ""
              });
            });
          };

          var removeHandout = function(idx) {
            var updated = handoutsList.filter(function(_, i) { return i !== idx; });
            setEditingLecture(function(prev) {
              return Object.assign({}, prev, {
                handouts: updated,
                handoutUrl: updated[0] ? updated[0].url : "",
                handoutName: updated[0] ? updated[0].name : ""
              });
            });
          };

          var addBlankHandout = function() {
            var newItem = { id: "h-" + Date.now(), url: "", name: "" };
            var updated = handoutsList.concat([newItem]);
            setEditingLecture(function(prev) {
              return Object.assign({}, prev, {
                handouts: updated,
                handoutUrl: updated[0] ? updated[0].url : "",
                handoutName: updated[0] ? updated[0].name : ""
              });
            });
          };

          return React.createElement(
            "div",
            { className: "p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-800/40 border border-indigo-100 dark:border-slate-700/70 space-y-3" },
            React.createElement(
              "div",
              { className: "flex items-center justify-between flex-wrap gap-2" },
              React.createElement("label", { className: "text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" },
                React.createElement("span", null, "📂"),
                React.createElement("span", null, "ملفات الهاند آوت والعروض التقديمية (PDF / PPT)"),
                React.createElement("span", { className: "text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold" },
                  handoutsList.length + " ملف"
                )
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: addBlankHandout,
                  className: "text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center gap-1"
                },
                React.createElement("span", null, "➕"),
                React.createElement("span", null, "إضافة رابط هاند آوت إضافي")
              )
            ),

            // قائمة الملفات
            handoutsList.length === 0 ? React.createElement(
              "div",
              { className: "p-4 text-center border border-dashed border-indigo-200 dark:border-slate-700 rounded-xl text-xs text-slate-400" },
              "لا توجد ملفات هاند آوت مضافة حالياً. يمكنك رفع ملف من جهازك أو إضافة رابط مباشر."
            ) : React.createElement(
              "div",
              { className: "space-y-2.5" },
              handoutsList.map(function(item, idx) {
                return React.createElement(
                  "div",
                  {
                    key: item.id || idx,
                    className: "p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs"
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300" },
                    React.createElement("span", { className: "flex items-center gap-1" },
                      React.createElement("span", null, "📄"),
                      React.createElement("span", null, "الهاند آوت رقم " + (idx + 1))
                    ),
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-2" },
                      item.url && React.createElement(
                        "a",
                        {
                          href: item.url,
                          target: "_blank",
                          rel: "noopener noreferrer",
                          className: "text-[11px] text-emerald-600 hover:underline font-bold"
                        },
                        "👁️ معاينة"
                      ),
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: function() { removeHandout(idx); },
                          className: "text-[11px] text-rose-500 hover:text-rose-700 font-bold"
                        },
                        "✕ حذف"
                      )
                    )
                  ),
                  React.createElement("input", {
                    type: "text",
                    value: item.name || "",
                    onChange: function(e) { updateHandout(idx, "name", e.target.value); },
                    placeholder: "تسمية الملف (مثال: ملخص بوربوينت د. مجدي اسحق.pdf)",
                    className: "w-full px-3 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                  }),
                  React.createElement("input", {
                    type: "url",
                    value: item.url || "",
                    onChange: function(e) { updateHandout(idx, "url", e.target.value); },
                    placeholder: "https://drive.google.com/file/d/... أو رابط ملف مباشر",
                    className: "w-full px-3 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  })
                );
              })
            ),

            // أزرار الرفع والإضافة
            React.createElement(
              "div",
              { className: "pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2" },
              React.createElement(
                "label",
                { className: "cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs" },
                React.createElement("span", null, "⬆️"),
                React.createElement("span", null, isUploadingHandout ? "جاري الرفع..." : "ارفع ملف أو عدة ملفات (PDF / PPT) من جهازك"),
                React.createElement("input", {
                  type: "file",
                  multiple: true,
                  accept: ".pdf,.ppt,.pptx,.doc,.docx,application/pdf",
                  disabled: isUploadingHandout,
                  onChange: function(e) {
                    var fls = e.target.files;
                    if (fls && fls.length > 0 && handleUploadHandout) {
                      handleUploadHandout(fls);
                    }
                    e.target.value = "";
                  },
                  className: "hidden"
                })
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: addBlankHandout,
                  className: "px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1"
                },
                React.createElement("span", null, "➕"),
                React.createElement("span", null, "إضافة رابط آخر")
              )
            )
          );
        })(),

        // قسم 4: الملخص الصوتي
        (editModalTab === "all" || editModalTab === "audio") && React.createElement(
          "div",
          { className: "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5" },
          React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" },
            React.createElement("span", null, "🎙️"),
            React.createElement("span", null, "رابط ملف الملخص الصوتي (NotebookLM / MP3)")
          ),
          React.createElement("input", {
            type: "url",
            value: editingLecture.audioSummaryUrl || "",
            onChange: function(e) {
              var val = e.target.value;
              setEditingLecture(function(prev) { return Object.assign({}, prev, { audioSummaryUrl: val }); });
            },
            placeholder: "https://drive.google.com/file/d/... أو رابط ملف mp3 مباشر",
            className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
          }),
          React.createElement("p", { className: "text-[11px] text-slate-400" }, "ارفع ملف الصوت المستخرج من NotebookLM على درايف وضع رابطه هنا ليعمل في المشغل المباشر.")
        ),

        // قسم 5: الملخص المكتوب
        (editModalTab === "all" || editModalTab === "summary") && React.createElement(
          "div",
          { className: "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5" },
          React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" },
            React.createElement("span", null, "📄"),
            React.createElement("span", null, "تقرير الملخص المكتوب (لصق من NotebookLM)")
          ),
          React.createElement("textarea", {
            rows: editModalTab === "summary" ? 10 : 5,
            value: editingLecture.writtenSummary || "",
            onChange: function(e) {
              var val = e.target.value;
              setEditingLecture(function(prev) { return Object.assign({}, prev, { writtenSummary: val }); });
            },
            placeholder: "الصق هنا التقرير الشامل أو الملخص المكتوب الذي استخرجته من NotebookLM...",
            className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs leading-relaxed"
          })
        ),

        // قسم 6: أسئلة الكويز
        (editModalTab === "all" || editModalTab === "quiz") && React.createElement(
          "div",
          { className: "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5" },
          React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5" },
            React.createElement("span", null, "📝"),
            React.createElement("span", null, "أسئلة الكويز والاختبار (بصيغة JSON أو نص عربي مباشر)")
          ),
          React.createElement("textarea", {
            rows: editModalTab === "quiz" ? 8 : 4,
            value: editingQuizText,
            onChange: function(e) { setEditingQuizText(e.target.value); },
            placeholder: 'مثال مباشر:\nسؤال: ما هو الأمان النفسي؟\nأ) التقبل والاحتواء\nب) اللوم والنقد\nالإجابة: أ\nالشرح: التقبل أساس المشورة.\n\nأو بصيغة JSON:\n[{"question":"...","options":["أ","ب"],"correct":0,"explanation":"..."}]',
            className: "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
          }),
          React.createElement("p", { className: "text-[11px] text-slate-400" }, "💡 النظام يتعرف تلقائياً على الأسئلة سواء كانت نصاً عادياً أو صيغة JSON.")
        ),

        React.createElement(
          "div",
          { className: "flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" },
          React.createElement("button", { type: "button", onClick: function() { if (onClose) onClose(); }, className: "px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800" }, "إلغاء"),
          React.createElement("button", {
            type: "submit",
            className: "px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white shadow-md active:scale-95 transition-all"
          }, "حفظ التعديلات ✓")
        )
      )
    )
  );
};
