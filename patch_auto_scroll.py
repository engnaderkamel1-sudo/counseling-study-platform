with open('src/components/books/ChapterTextViewerModal.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State & Ref definition around line 35
target1 = """  var [autoScrollEnabled, setAutoScrollEnabled] = React.useState(true);"""
replacement1 = """  var [autoScrollEnabled, setAutoScrollEnabledState] = React.useState(function() {
    try {
      var saved = localStorage.getItem("counsel_auto_scroll_enabled");
      return saved !== null ? (saved === "true" || saved === true) : true;
    } catch (e) {
      return true;
    }
  });
  var autoScrollRef = React.useRef(autoScrollEnabled);
  autoScrollRef.current = autoScrollEnabled;
  var isUserInteractingRef = React.useRef(false);
  var userInteractionTimeoutRef = React.useRef(null);

  var toggleAutoScroll = function() {
    setAutoScrollEnabledState(function(prev) {
      var next = !prev;
      autoScrollRef.current = next;
      try {
        localStorage.setItem("counsel_auto_scroll_enabled", next ? "true" : "false");
      } catch (e) {}
      return next;
    });
  };

  var handleContainerScrollOrTouch = function() {
    isUserInteractingRef.current = true;
    if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
    userInteractionTimeoutRef.current = setTimeout(function() {
      isUserInteractingRef.current = false;
    }, 4500);
  };"""

# 2. Scroll effect around line 515
target2 = """  // التمرير السلس للفقرة النشطة تلقائياً أثناء تشغيل الصوت
  React.useEffect(function() {
    if (autoScrollEnabled && isPlayingThis && activeSegmentIdx >= 0) {
      var targetEl = document.getElementById("chapter-segment-" + activeSegmentIdx);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeSegmentIdx, autoScrollEnabled, isPlayingThis]);"""

replacement2 = """  // التمرير السلس للفقرة النشطة داخل صندوق النص فقط دون تحريك الشاشة أو نافذة المتصفح نهائياً
  React.useEffect(function() {
    if (!autoScrollRef.current || !autoScrollEnabled || !isPlayingThis || activeSegmentIdx < 0 || isUserInteractingRef.current) {
      return;
    }
    var targetEl = document.getElementById("chapter-segment-" + activeSegmentIdx);
    var container = textContainerRef.current;
    if (targetEl && container) {
      var targetTop = targetEl.offsetTop - container.offsetTop;
      var targetScroll = targetTop - (container.clientHeight / 2) + (targetEl.clientHeight / 2);
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth"
      });
    }
  }, [activeSegmentIdx, autoScrollEnabled, isPlayingThis]);"""

# 3. Button 1 (collapsed bar)
target3 = """                  type: "button",
                  onClick: function() { setAutoScrollEnabled(!autoScrollEnabled); },
                  className: "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all " +
                    (autoScrollEnabled ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-800 text-slate-400 border-slate-700"),
                  title: autoScrollEnabled ? "المتابعة التلقائية مفعلة" : "المتابعة التلقائية متوقفة"
                }, autoScrollEnabled ? "📍 متابعة" : "📍 متوقفة"),"""

replacement3 = """                  type: "button",
                  onClick: toggleAutoScroll,
                  className: "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all " +
                    (autoScrollEnabled ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-800 text-slate-400 border-slate-700"),
                  title: autoScrollEnabled ? "المتابعة التلقائية مفعلة (اضغط لإيقاف تحريك النص)" : "المتابعة التلقائية متوقفة (اضغط للتفعيل)"
                }, autoScrollEnabled ? "📍 تحريك النص ✓" : "📍 تحريك متوقف"),"""

# 4. Button 2 (expanded bar)
target4 = """                  React.createElement("button", {
                    type: "button",
                    onClick: function() { setAutoScrollEnabled(!autoScrollEnabled); },
                    className: "px-2 py-0.5 rounded-xl text-[10px] sm:text-[11px] font-bold border transition-all flex items-center gap-1 active:scale-95 " +
                      (autoScrollEnabled ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-800 text-slate-400 border-slate-700"),
                    title: autoScrollEnabled ? "تحريك الشاشة تلقائياً مع قراءة الصوت مفعل (اضغط للإيقاف)" : "تحريك الشاشة التلقائي متوقف (اضغط للتفعيل)"
                  }, autoScrollEnabled ? "📍 تحريك الشاشة ✓" : "📍 تحريك متوقف"),"""

replacement4 = """                  React.createElement("button", {
                    type: "button",
                    onClick: toggleAutoScroll,
                    className: "px-2 py-0.5 rounded-xl text-[10px] sm:text-[11px] font-bold border transition-all flex items-center gap-1 active:scale-95 " +
                      (autoScrollEnabled ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-800 text-slate-400 border-slate-700"),
                    title: autoScrollEnabled ? "تحريك النص تلقائياً مع قراءة الصوت مفعل (اضغط للإيقاف)" : "تحريك النص التلقائي متوقف (اضغط للتفعيل)"
                  }, autoScrollEnabled ? "📍 تحريك النص ✓" : "📍 تحريك متوقف"),"""

# 5. Add event listener on textContainerRef for touch/scroll so it pauses auto-scroll when user manually scrolls
target5 = """      // مساحة قراءة النص التفاعلية مع دعم التمرير السلس والمزامنة الدقيقة (سطر بسطر)
      React.createElement(
        "div",
        {
          ref: textContainerRef,"""

replacement5 = """      // مساحة قراءة النص التفاعلية مع دعم التمرير السلس والمزامنة الدقيقة (سطر بسطر)
      React.createElement(
        "div",
        {
          ref: textContainerRef,
          onScroll: handleContainerScrollOrTouch,
          onTouchMove: handleContainerScrollOrTouch,"""

content_norm = content.replace('\r\n', '\n')
t1_norm = target1.replace('\r\n', '\n')
t2_norm = target2.replace('\r\n', '\n')
t3_norm = target3.replace('\r\n', '\n')
t4_norm = target4.replace('\r\n', '\n')
t5_norm = target5.replace('\r\n', '\n')

assert t1_norm in content_norm, "Target 1 not found"
assert t2_norm in content_norm, "Target 2 not found"
assert t3_norm in content_norm, "Target 3 not found"
assert t4_norm in content_norm, "Target 4 not found"
assert t5_norm in content_norm, "Target 5 not found"

content_norm = content_norm.replace(t1_norm, replacement1.replace('\r\n', '\n'))
content_norm = content_norm.replace(t2_norm, replacement2.replace('\r\n', '\n'))
content_norm = content_norm.replace(t3_norm, replacement3.replace('\r\n', '\n'))
content_norm = content_norm.replace(t4_norm, replacement4.replace('\r\n', '\n'))
content_norm = content_norm.replace(t5_norm, replacement5.replace('\r\n', '\n'))

with open('src/components/books/ChapterTextViewerModal.js', 'w', encoding='utf-8') as f:
    f.write(content_norm)

print("SUCCESS: Patched auto-scroll in ChapterTextViewerModal.js!")
