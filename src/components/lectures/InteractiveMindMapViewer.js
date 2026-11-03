// مكون عارض الخريطة الذهنية الشجرية التفاعلي (Responsive Hierarchical Mind Map Viewer)
// متجاوب بالكامل مع شاشات الموبايل والمتصفحات الكبيرة مع إمكانية طي وتوسيع الفروع والبحث السريع
window.InteractiveMindMapViewer = function(props) {
  var mindMapData = props.mindMap || {};
  var root = mindMapData.root || mindMapData;
  var isDraft = props.isDraft;
  var isAdmin = props.isAdmin;
  var onPublishToggle = props.onPublishToggle;
  var onRequestEdit = props.onRequestEdit;

  var [collapsedMap, setCollapsedMap] = React.useState({});
  var [searchQuery, setSearchQuery] = React.useState("");

  if (!root || !root.title) {
    return React.createElement(
      "div",
      { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
      React.createElement("div", { className: "text-4xl" }, "🧠"),
      React.createElement("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200" }, "لا توجد خريطة ذهنية لهذه المحاضرة بعد"),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto leading-relaxed" },
        "يمكن لمسؤول المنصة توليد الخريطة الذهنية التفاعلية بضغطة زر واحدة."
      )
    );
  }

  // دالة تبديل فتح/غلق العقدة
  var toggleNode = function(nodeId) {
    setCollapsedMap(function(prev) {
      var next = Object.assign({}, prev);
      next[nodeId] = !next[nodeId];
      return next;
    });
  };

  // توسيع الكل أو طي الكل
  var handleExpandAll = function() { setCollapsedMap({}); };
  var handleCollapseAll = function() {
    var all = {};
    var recurse = function(n) {
      if (n.id) all[n.id] = true;
      if (Array.isArray(n.children)) n.children.forEach(recurse);
    };
    if (Array.isArray(root.children)) root.children.forEach(recurse);
    setCollapsedMap(all);
  };

  // دالة تصيير عقدة الشجرة بشكل تكراري متجاوب
  var renderTreeNode = function(node, depth, parentPath) {
    if (!node) return null;
    var nodeId = node.id || (parentPath + "-" + (node.title || ""));
    var hasChildren = Array.isArray(node.children) && node.children.length > 0;
    var isCollapsed = !!collapsedMap[nodeId];

    // مطابقة البحث
    var isMatch = searchQuery.trim() && (node.title || "").toLowerCase().includes(searchQuery.trim().toLowerCase());

    var paddingRightClass = depth === 0 ? "" : (depth === 1 ? "pr-4 sm:pr-6" : (depth === 2 ? "pr-8 sm:pr-12" : "pr-12 sm:pr-16"));

    return React.createElement(
      "div",
      { key: nodeId, className: "relative " + paddingRightClass },

      // خط التوصيل الرأسي الأيمن في اللغة العربية
      depth > 0 && React.createElement("div", {
        className: "absolute right-2 sm:right-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700/60"
      }),

      // بطاقة العقدة
      React.createElement(
        "div",
        {
          className: "my-2 flex items-start gap-2.5 p-3 sm:p-4 rounded-2xl transition-all border " +
            (depth === 0
              ? "bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white border-indigo-700/60 shadow-md"
              : (depth === 1
                ? "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 shadow-2xs hover:border-indigo-300"
                : "bg-slate-50/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-800 text-xs sm:text-sm")) +
            (isMatch ? " ring-2 ring-amber-400 bg-amber-50/80 dark:bg-amber-950/40" : "")
        },

        // زر التوسيع والطي (إن كان لها فروع)
        hasChildren ? React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { toggleNode(nodeId); },
            className: "w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 hover:scale-105 transition-all mt-0.5",
            title: isCollapsed ? "توسيع هذا الفرع" : "طي هذا الفرع"
          },
          isCollapsed ? "➕" : "➖"
        ) : React.createElement(
          "span",
          { className: "w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-2 mr-2" }
        ),

        // الأيقونة والعنوان
        React.createElement(
          "div",
          {
            className: "flex-1 cursor-pointer select-none",
            onClick: hasChildren ? function() { toggleNode(nodeId); } : undefined
          },
          React.createElement(
            "div",
            { className: "flex items-center gap-2 flex-wrap" },
            node.icon && React.createElement("span", { className: "text-base" }, node.icon),
            React.createElement(
              "span",
              { className: depth === 0 ? "text-base sm:text-lg font-black" : (depth === 1 ? "text-sm sm:text-base font-bold" : "font-medium") },
              node.title
            ),
            hasChildren && React.createElement(
              "span",
              { className: "text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300" },
              node.children.length + " فروع"
            )
          )
        )
      ),

      // الفروع التابعة (إذا لم تكن مطوية)
      (hasChildren && !isCollapsed) && React.createElement(
        "div",
        { className: "space-y-1 animate-in fade-in duration-150" },
        node.children.map(function(child, cIdx) {
          return renderTreeNode(child, depth + 1, nodeId + "-" + cIdx);
        })
      )
    );
  };

  return React.createElement(
    "div",
    { className: "space-y-4" },

    // شريط علوي للتحكم والبحث والنشر
    React.createElement(
      "div",
      { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60" },

      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement("span", { className: "text-xs font-bold text-slate-700 dark:text-slate-300" }, "🧠 الخريطة الذهنية الشجرية"),
        isDraft && React.createElement(
          "span",
          { className: "px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold" },
          "🔒 مسودة خاصة"
        )
      ),

      // حقل البحث السريع
      React.createElement(
        "div",
        { className: "flex items-center gap-2 flex-1 max-w-xs" },
        React.createElement("input", {
          type: "text",
          value: searchQuery,
          onChange: function(e) { setSearchQuery(e.target.value); },
          placeholder: "🔍 ابحث في المفاهيم...",
          className: "w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
        })
      ),

      // أزرار التحكم بالتوسيع والمسؤول
      React.createElement(
        "div",
        { className: "flex items-center gap-1.5 flex-wrap" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleExpandAll,
            className: "px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          },
          "توسيع الكل"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleCollapseAll,
            className: "px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          },
          "طي الكل"
        ),

        isAdmin && React.createElement(
          "div",
          { className: "flex items-center gap-1.5" },
          onPublishToggle && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { onPublishToggle("mindMap", !isDraft); },
              className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " +
                (isDraft
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200")
            },
            isDraft ? "🚀 نشر للطلاب" : "🔒 تحويل لمسودة"
          ),
          onRequestEdit && React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { onRequestEdit("mindMap"); },
              className: "px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100"
            },
            "✨ تعديل بالذكاء الاصطناعي"
          )
        )
      )
    ),

    // حاوية عرض شجرة الخريطة الذهنية
    React.createElement(
      "div",
      { className: "p-4 sm:p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 overflow-x-auto" },
      renderTreeNode(root, 0, "root")
    )
  );
};
