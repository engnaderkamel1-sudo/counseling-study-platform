// عارض المخططات والرسوم البيانية البصرية التفاعلية للمحاضرات (Visual Diagrams Viewer)
// يدعم: المخططات الهرمية (Pyramid)، المخططات الدائرية (Pie Chart)، مصفوفات المقارنة (Comparison)، وبطاقات النسب والمؤشرات (Metrics)

(function() {
  "use strict";

  window.VisualDiagramsViewer = function(props) {
    var visuals = props.visuals || null;
    var isAdmin = props.isAdmin || false;
    var onGenerateVisuals = props.onGenerateVisuals;
    var isGenerating = props.isGenerating || false;

    var [selectedChartIndex, setSelectedChartIndex] = React.useState(0);
    var [activePyramidLevel, setActivePyramidLevel] = React.useState(null);

    var charts = (visuals && Array.isArray(visuals.charts)) ? visuals.charts : [];

    if (!charts.length) {
      return React.createElement(
        "div",
        { className: "p-8 md:p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-4" },
        React.createElement("div", { className: "text-4xl animate-bounce" }, "📊"),
        React.createElement("h4", { className: "text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200" }, "لا توجد مخططات بصرية مسجلة لهذه المحاضرة بعد"),
        React.createElement("p", { className: "text-xs text-slate-500 max-w-md mx-auto leading-relaxed" },
          "يمكن توليد مخططات بيانية تفاعلية (رسوم دائرية، أهرامات مفاهيمية، ومصفوفات مقارنة) تلقائياً بالذكاء الاصطناعي من واقع تفريغ المحاضرة."
        ),
        isAdmin && React.createElement(
          "button",
          {
            type: "button",
            disabled: isGenerating,
            onClick: onGenerateVisuals,
            className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
          },
          React.createElement("span", null, isGenerating ? "⏳" : "✨"),
          React.createElement("span", null, isGenerating ? "جاري بناء المخططات البصرية..." : "توليد المخططات البصرية الذكية الآن")
        )
      );
    }

    var activeChart = charts[Math.min(selectedChartIndex, charts.length - 1)];

    return React.createElement(
      "div",
      { className: "space-y-5 animate-in fade-in duration-200" },

      // شريط التنقل العلوي بين المخططات
      React.createElement(
        "div",
        { className: "flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-3" },
        React.createElement(
          "div",
          { className: "flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1 max-w-full" },
          charts.map(function(c, idx) {
            var isCurrent = selectedChartIndex === idx;
            var icon = c.type === "pyramid" ? "🔺" : (c.type === "pie" ? "🥧" : (c.type === "comparison" ? "⚖️" : "📈"));
            return React.createElement(
              "button",
              {
                key: c.id || idx,
                type: "button",
                onClick: function() { setSelectedChartIndex(idx); setActivePyramidLevel(null); },
                className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap " +
                  (isCurrent
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")
              },
              React.createElement("span", null, icon),
              React.createElement("span", null, c.title ? (c.title.length > 25 ? c.title.substring(0, 25) + "..." : c.title) : ("مخطط " + (idx + 1)))
            );
          })
        ),
        isAdmin && onGenerateVisuals && React.createElement(
          "button",
          {
            type: "button",
            disabled: isGenerating,
            onClick: onGenerateVisuals,
            className: "text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 disabled:opacity-50"
          },
          React.createElement("span", null, "🔄"),
          React.createElement("span", null, "إعادة توليد المخططات")
        )
      ),

      // بطاقة عرض المخطط النشط
      React.createElement(
        "div",
        { className: "p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6" },

        // رأس المخطط
        React.createElement(
          "div",
          { className: "flex items-start justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-slate-800/80 pb-4" },
          React.createElement(
            "div",
            { className: "space-y-1" },
            React.createElement(
              "div",
              { className: "flex items-center gap-2" },
              React.createElement("span", { className: "text-lg" },
                activeChart.type === "pyramid" ? "🔺" : (activeChart.type === "pie" ? "🥧" : (activeChart.type === "comparison" ? "⚖️" : "📈"))
              ),
              React.createElement("h3", { className: "text-base sm:text-lg font-black text-slate-900 dark:text-white" }, activeChart.title)
            ),
            activeChart.subtitle && React.createElement("p", { className: "text-xs text-slate-500 max-w-xl leading-relaxed" }, activeChart.subtitle)
          ),
          activeChart.badge && React.createElement(
            "span",
            { className: "px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold shrink-0" },
            activeChart.badge
          )
        ),

        // 1. عرض المخطط الهرمي (Pyramid Chart)
        activeChart.type === "pyramid" && (function() {
          var levels = activeChart.levels || [];
          var sorted = levels.slice().sort(function(a, b) { return b.level - a.level; });

          return React.createElement(
            "div",
            { className: "space-y-6" },
            // الهرم التفاعلي المتدرج
            React.createElement(
              "div",
              { className: "flex flex-col items-center gap-2 max-w-xl mx-auto py-2" },
              sorted.map(function(lvl, i) {
                var widthPct = 40 + (i * 12); // starts narrow at top, widens downward
                var isSelected = activePyramidLevel === lvl.level;
                var isPeak = lvl.isPeak || lvl.level === 6;

                return React.createElement(
                  "div",
                  {
                    key: lvl.level,
                    onClick: function() { setActivePyramidLevel(isSelected ? null : lvl.level); },
                    style: { width: Math.min(100, widthPct) + "%" },
                    className: "cursor-pointer transition-all duration-200 transform hover:scale-102 rounded-2xl p-3 text-center text-white shadow-md relative overflow-hidden " +
                      (isPeak ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 ring-2 ring-amber-300 dark:ring-amber-500" :
                        (lvl.color ? ("bg-gradient-to-r " + lvl.color) : "bg-gradient-to-r from-indigo-600 to-indigo-500")) +
                      (isSelected ? " ring-4 ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900 shadow-xl" : "")
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-between px-2 text-xs sm:text-sm font-bold" },
                    React.createElement("span", { className: "w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] shrink-0" }, lvl.level),
                    React.createElement("span", { className: "truncate px-1" }, lvl.title),
                    React.createElement("span", { className: "text-[11px] opacity-80" }, isSelected ? "▲" : "▼")
                  )
                );
              })
            ),

            // صندوق شرح الطبقة المحددة في الهرم
            activePyramidLevel !== null && (function() {
              var found = levels.find(function(l) { return l.level === activePyramidLevel; });
              if (!found) return null;
              return React.createElement(
                "div",
                { className: "p-4 sm:p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm space-y-1.5 animate-in fade-in zoom-in-98 duration-150" },
                React.createElement("div", { className: "font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5" },
                  React.createElement("span", null, "💡 المستوى " + found.level + ":"),
                  React.createElement("span", null, found.title)
                ),
                React.createElement("p", { className: "text-slate-700 dark:text-slate-300 leading-relaxed" }, found.desc)
              );
            })()
          );
        })(),

        // 2. عرض المخطط الدائري (Pie Chart SVG)
        activeChart.type === "pie" && (function() {
          var slices = activeChart.slices || [];
          var total = slices.reduce(function(acc, s) { return acc + (Number(s.percentage) || 0); }, 0) || 100;
          var cumulative = 0;

          // Build SVG pie paths
          var paths = slices.map(function(s, idx) {
            var pct = Number(s.percentage) || 0;
            var startAngle = (cumulative / total) * 360;
            cumulative += pct;
            var endAngle = (cumulative / total) * 360;

            var r = 80;
            var cx = 100;
            var cy = 100;

            var x1 = cx + r * Math.cos(Math.PI * (startAngle - 90) / 180);
            var y1 = cy + r * Math.sin(Math.PI * (startAngle - 90) / 180);
            var x2 = cx + r * Math.cos(Math.PI * (endAngle - 90) / 180);
            var y2 = cy + r * Math.sin(Math.PI * (endAngle - 90) / 180);

            var largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
            var d = "M " + cx + " " + cy + " L " + x1 + " " + y1 + " A " + r + " " + r + " 0 " + largeArc + " 1 " + x2 + " " + y2 + " Z";

            return React.createElement("path", {
              key: idx,
              d: d,
              fill: s.color || "#6366f1",
              className: "transition-all duration-300 hover:opacity-85 cursor-pointer stroke-white dark:stroke-slate-900 stroke-2"
            });
          });

          return React.createElement(
            "div",
            { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-center" },
            // الرسم الدائري
            React.createElement(
              "div",
              { className: "flex justify-center py-2" },
              React.createElement(
                "svg",
                { viewBox: "0 0 200 200", className: "w-52 h-52 sm:w-60 sm:h-60 filter drop-shadow-md" },
                paths,
                // دائرة مفرغة بالوسط (Donut hole)
                React.createElement("circle", { cx: 100, cy: 100, r: 45, className: "fill-white dark:fill-slate-900" }),
                React.createElement("text", {
                  x: 100,
                  y: 105,
                  textAnchor: "middle",
                  className: "fill-slate-900 dark:fill-white text-xs font-black"
                }, "100%")
              )
            ),
            // مفاتيح وتفاصيل النسب
            React.createElement(
              "div",
              { className: "space-y-3" },
              slices.map(function(s, idx) {
                return React.createElement(
                  "div",
                  {
                    key: idx,
                    className: "p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 space-y-1.5"
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-between" },
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-2" },
                      React.createElement("span", {
                        className: "w-3 h-3 rounded-full shrink-0",
                        style: { backgroundColor: s.color || "#6366f1" }
                      }),
                      React.createElement("span", { className: "text-xs font-bold text-slate-800 dark:text-slate-200" }, s.label)
                    ),
                    React.createElement(
                      "span",
                      {
                        className: "px-2 py-0.5 rounded-lg text-xs font-black text-white shrink-0",
                        style: { backgroundColor: s.color || "#6366f1" }
                      },
                      s.percentage + "%"
                    )
                  ),
                  s.desc && React.createElement("p", { className: "text-[11px] text-slate-500 leading-relaxed pr-5" }, s.desc)
                );
              })
            )
          );
        })(),

        // 3. عرض مصفوفة المقارنة البصرية (Comparison Cards)
        activeChart.type === "comparison" && (function() {
          var left = activeChart.left || {};
          var right = activeChart.right || {};

          return React.createElement(
            "div",
            { className: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" },
            // العمود الأول
            React.createElement(
              "div",
              { className: "p-5 rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-4" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2.5 pb-2 border-b border-amber-200/60 dark:border-amber-800/40" },
                React.createElement("span", { className: "text-2xl" }, left.icon || "✝️"),
                React.createElement("h4", { className: "text-sm sm:text-base font-black text-amber-950 dark:text-amber-200" }, left.title)
              ),
              React.createElement(
                "div",
                { className: "space-y-2.5 text-xs" },
                (left.items || []).map(function(item, idx) {
                  return React.createElement(
                    "div",
                    { key: idx, className: "p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-100 dark:border-amber-900/30" },
                    React.createElement("span", { className: "font-bold text-amber-800 dark:text-amber-400 block mb-0.5" }, item.aspect + ":"),
                    React.createElement("span", { className: "text-slate-700 dark:text-slate-300" }, item.value)
                  );
                })
              )
            ),
            // العمود الثاني
            React.createElement(
              "div",
              { className: "p-5 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/50 space-y-4" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2.5 pb-2 border-b border-indigo-200/60 dark:border-indigo-800/40" },
                React.createElement("span", { className: "text-2xl" }, right.icon || "🧠"),
                React.createElement("h4", { className: "text-sm sm:text-base font-black text-indigo-950 dark:text-indigo-200" }, right.title)
              ),
              React.createElement(
                "div",
                { className: "space-y-2.5 text-xs" },
                (right.items || []).map(function(item, idx) {
                  return React.createElement(
                    "div",
                    { key: idx, className: "p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/30" },
                    React.createElement("span", { className: "font-bold text-indigo-800 dark:text-indigo-400 block mb-0.5" }, item.aspect + ":"),
                    React.createElement("span", { className: "text-slate-700 dark:text-slate-300" }, item.value)
                  );
                })
              )
            )
          );
        })(),

        // 4. عرض بطاقات المؤشرات والنسب (Metric Card)
        activeChart.type === "metric_card" && (function() {
          var metrics = activeChart.metrics || [];

          return React.createElement(
            "div",
            { className: "space-y-5" },
            React.createElement(
              "div",
              { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" },
              metrics.map(function(m, idx) {
                return React.createElement(
                  "div",
                  {
                    key: idx,
                    className: "p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center space-y-2" },
                  React.createElement("div", { className: "text-4xl sm:text-5xl font-black " + (m.color || "text-indigo-600") }, m.num),
                  React.createElement("div", { className: "text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200" }, m.label),
                  m.note && React.createElement("p", { className: "text-[11px] text-slate-500" }, m.note)
                );
              })
            ),
            activeChart.takeaway && React.createElement(
              "div",
              { className: "p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed flex items-center gap-2" },
              React.createElement("span", { className: "text-lg shrink-0" }, "💡"),
              React.createElement("span", null, activeChart.takeaway)
            )
          );
        })()
      )
    );
  };
})();
