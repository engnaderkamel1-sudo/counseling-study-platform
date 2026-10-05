// شاشة المساعد الدراسي الذكي وجدول المهام والمذاكرة
window.StudyTasksPage = function() {
  var utils = window.APP_UTILS;
  var cfg = window.APP_CONFIG;

  var [tasks, setTasks] = React.useState(function() {
    return utils.getLocal(cfg.storageKeys.tasks, [
      { id: "t-1", text: "سماع المحاضرة الأولى وتلخيص نقاطها", done: true, dueDate: "2026-10-06" },
      { id: "t-2", text: "قراءة أول 40 صفحة من كتاب المشورة المسيحية", done: false, dueDate: "2026-10-08" },
      { id: "t-3", text: "حل التكليف الأسبوعي الخاص بدراسة الحالة", done: false, dueDate: "2026-10-12" }
    ]);
  });

  var [newTaskText, setNewTaskText] = React.useState("");
  var [newTaskDate, setNewTaskDate] = React.useState("");

  // نافذة المحادثة مع المساعد الذكي
  var [chatMessages, setChatMessages] = React.useState([
    { role: "assistant", text: "سلام ومحبة. أنا رفيقك ومساعدك الدراسي لمنهج ومحاضرات المشورة. يمكنك سؤالي عن أي مصطلح أو فكرة وردت في المحاضرات أو المراجع وسأجيبك بدقة منها." }
  ]);
  var [chatInput, setChatInput] = React.useState("");

  React.useEffect(function() {
    utils.setLocal(cfg.storageKeys.tasks, tasks);
  }, [tasks]);

  var toggleTask = function(id) {
    setTasks(tasks.map(function(t) {
      if (t.id === id) return Object.assign({}, t, { done: !t.done });
      return t;
    }));
  };

  var handleAddTask = function(e) {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    var newTask = {
      id: "t-" + Date.now(),
      text: newTaskText.trim(),
      done: false,
      dueDate: newTaskDate || "غير محدد"
    };
    setTasks(tasks.concat([newTask]));
    setNewTaskText("");
    setNewTaskDate("");
  };

  var handleSendMessage = function(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    var userMsg = { role: "user", text: chatInput.trim() };
    var currentMessages = chatMessages.concat([userMsg]);
    setChatMessages(currentMessages);
    setChatInput("");

    setTimeout(function() {
      var botReply = {
        role: "assistant",
        text: "بناءً على محاضرات المشورة: مفهوم 'الحدود الشخصية' هو القدرة على حماية مساحتك النفسية دون عداء، وهي مسؤولية روحية ونفسية أساسية لحماية المشير من الاحتراق الداخلي."
      };
      setChatMessages(currentMessages.concat([botReply]));
    }, 800);
  };

  var completedCount = tasks.filter(function(t) { return t.done; }).length;

  return React.createElement(
    "div",
    { className: "space-y-6 pb-20 md:pb-8" },

    // ترويسة
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm" },
      React.createElement("h2", { className: "text-xl font-bold text-slate-900 dark:text-white" }, "📅 المساعد الذكي وجدول المتابعة"),
      React.createElement("p", { className: "text-sm text-slate-500 dark:text-slate-400 mt-1" }, "رفيق دراسي للإجابة من المنهج فقط وجدول لتتبع التكاليف ومواعيد الامتحانات")
    ),

    React.createElement(
      "div",
      { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },

      // قسم المهام والجدول الدراسي
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "جدول المهام والتكاليف"),
          React.createElement("span", { className: "text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg" }, completedCount + " من " + tasks.length + " منجز")
        ),

        // نموذج إضافة مهمة
        React.createElement(
          "form",
          { onSubmit: handleAddTask, className: "flex gap-2" },
          React.createElement("input", {
            type: "text",
            value: newTaskText,
            onChange: function(e) { setNewTaskText(e.target.value); },
            placeholder: "أضف مهمة جديدة أو موعد تسليم...",
            className: "flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          }),
          React.createElement("button", {
            type: "submit",
            className: "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20"
          }, "إضافة")
        ),

        // قائمة المهام
        React.createElement(
          "div",
          { className: "space-y-2 pt-2" },
          tasks.map(function(t) {
            return React.createElement(
              "div",
              {
                key: t.id,
                onClick: function() { toggleTask(t.id); },
                className: "p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 " +
                  (t.done
                    ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50")
              },
              React.createElement(
                "div",
                { className: "flex items-center gap-3" },
                React.createElement(
                  "div",
                  { className: "w-5 h-5 rounded-lg border flex items-center justify-center font-bold text-xs " + (t.done ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 dark:border-slate-600") },
                  t.done ? "✓" : ""
                ),
                React.createElement("span", { className: "text-sm font-semibold " + (t.done ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200") }, t.text)
              ),
              React.createElement("span", { className: "text-xs text-slate-400" }, t.dueDate)
            );
          })
        )
      ),

      // قسم المساعد الدراسي الذكي (Chat Assistant)
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col h-[480px]" },
        React.createElement(
          "div",
          { className: "border-b border-slate-100 dark:border-slate-800 pb-3 mb-3 flex items-center justify-between" },
          React.createElement(
            "div",
            null,
            React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "المساعد الدراسي المتخصص"),
            React.createElement("p", { className: "text-xs text-slate-400" }, "إجابات من محاضرات ومراجع المشورة فقط")
          ),
          React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" })
        ),

        // رسائل المحادثة
        React.createElement(
          "div",
          { className: "flex-1 overflow-y-auto space-y-3 p-1" },
          chatMessages.map(function(msg, idx) {
            var isUser = msg.role === "user";
            return React.createElement(
              "div",
              {
                key: idx,
                className: "flex " + (isUser ? "justify-end" : "justify-start")
              },
              React.createElement(
                "div",
                {
                  className: "max-w-[85%] p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed " +
                    (isUser
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700/60")
                },
                msg.text
              )
            );
          })
        ),

        // حقل إرسال السؤال
        React.createElement(
          "form",
          { onSubmit: handleSendMessage, className: "mt-3 flex gap-2" },
          React.createElement("input", {
            type: "text",
            value: chatInput,
            onChange: function(e) { setChatInput(e.target.value); },
            placeholder: "اسأل عن أي نقطة في المشورة...",
            className: "flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          }),
          React.createElement("button", {
            type: "submit",
            className: "bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md"
          }, "إرسال")
        )
      )
    )
  );
};
