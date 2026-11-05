// عارض المخططات والرسوم البيانية البصرية التفاعلية للمحاضرات (Visual Diagrams Viewer)
// مبني بأسلوب Google NotebookLM المعمق لدعم الفهم البصري الشامل للمحاضرة
// يدعم: الهرم المفاهيمي (Pyramid)، المسار التسلسلي (Process Flow)، شبكة الأركان (Pillars)، مصفوفة المقارنة (Comparison)، الرسوم الدائرية (Pie)، وبطاقات القواعد والمؤشرات (Metric Cards)

(function() {
  "use strict";

  // دالة تحديد الأيقونة المناسبة لنوع المخطط
  window.getVisualChartIcon = function(type) {
    switch (type) {
      case "pyramid": return "🔺";
      case "process": return "🔄";
      case "pillars": return "🏛️";
      case "comparison": return "⚖️";
      case "pie": return "🥧";
      case "metric_card": return "📊";
      case "dual_system":
      case "anatomy": return "🧠";
      case "cycle": return "🔁";
      default: return "📈";
    }
  };

  // المكون القابل لإعادة الاستخدام لرسم أي مخطط بصري فردي داخل أي سياق (مدمجاً بالملخص أو منفرداً)
  window.SingleVisualChartCard = function(props) {
    var chart = props.chart;
    if (!chart || !chart.type) return null;

    var [activePyramidLevel, setActivePyramidLevel] = React.useState(null);
    var icon = window.getVisualChartIcon(chart.type);

    return React.createElement(
      "div",
      { className: "my-5 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5 animate-in fade-in duration-200" },

      // رأس المخطط البصري
      React.createElement(
        "div",
        { className: "flex items-start justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-slate-800/80 pb-3.5" },
        React.createElement(
          "div",
          { className: "space-y-1" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("span", { className: "text-lg sm:text-xl" }, icon),
            React.createElement("h4", { className: "text-sm sm:text-base font-black text-slate-900 dark:text-white" }, chart.title)
          ),
          chart.subtitle && React.createElement("p", { className: "text-xs text-slate-500 max-w-2xl leading-relaxed" }, chart.subtitle)
        ),
        chart.badge && React.createElement(
          "span",
          { className: "px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold shrink-0" },
          chart.badge
        )
      ),

      // 1. المسار التسلسلي / المراحل والتدفق المنطقي (Process Flow)
      chart.type === "process" && (function() {
        var steps = chart.steps || [];
        return React.createElement(
          "div",
          { className: "space-y-3" },
          React.createElement(
            "div",
            { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-" + Math.min(4, Math.max(1, steps.length)) + " gap-3.5" },
            steps.map(function(st, idx) {
              return React.createElement(
                "div",
                {
                  key: idx,
                  className: "p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 space-y-2.5 relative flex flex-col justify-between hover:shadow-xs transition-all"
                },
                React.createElement(
                  "div",
                  { className: "space-y-1.5" },
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-between" },
                    React.createElement("span", { className: "px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-mono font-black text-[10px]" }, "مرحلة " + (st.step || (idx + 1))),
                    React.createElement("span", { className: "text-xl" }, st.icon || "➡️")
                  ),
                  React.createElement("h5", { className: "text-xs sm:text-sm font-black text-slate-900 dark:text-white" }, st.title),
                  React.createElement("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed" }, st.desc)
                ),
                st.outcome && React.createElement(
                  "div",
                  { className: "pt-2 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5" },
                  React.createElement("span", null, "🎯"),
                  React.createElement("span", null, st.outcome)
                )
              );
            })
          )
        );
      })(),

      // 2. شبكة الأركان والأبعاد التشريحية للمفهوم (Pillars / Anatomy)
      chart.type === "pillars" && (function() {
        var pillars = chart.pillars || [];
        return React.createElement(
          "div",
          { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-" + Math.min(4, Math.max(2, pillars.length)) + " gap-3.5" },
          pillars.map(function(p, idx) {
            return React.createElement(
              "div",
              {
                key: idx,
                className: "p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
              },
              React.createElement(
                "div",
                { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-xl p-1.5 rounded-xl bg-white dark:bg-slate-900 shadow-2xs" }, p.icon || "🏛️"),
                React.createElement("h5", { className: "text-xs sm:text-sm font-black text-slate-900 dark:text-white" }, p.title)
              ),
              p.desc && React.createElement("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed" }, p.desc),
              Array.isArray(p.keyInsights) && p.keyInsights.length > 0 && React.createElement(
                "ul",
                { className: "space-y-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px] text-slate-500 dark:text-slate-400" },
                p.keyInsights.map(function(ins, iIdx) {
                  return React.createElement(
                    "li",
                    { key: iIdx, className: "flex items-start gap-1.5" },
                    React.createElement("span", { className: "text-indigo-500 font-bold shrink-0 mt-0.5" }, "✓"),
                    React.createElement("span", { className: "text-slate-700 dark:text-slate-300 leading-snug" }, ins)
                  );
                })
              )
            );
          })
        );
      })(),

      // 3. مصفوفة المقارنة البصرية المنهجية (Comparison Matrix)
      chart.type === "comparison" && (function() {
        var left = chart.left || {};
        var right = chart.right || {};

        return React.createElement(
          "div",
          { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
          // العمود الأول
          React.createElement(
            "div",
            { className: "p-4 sm:p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-3" },
            React.createElement(
              "div",
              { className: "flex items-center gap-2 pb-2 border-b border-amber-200/60 dark:border-amber-800/40" },
              React.createElement("span", { className: "text-xl" }, left.icon || "✝️"),
              React.createElement("h5", { className: "text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200" }, left.title)
            ),
            React.createElement(
              "div",
              { className: "space-y-2 text-xs" },
              (left.items || []).map(function(item, idx) {
                return React.createElement(
                  "div",
                  { key: idx, className: "p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-100 dark:border-amber-900/30" },
                  React.createElement("span", { className: "font-bold text-amber-800 dark:text-amber-400 block mb-0.5" }, item.aspect + ":"),
                  React.createElement("span", { className: "text-slate-700 dark:text-slate-300 leading-relaxed" }, item.value)
                );
              })
            )
          ),
          // العمود الثاني
          React.createElement(
            "div",
            { className: "p-4 sm:p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/50 space-y-3" },
            React.createElement(
              "div",
              { className: "flex items-center gap-2 pb-2 border-b border-indigo-200/60 dark:border-indigo-800/40" },
              React.createElement("span", { className: "text-xl" }, right.icon || "🧠"),
              React.createElement("h5", { className: "text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200" }, right.title)
            ),
            React.createElement(
              "div",
              { className: "space-y-2 text-xs" },
              (right.items || []).map(function(item, idx) {
                return React.createElement(
                  "div",
                  { key: idx, className: "p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/30" },
                  React.createElement("span", { className: "font-bold text-indigo-800 dark:text-indigo-400 block mb-0.5" }, item.aspect + ":"),
                  React.createElement("span", { className: "text-slate-700 dark:text-slate-300 leading-relaxed" }, item.value)
                );
              })
            )
          )
        );
      })(),

      // 4. المخطط الهرمي المفاهيمي التفاعلي (Conceptual Pyramid)
      chart.type === "pyramid" && (function() {
        var levels = chart.levels || [];
        if (!levels.length) return null;

        // ترتيب مستويات الهرم بدقة هندسية ومفاهيمية سليمة:
        // في هرم ماسلو ونظريات المشورة: المستوى 1 هو دائماً القاعدة التأسيسية العريضة في الأسفل (مثل الحاجات الفسيولوجية).
        // والمستوى الأعلى رقمياً (مثل المستوى 5 أو 6) هو دائماً ذروة وقمة الهرم الضيقة في الأعلى (مثل الاحتياجات الروحية أو تحقيق الذات).
        var sorted = levels.slice().sort(function(a, b) { return b.level - a.level; });

        // التحقق الذكي في حال كان الترقيم معكوساً تماماً بصراحة في نص العناوين (المستوى 1 صراحة هو القمة والمستوى الأخير هو القاعدة)
        var levelOne = levels.find(function(l) { return l.level === 1; });
        var maxLvl = levels.reduce(function(m, l) { return (l.level > m.level) ? l : m; }, levels[0]);
        if (levelOne && /^(القمة|الذروة|الغاية)/.test(levelOne.title) && maxLvl && /^(القاعدة|الأساس)/.test(maxLvl.title)) {
          sorted = levels.slice().sort(function(a, b) { return a.level - b.level; });
        }

        var currentActive = (activePyramidLevel !== null) ? activePyramidLevel : (sorted[0] ? sorted[0].level : null);

        return React.createElement(
          "div",
          { className: "space-y-4" },
          React.createElement(
            "div",
            { className: "flex flex-col items-center gap-2.5 max-w-xl mx-auto py-1" },
            sorted.map(function(lvl, i) {
              // حساب العرض التدريجي: القمة في الأعلى تأخذ 50% كحد أدنى وتتسع نزولاً حتى 100% في القاعدة
              var widthPct = 50 + (i * (50 / Math.max(1, sorted.length - 1)));
              var isSelected = currentActive === lvl.level;
              var isPeak = (i === 0);
              var isBase = (i === sorted.length - 1);

              var bgStyle = isPeak
                ? "linear-gradient(135deg, #d97706, #f59e0b, #d97706)"
                : (lvl.color && lvl.color.startsWith("#") ? lvl.color : (isBase ? "#059669" : "#4f46e5"));

              return React.createElement(
                "div",
                {
                  key: lvl.level,
                  onClick: function() { setActivePyramidLevel(lvl.level); },
                  style: {
                    width: Math.min(100, Math.max(48, widthPct)) + "%",
                    minWidth: "min(100%, 260px)",
                    background: bgStyle
                  },
                  className: "cursor-pointer transition-all duration-200 transform hover:scale-101 rounded-2xl p-2.5 sm:p-3 text-center text-white shadow-md relative overflow-hidden " +
                    (isSelected ? " ring-4 ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900 shadow-lg scale-101" : "")
                },
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between gap-2 px-2 text-xs sm:text-sm font-bold drop-shadow-sm" },
                  React.createElement("span", { className: "w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] shrink-0 font-mono" }, lvl.level),
                  // إزالة truncate والسماح بالالتفاف السلس لكامل الكلمات
                  React.createElement("span", { className: "px-1 flex-1 text-center leading-snug break-words whitespace-normal" }, lvl.title),
                  React.createElement("span", { className: "text-[11px] opacity-80 shrink-0" }, isSelected ? "▲" : "▼")
                )
              );
            })
          ),
          (function() {
            var found = levels.find(function(l) { return l.level === currentActive; }) || sorted[0];
            if (!found) return null;
            return React.createElement(
              "div",
              { className: "p-3.5 sm:p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm space-y-1 animate-in fade-in duration-150" },
              React.createElement(
                "div",
                { className: "font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 flex-wrap" },
                React.createElement("span", null, "💡 المستوى " + found.level + ":"),
                React.createElement("span", null, found.title)
              ),
              React.createElement("p", { className: "text-slate-700 dark:text-slate-300 leading-relaxed break-words" }, found.desc)
            );
          })()
        );
      })(),

      // 5. المخطط الدائري الحقيقي للنسب الصريحة (Pie Chart)
      chart.type === "pie" && (function() {
        var slices = chart.slices || [];
        var total = slices.reduce(function(acc, s) { return acc + (Number(s.percentage) || 0); }, 0) || 100;
        var cumulative = 0;

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
          { className: "grid grid-cols-1 md:grid-cols-2 gap-4 items-center" },
          React.createElement(
            "div",
            { className: "flex justify-center py-1" },
            React.createElement(
              "svg",
              { viewBox: "0 0 200 200", className: "w-44 h-44 sm:w-52 sm:h-52 filter drop-shadow-md" },
              paths,
              React.createElement("circle", { cx: 100, cy: 100, r: 40, className: "fill-white dark:fill-slate-900" }),
              React.createElement("text", {
                x: 100,
                y: 105,
                textAnchor: "middle",
                className: "fill-slate-900 dark:fill-white text-xs font-black"
              }, "100%")
            )
          ),
          React.createElement(
            "div",
            { className: "space-y-2" },
            slices.map(function(s, idx) {
              return React.createElement(
                "div",
                {
                  key: idx,
                  className: "p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 space-y-1"
                },
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between" },
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-2" },
                    React.createElement("span", {
                      className: "w-2.5 h-2.5 rounded-full shrink-0",
                      style: { backgroundColor: s.color || "#6366f1" }
                    }),
                    React.createElement("span", { className: "text-xs font-bold text-slate-800 dark:text-slate-200" }, s.label)
                  ),
                  React.createElement(
                    "span",
                    {
                      className: "px-2 py-0.5 rounded-md text-[11px] font-black text-white shrink-0",
                      style: { backgroundColor: s.color || "#6366f1" }
                    },
                    s.percentage + "%"
                  )
                ),
                s.desc && React.createElement("p", { className: "text-[11px] text-slate-500 leading-relaxed pr-4" }, s.desc)
              );
            })
          )
        );
      })(),

      // 6. بطاقات القواعد والمعادلات المشورية (Metric Cards)
      chart.type === "metric_card" && (function() {
        var metrics = chart.metrics || [];

        return React.createElement(
          "div",
          { className: "space-y-4" },
          React.createElement(
            "div",
            { className: "grid grid-cols-1 sm:grid-cols-" + Math.min(3, Math.max(1, metrics.length)) + " gap-3" },
            metrics.map(function(m, idx) {
              var numColor = (m.color && m.color.startsWith("#")) ? m.color : "#4f46e5";
              return React.createElement(
                "div",
                {
                  key: idx,
                  className: "p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center space-y-1.5"
                },
                React.createElement("div", {
                  className: "text-3xl sm:text-4xl font-black",
                  style: { color: numColor }
                }, m.num),
                React.createElement("div", { className: "text-xs font-bold text-slate-800 dark:text-slate-200" }, m.label),
                m.note && React.createElement("p", { className: "text-[11px] text-slate-500 leading-relaxed" }, m.note)
              );
            })
          ),
          chart.takeaway && React.createElement(
            "div",
            { className: "p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed flex items-center gap-2" },
            React.createElement("span", { className: "text-base shrink-0" }, "💡"),
            React.createElement("span", null, chart.takeaway)
          )
        );
      })(),

      // 7. المخطط التشريحي للأنظمة المزدوجة والمتقابلة (Dual System / Brain Anatomy)
      (chart.type === "dual_system" || chart.type === "anatomy") && (function() {
        var left = chart.leftWing || chart.left || {};
        var right = chart.rightWing || chart.right || {};

        return React.createElement(
          "div",
          { className: "space-y-4" },
          React.createElement(
            "div",
            { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
            // الجناح الأيسر / المنطقي / التحليلي
            React.createElement(
              "div",
              { className: "p-4 sm:p-5 rounded-3xl bg-blue-50/60 dark:bg-blue-950/25 border-2 border-blue-200/90 dark:border-blue-800/60 space-y-3.5 relative overflow-hidden" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2.5 pb-2.5 border-b border-blue-200/70 dark:border-blue-800/50" },
                React.createElement("span", { className: "text-2xl p-2 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-2xs" }, left.icon || "🔬"),
                React.createElement(
                  "div",
                  null,
                  React.createElement("h5", { className: "text-xs sm:text-sm font-black text-blue-950 dark:text-blue-100" }, left.title || "الجانب الأيسر"),
                  left.subtitle && React.createElement("p", { className: "text-[11px] text-blue-600 dark:text-blue-400 font-medium" }, left.subtitle)
                )
              ),
              Array.isArray(left.traits) && left.traits.length > 0 && React.createElement(
                "ul",
                { className: "space-y-1.5 text-xs text-slate-700 dark:text-slate-300" },
                left.traits.map(function(t, idx) {
                  return React.createElement(
                    "li",
                    { key: idx, className: "flex items-start gap-2 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-blue-100 dark:border-blue-900/30" },
                    React.createElement("span", { className: "text-blue-600 font-bold shrink-0" }, "•"),
                    React.createElement("span", { className: "leading-snug break-words" }, t)
                  );
                })
              ),
              left.counselingRole && React.createElement(
                "div",
                { className: "pt-2 text-[11px] text-blue-900 dark:text-blue-200 font-bold flex items-start gap-1.5 bg-blue-100/60 dark:bg-blue-900/40 p-2.5 rounded-xl border border-blue-200/60 dark:border-blue-800/40" },
                React.createElement("span", { className: "shrink-0" }, "🎯"),
                React.createElement("span", { className: "leading-relaxed" }, left.counselingRole)
              )
            ),

            // الجناح الأيمن / الوجداني / الشمولي
            React.createElement(
              "div",
              { className: "p-4 sm:p-5 rounded-3xl bg-purple-50/60 dark:bg-purple-950/25 border-2 border-purple-200/90 dark:border-purple-800/60 space-y-3.5 relative overflow-hidden" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2.5 pb-2.5 border-b border-purple-200/70 dark:border-purple-800/50" },
                React.createElement("span", { className: "text-2xl p-2 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 shadow-2xs" }, right.icon || "🎨"),
                React.createElement(
                  "div",
                  null,
                  React.createElement("h5", { className: "text-xs sm:text-sm font-black text-purple-950 dark:text-purple-100" }, right.title || "الجانب الأيمن"),
                  right.subtitle && React.createElement("p", { className: "text-[11px] text-purple-600 dark:text-purple-400 font-medium" }, right.subtitle)
                )
              ),
              Array.isArray(right.traits) && right.traits.length > 0 && React.createElement(
                "ul",
                { className: "space-y-1.5 text-xs text-slate-700 dark:text-slate-300" },
                right.traits.map(function(t, idx) {
                  return React.createElement(
                    "li",
                    { key: idx, className: "flex items-start gap-2 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-purple-100 dark:border-purple-900/30" },
                    React.createElement("span", { className: "text-purple-600 font-bold shrink-0" }, "•"),
                    React.createElement("span", { className: "leading-snug break-words" }, t)
                  );
                })
              ),
              right.counselingRole && React.createElement(
                "div",
                { className: "pt-2 text-[11px] text-purple-900 dark:text-purple-200 font-bold flex items-start gap-1.5 bg-purple-100/60 dark:bg-purple-900/40 p-2.5 rounded-xl border border-purple-200/60 dark:border-purple-800/40" },
                React.createElement("span", { className: "shrink-0" }, "🎯"),
                React.createElement("span", { className: "leading-relaxed" }, right.counselingRole)
              )
            )
          ),

          // جسر التكامل والتنسيق المشوري
          chart.integration && React.createElement(
            "div",
            { className: "p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800/70 text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 space-y-1.5" },
            React.createElement(
              "div",
              { className: "font-black flex items-center gap-2 text-indigo-900 dark:text-indigo-300" },
              React.createElement("span", { className: "text-base" }, "🌉"),
              React.createElement("span", null, "جسر التكامل المشوري بين الجانبين:")
            ),
            React.createElement("p", { className: "text-slate-700 dark:text-slate-300 leading-relaxed break-words pr-5" }, chart.integration)
          )
        );
      })(),

      // 8. المخطط الحلقي الديناميكي والدورات المشورية المغلقة (Cycles & Loops)
      chart.type === "cycle" && (function() {
        var stages = chart.stages || [];
        return React.createElement(
          "div",
          { className: "space-y-4" },
          React.createElement(
            "div",
            { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-" + Math.min(4, Math.max(2, stages.length)) + " gap-3.5" },
            stages.map(function(st, idx) {
              return React.createElement(
                "div",
                {
                  key: idx,
                  className: "p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 relative flex flex-col justify-between hover:border-amber-400 dark:hover:border-amber-600 transition-all shadow-2xs"
                },
                React.createElement(
                  "div",
                  { className: "space-y-1.5" },
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-between" },
                    React.createElement("span", { className: "px-2 py-0.5 rounded-lg bg-amber-500 text-white font-mono font-black text-[10px]" }, "محطة " + (st.step || (idx + 1))),
                    React.createElement("span", { className: "text-lg" }, st.icon || "🔄")
                  ),
                  React.createElement("h5", { className: "text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug break-words" }, st.title),
                  React.createElement("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words" }, st.desc)
                ),
                React.createElement(
                  "div",
                  { className: "pt-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center justify-end gap-1" },
                  React.createElement("span", null, idx < stages.length - 1 ? "تؤدي إلى ⬅️" : "تعود وتكتمل الدورة 🔁")
                )
              );
            })
          ),
          chart.breakthrough && React.createElement(
            "div",
            { className: "p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm space-y-1" },
            React.createElement(
              "div",
              { className: "font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5" },
              React.createElement("span", { className: "text-base" }, "🔓"),
              React.createElement("span", null, "نقطة كسر الحلقة المشورية ومسار التعافي:")
            ),
            React.createElement("p", { className: "text-slate-700 dark:text-slate-300 leading-relaxed break-words pr-5" }, chart.breakthrough)
          )
        );
      })()
    );
  };

  // المكون العام لعارض المخططات المستقل إن دعت الحاجة
  window.VisualDiagramsViewer = function(props) {
    var visuals = props.visuals || null;
    var charts = (visuals && Array.isArray(visuals.charts)) ? visuals.charts : [];
    if (!charts.length) return null;

    return React.createElement(
      "div",
      { className: "space-y-4" },
      charts.map(function(c, idx) {
        return React.createElement(window.SingleVisualChartCard, { key: c.id || idx, chart: c });
      })
    );
  };
})();
