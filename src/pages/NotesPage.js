// شاشة الملاحظات والملخصات الدراسية النظيفة دون بيانات تجريبية
window.NotesPage = function(props) {
  var utils = window.APP_UTILS;
  var cfg = window.APP_CONFIG;
  var cloud = window.CloudSyncService;

  var currentUser = props.currentUser;
  var userKey = "counsel_study_personal_notes_" + (currentUser ? (currentUser.id || currentUser.email || "user") : "guest");

  var [notes, setNotes] = React.useState(function() {
    return utils.getLocal(userKey, []);
  });

  var [newTitle, setNewTitle] = React.useState("");
  var [newContent, setNewContent] = React.useState("");
  var [newRef, setNewRef] = React.useState("");
  var [showModal, setShowModal] = React.useState(false);

  React.useEffect(function() {
    var unsubscribe = cloud.subscribeNotes(currentUser, function(cloudList) {
      if (cloudList) {
        setNotes(cloudList);
        utils.setLocal(userKey, cloudList);
      }
    });
    return function() {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [currentUser]);

  var handleAddNote = function(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    var n = {
      id: "note-" + Date.now(),
      title: newTitle.trim(),
      date: new Date().toISOString().split("T")[0],
      lectureRef: newRef.trim() || "عام",
      content: newContent.trim(),
      userId: currentUser ? (currentUser.id || currentUser.email) : null
    };

    var updated = [n].concat(notes);
    setNotes(updated);
    setShowModal(false);
    utils.setLocal(userKey, updated);
    cloud.saveNote(n, currentUser);

    setNewTitle("");
    setNewContent("");
    setNewRef("");
  };

  var handleShareWhatsApp = function(note) {
    var text = "📝 *" + note.title + "*\n" +
      "📌 المرجع: " + (note.lectureRef || "دراسة المشورة") + "\n" +
      "📅 التاريخ: " + (note.date || "") + "\n\n" +
      note.content + "\n\n" +
      "— من منصة رفيق المشورة للدارسين 🌿";
    var url = "https://api.whatsapp.com/send?text=" + encodeURIComponent(text);
    window.open(url, "_blank");
  };

  var handleCopyNote = function(note) {
    var text = "📝 " + note.title + "\n" +
      "📌 المرجع: " + (note.lectureRef || "دراسة المشورة") + "\n" +
      "📅 التاريخ: " + (note.date || "") + "\n\n" +
      note.content;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert("تم نسخ الملاحظة بتنسيق أنيق ومجهز للمشاركة ✓");
    }
  };

  var handleDeleteNote = function(noteId) {
    var noteToDelete = notes.find(function(n) { return n.id === noteId; });
    var noteTitle = (noteToDelete && (noteToDelete.title || noteToDelete.lectureTitle)) || "هذه الملاحظة";
    if (!confirm("هل ترغب في نقل «" + noteTitle + "» إلى سلة المحذوفات؟\n\n(يمكنك استرجاعها خلال 7 أيام من سلة المحذوفات)")) return;
    var updated = notes.filter(function(n) { return n.id !== noteId; });
    setNotes(updated);
    utils.setLocal(userKey, updated);
    if (noteToDelete && cloud && cloud.moveToRecycleBin) {
      cloud.moveToRecycleBin(noteToDelete, "note", currentUser);
    } else {
      cloud.deleteDocument("personal_notes", noteId);
    }
  };

  return React.createElement(
    "div",
    { className: "space-y-6 pb-12" },

    React.createElement(
      "div",
      { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm" },
      React.createElement(
        "div",
        null,
        React.createElement("h2", { className: "text-xl font-bold text-slate-900 dark:text-white" }, "ملاحظاتي وملخصاتي الدراسية"),
        React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1" }, "تدوين الخواطر والأفكار العميقة من المحاضرات للمذاكرة ومشاركتها مع الزملاء")
      ),
      React.createElement(
        "button",
        {
          onClick: function() { setShowModal(true); },
          className: "bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-md flex items-center gap-2"
        },
        React.createElement("span", null, "➕"),
        React.createElement("span", null, "تدوين ملاحظة جديدة")
      )
    ),

    notes.length > 0 ? React.createElement(
      "div",
      { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
      notes.map(function(item) {
        return React.createElement(
          "div",
          {
            key: item.id,
            className: "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700"
          },
          React.createElement(
            "div",
            { className: "space-y-2" },
            React.createElement(
              "div",
              { className: "flex items-center justify-between text-xs text-slate-400" },
              React.createElement("span", { className: "font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50" }, item.lectureRef || "عام"),
              React.createElement("span", { className: "font-mono text-[11px]" }, item.date)
            ),
            React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white leading-snug" }, item.title),
            React.createElement("p", { className: "text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap" }, item.content)
          ),
          // شريط أزرار المشاركة والنسخ والحذف
          React.createElement(
            "div",
            { className: "pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" },
            React.createElement(
              "div",
              { className: "flex items-center gap-1.5" },
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { handleShareWhatsApp(item); },
                  title: "مشاركة الملاحظة عبر واتساب",
                  className: "px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                },
                React.createElement("span", null, "💬"),
                React.createElement("span", null, "واتساب")
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { handleCopyNote(item); },
                  title: "نسخ الملاحظة منسقة",
                  className: "px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                },
                React.createElement("span", null, "📋"),
                React.createElement("span", null, "نسخ")
              )
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { handleDeleteNote(item.id); },
                title: "حذف الملاحظة",
                className: "p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition-colors"
              },
              "🗑️"
            )
          )
        );
      })
    ) : React.createElement(
      "div",
      { className: "p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
      React.createElement("div", { className: "w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-3xl mx-auto" }, "📝"),
      React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "لا توجد ملاحظات مسجلة بعد"),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto leading-relaxed" }, "يمكنك البدء بتدوين أي فكرة أو ملخص شخصي أثناء متابعة المحاضرات.")
    ),

    showModal && React.createElement(
      "div",
      { className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "تدوين خاطرة أو تلخيص دراسي"),
          React.createElement("button", { onClick: function() { setShowModal(false); }, className: "text-slate-400" }, "✕")
        ),
        React.createElement(
          "form",
          { onSubmit: handleAddNote, className: "space-y-3" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" }, "عنوان الملاحظة"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: newTitle,
              onChange: function(e) { setNewTitle(e.target.value); },
              placeholder: "عنوان الملاحظة...",
              className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs md:text-sm text-slate-900 dark:text-white"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" }, "مرجع المحاضرة"),
            React.createElement("input", {
              type: "text",
              value: newRef,
              onChange: function(e) { setNewRef(e.target.value); },
              placeholder: "المحاضرة الأولى / الفصل الأول...",
              className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs md:text-sm text-slate-900 dark:text-white"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1" }, "نص الملاحظة"),
            React.createElement("textarea", {
              rows: 4,
              required: true,
              value: newContent,
              onChange: function(e) { setNewContent(e.target.value); },
              placeholder: "اكتب ما استوعبته بأسلوبك الشخصي...",
              className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs md:text-sm text-slate-900 dark:text-white"
            })
          ),
          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-2" },
            React.createElement("button", { type: "button", onClick: function() { setShowModal(false); }, className: "px-4 py-2 rounded-xl text-xs font-bold text-slate-500" }, "إلغاء"),
            React.createElement("button", { type: "submit", className: "px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white" }, "حفظ الملاحظة")
          )
        )
      )
    )
  );
};
