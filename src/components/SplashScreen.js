// مكون شاشة البداية والترحيب الأنيقة (Splash Screen)
// تظهر لمدة 5 ثوانٍ مع مؤشر تحميل من 0% إلى 100%، آية اليوم المتغيرة، والاسم المعتمد
// ميزة تفاعلية ذكية: عند لمس الشاشة أو الضغط عليها يتوقف شريط التحميل مؤقتاً لقراءة الآية، وعند رفع الإصبع يُستأنف التحميل تلقائياً
window.SplashScreen = function(props) {
  var onFinish = props.onFinish;
  var [progress, setProgress] = React.useState(0);
  var [isPaused, setIsPaused] = React.useState(false);
  var isPausedRef = React.useRef(false);

  var [verse, setVerse] = React.useState(function() {
    return (window.getTodayVerse && typeof window.getTodayVerse === "function")
      ? window.getTodayVerse()
      : {
          text: "الْمَقَاصِدُ تَبْطُلُ مِنْ عَدَمِ الْمَشُورَةِ، وَبِكَثْرَةِ الْمُشِيرِينَ تَقُومُ.",
          ref: "أمثال 15: 22"
        };
  });

  // تحديث الـ ref لضمان عدم تأثر interval
  var handlePause = function() {
    isPausedRef.current = true;
    setIsPaused(true);
  };

  var handleResume = function() {
    isPausedRef.current = false;
    setIsPaused(false);
  };

  React.useEffect(function() {
    var duration = 5000; // 5 ثوانٍ ثابتة
    var intervalTime = 50; // تحديث سلس كل 50 ملي ثانية
    var step = (intervalTime / duration) * 100;

    var timer = setInterval(function() {
      // إذا كان الدارس يلمس الشاشة، لا نزيد التقدم حتى يرفع يده
      if (isPausedRef.current) return;

      setProgress(function(prev) {
        var next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(function() {
            if (onFinish) onFinish();
          }, 150);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return function() {
      clearInterval(timer);
    };
  }, [onFinish]);

  return React.createElement(
    "div",
    {
      className: "fixed inset-0 z-[99999] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between items-center px-6 py-8 select-none transition-opacity duration-500 cursor-pointer active:cursor-grabbing",
      dir: "rtl",
      // دعم لمس الشاشة في الموبايل والماوس في الكمبيوتر
      onTouchStart: handlePause,
      onTouchEnd: handleResume,
      onTouchCancel: handleResume,
      onMouseDown: handlePause,
      onMouseUp: handleResume,
      onMouseLeave: handleResume
    },

    // المنطقة العلوية: شارة التوقف المؤقت + زر تخطي سريع للمستعجل
    React.createElement(
      "div",
      { className: "w-full flex justify-between items-center h-8" },
      
      // زر التخطي السريع
      React.createElement(
        "button",
        {
          type: "button",
          onClick: function(e) {
            e.stopPropagation();
            if (onFinish) onFinish();
          },
          onTouchStart: function(e) { e.stopPropagation(); },
          onMouseDown: function(e) { e.stopPropagation(); },
          className: "px-3 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95",
          title: "دخول مباشر للمنصة فوراً"
        },
        React.createElement("span", null, "تخطي"),
        React.createElement("span", { className: "text-amber-400 font-bold" }, "←")
      ),

      // شارة التوقف المؤقت
      isPaused ? React.createElement(
        "div",
        { className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold animate-pulse" },
        React.createElement("span", null, "⏸"),
        React.createElement("span", null, "متوقف مؤقتاً")
      ) : React.createElement("div", null)
    ),

    // المنطقة الوسطى (الشعار، الاسم، والآية)
    React.createElement(
      "div",
      { className: "flex flex-col items-center text-center max-w-lg w-full space-y-6 animate-fade-in" },
      
      // الشعار / الأيقونة مع تأثير توهج ناعم
      React.createElement(
        "div",
        { className: "relative group" },
        React.createElement("div", {
          className: "absolute -inset-1.5 bg-gradient-to-r from-amber-500 to-blue-600 rounded-3xl blur-lg opacity-40 animate-pulse"
        }),
        React.createElement("img", {
          src: "icon-192.png",
          alt: "أيقونة التطبيق",
          className: "relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-2xl object-cover border-2 border-slate-700/80 bg-slate-900 pointer-events-none"
        })
      ),

      // الاسم الرسمي للتطبيق
      React.createElement(
        "div",
        { className: "space-y-1.5" },
        React.createElement(
          "h1",
          { className: "text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-cairo drop-shadow-md" },
          "الرفيق الذكي لدارسي معهد المشورة"
        ),
        React.createElement(
          "p",
          { className: "text-xs sm:text-sm text-amber-400/90 font-medium font-cairo" },
          "منصة المذاكرة والدعم الدراسي الشامل"
        )
      ),

      // بطاقة آية اليوم الأنيقة
      React.createElement(
        "div",
        {
          className: "w-full bg-slate-800/60 backdrop-blur-md border border-slate-700/60 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden text-center mt-2 transition-all duration-300 " +
            (isPaused ? "ring-2 ring-amber-400/50 scale-[1.02] bg-slate-800/80" : "")
        },
        React.createElement(
          "div",
          { className: "text-amber-400 text-lg mb-2 font-serif opacity-80" },
          "✨ آية اليوم ✨"
        ),
        React.createElement(
          "p",
          {
            className: "text-slate-100 text-sm sm:text-base leading-relaxed font-semibold italic drop-shadow-xs"
          },
          "« " + verse.text + " »"
        ),
        React.createElement(
          "span",
          {
            className: "inline-block mt-3 text-xs sm:text-sm text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full"
          },
          verse.ref
        )
      )
    ),

    // المنطقة السفلية (شريط التقدم من 0 إلى 100 والتنويه غير الرسمي)
    React.createElement(
      "div",
      { className: "w-full max-w-md flex flex-col items-center space-y-3" },
      
      // نسبة التحميل وشريط التقدم
      React.createElement(
        "div",
        { className: "w-full space-y-1.5" },
        React.createElement(
          "div",
          { className: "flex justify-between items-center text-[11px] text-slate-400 font-mono px-1" },
          React.createElement(
            "span",
            { className: "font-cairo text-slate-300 flex items-center gap-1" },
            isPaused
              ? React.createElement("span", { className: "text-amber-400 font-bold" }, "متوقف مؤقتاً...")
              : "جاري تجهيز المنصة..."
          ),
          React.createElement("span", { className: "font-bold text-amber-400" }, Math.min(100, Math.round(progress)) + "%")
        ),
        React.createElement(
          "div",
          { className: "w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 p-0.5" },
          React.createElement("div", {
            className: "h-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 rounded-full transition-all duration-75 ease-out shadow-xs",
            style: { width: Math.min(100, progress) + "%" }
          })
        )
      ),

      // التنويه بعدم التبعية الرسمية
      React.createElement(
        "div",
        { className: "flex flex-col items-center gap-1 pt-1" },
        React.createElement(
          "p",
          { className: "text-[11px] sm:text-xs text-slate-400 text-center font-normal" },
          "تطبيق غير رسمي لمساعدة وتيسير دراسة الطلاب"
        )
      )
    )
  );
};
