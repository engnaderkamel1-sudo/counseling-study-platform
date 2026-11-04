// مكون عرض الخريطة الذهنية التفاعلية الشجرية (Responsive Concept Mind Map Viewer)
// متجاوب بالكامل مع الشاشات الصغيرة والكبيرة مع نافذة تفاصيل منبثقة عند النقر على أي مفهوم
window.InteractiveMindMapViewer = function(props) {
  var mindMapData = props.mindMap || {};
  var root = mindMapData.root || mindMapData;
  var isDraft = props.isDraft;
  var isAdmin = props.isAdmin;
  var onPublishToggle = props.onPublishToggle;
  var onRequestEdit = props.onRequestEdit;

  var [collapsedMap, setCollapsedMap] = React.useState({});
  var [searchQuery, setSearchQuery] = React.useState("");
  var [selectedNodeForDetails, setSelectedNodeForDetails] = React.useState(null);

  if (!root || !root.title) {
    return React.createElement(
      "div",
      { className: "p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3" },
      React.createElement("div", { className: "text-4xl" }, "🧠"),
      React.createElement("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200" }, "لا توجد خريطة ذهنية لهذه المحاضرة بعد"),
      React.createElement("p", { className: "text-xs text-slate-500 max-w-sm mx-auto leading-relaxed" },
        "يمكن لمسؤول المنصة توليد الخريطة الذهنية التفاعلية بالذكاء الاصطناعي بنقرة واحدة."
      )
    );
  }

  // دالة تبديل فتح/طي العقدة
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

  // دالة تصيير عقدة الشجرة بشكل تفاعلي متجاوب
  var renderTreeNode = function(node, depth, parentPath) {
    if (!node) return null;
    var nodeId = node.id || (parentPath + "-" + (node.title || ""));
    var hasChildren = Array.isArray(node.children) && node.children.length > 0;
    var isCollapsed = !!collapsedMap[nodeId];

    // مطابقة البحث
    var isMatch = searchQuery.trim() && (
      (node.title || "").toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (node.summary || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

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
          className: "my-2.5 flex items-start gap-2.5 p-3.5 sm:p-4 rounded-2xl transition-all border shadow-xs " +
            (depth === 0
              ? "bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white border-indigo-700/60 shadow-md"
              : (depth === 1
                ? "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                : "bg-slate-50/90 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm hover:border-indigo-300")) +
            (isMatch ? " ring-2 ring-amber-400 bg-amber-50/80 dark:bg-amber-950/40" : "")
        },

        // زر التوسيع والطي (إن كان لها فروع)
        hasChildren ? React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { toggleNode(nodeId); },
            className: "w-6 h-6 rounded-lg bg-indigo-100/60 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 hover:scale-105 transition-all mt-0.5",
            title: isCollapsed ? "توسيع هذا الفرع" : "طي هذا الفرع"
          },
          isCollapsed ? "◀" : "▼"
        ) : React.createElement(
          "span",
          { className: "w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-2 mr-1" }
        ),

        // الأيقونة والعنوان والنبذة
        React.createElement(
          "div",
          {
            className: "flex-1 cursor-pointer select-none",
            onClick: function() { setSelectedNodeForDetails(node); }
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
            ),
            (node.details || node.summary) && React.createElement(
              "span",
              { className: "text-[10px] px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-semibold border border-indigo-200/50 dark:border-indigo-800/50" },
              "💡 اضغط للتفاصيل"
            )
          ),

          // نبذة موجزة تحت العنوان
          node.summary && React.createElement(
            "p",
            { className: "text-xs mt-1.5 leading-relaxed " + (depth === 0 ? "text-indigo-200" : "text-slate-500 dark:text-slate-400") },
            node.summary
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
        React.createElement("span", { className: "text-xs font-bold text-slate-700 dark:text-slate-300" }, "🧠 الخريطة المفاهيمية التفاعلية"),
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
            "✨ تعديل بالذكاء"
          )
        )
      )
    ),

    // حاوية عرض شجرة الخريطة الذهنية
    React.createElement(
      "div",
      { className: "p-4 sm:p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 overflow-x-auto" },
      renderTreeNode(root, 0, "root")
    ),

    // نافذة منبثقة تفصيلية عند النقر على أي عقدة (Node Concept Detail Modal)
    selectedNodeForDetails && React.createElement(
      "div",
      {
        className: "fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200",
        onClick: function() { setSelectedNodeForDetails(null); }
      },
      React.createElement(
        "div",
        {
          className: "bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200",
          onClick: function(e) { e.stopPropagation(); }
        },
        React.createElement(
          "div",
          { className: "flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2.5" },
            React.createElement("span", { className: "text-2xl" }, selectedNodeForDetails.icon || "💡"),
            React.createElement("h4", { className: "text-base font-black text-slate-800 dark:text-slate-100" }, selectedNodeForDetails.title)
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setSelectedNodeForDetails(null); },
              className: "w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center text-sm font-bold"
            },
            "✕"
          )
        ),

        // النبذة
        selectedNodeForDetails.summary && React.createElement(
          "div",
          { className: "p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60" },
          React.createElement("h5", { className: "text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mb-1" }, "📌 الخلاصة السريعة:"),
          React.createElement("p", { className: "text-xs text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed" }, selectedNodeForDetails.summary)
        ),

        // التفاصيل والشرح الأكاديمي والتطبيقي
        React.createElement(
          "div",
          { className: "space-y-2 pt-1" },
          React.createElement("h5", { className: "text-xs font-bold text-slate-700 dark:text-slate-300" }, "📖 الشرح والتطبيق المشوري في المحاضرة:"),
          React.createElement(
            "p",
            { className: "text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line" },
            selectedNodeForDetails.details || selectedNodeForDetails.summary || "لا توجد تفاصيل إضافية مسجلة لهذا المفهوم."
          )
        ),

        React.createElement(
          "div",
          { className: "pt-2 flex justify-end" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setSelectedNodeForDetails(null); },
              className: "px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-700 hover:bg-slate-800 text-xs font-bold"
            },
            "إغلاق"
          )
        )
      )
    )
  );
};
