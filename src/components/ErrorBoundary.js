// مكون React Error Boundary لمنع الصفحة البيضاء واصطياد أي عطل مفاجئ
window.ErrorBoundary = class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isSending: false,
      sentSuccess: false,
      isRecording: false,
      audioBlob: null,
      audioUrl: null,
      recordingDuration: 0
    };
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.timerInterval = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo: errorInfo });
    if (window.ErrorReportService) {
      window.ErrorReportService.lastError = {
        message: error ? (error.message || String(error)) : "Unknown Render Error",
        stack: (error && error.stack) ? error.stack : (errorInfo ? errorInfo.componentStack : ""),
        time: new Date().toISOString()
      };
      // إرسال تقرير الخطأ تلقائياً للمشرفين
      try {
        this.handleSendCrashReport();
      } catch (eAuto) {}
    }
  }

  startRecording = async () => {
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      var self = this;

      this.mediaRecorder.ondataavailable = function(e) {
        if (e.data && e.data.size > 0) {
          self.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = function() {
        var blob = new Blob(self.audioChunks, { type: "audio/webm" });
        var url = URL.createObjectURL(blob);
        self.setState({ audioBlob: blob, audioUrl: url, isRecording: false });
        stream.getTracks().forEach(function(track) { track.stop(); });
      };

      this.mediaRecorder.start();
      this.setState({ isRecording: true, recordingDuration: 0, audioBlob: null, audioUrl: null });

      this.timerInterval = setInterval(function() {
        self.setState(function(prev) { return { recordingDuration: prev.recordingDuration + 1 }; });
      }, 1000);
    } catch (err) {
      alert("تعذر الوصول للميكروفون: " + err.message);
    }
  };

  stopRecording = () => {
    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.stop();
      if (this.timerInterval) clearInterval(this.timerInterval);
    }
  };

  handleSendCrashReport = async () => {
    this.setState({ isSending: true });
    try {
      var audioData = null;
      if (this.state.audioBlob && window.ErrorReportService.uploadAudio) {
        audioData = await window.ErrorReportService.uploadAudio(this.state.audioBlob);
      }

      var hash = window.location.hash || "#unknown";
      var errText = "الرسالة: " + (this.state.error ? this.state.error.message : "خطأ غير معروف") + "\n" +
        "Stack: " + (this.state.error && this.state.error.stack ? this.state.error.stack : "") + "\n" +
        "ComponentStack: " + (this.state.errorInfo ? this.state.errorInfo.componentStack : "");

      var cachedUser = null;
      try {
        var rawUser = localStorage.getItem("counsel_user");
        if (rawUser) cachedUser = JSON.parse(rawUser);
      } catch(e) {}
      var activeUser = (this.props && this.props.currentUser) || cachedUser || {};

      await window.ErrorReportService.sendReport({
        page: "انهيار كلي (" + hash + ")",
        userDescription: "انهيار مفاجئ للشاشة تم الإبلاغ عنه من شاشة الخطأ التلقائية",
        errorDetails: errText,
        senderName: activeUser.fullName || activeUser.email || "دارس بالمنصة",
        senderPhone: activeUser.phone || activeUser.whatsapp || "-",
        senderEmail: activeUser.email || "-",
        deviceInfo: navigator.userAgent,
        audioUrl: audioData ? audioData.audioUrl : null,
        audioStoragePath: audioData ? audioData.storagePath : null
      });

      this.setState({ sentSuccess: true, isSending: false });
      var self = this;
      setTimeout(function() {
        self.handleRecover();
      }, 2000);
    } catch (err) {
      alert("فشل إرسال البلاغ: " + err.message);
      this.setState({ isSending: false });
    }
  };

  handleRecover = (targetTab) => {
    var tab = targetTab || "lectures";
    if (tab === "guide") tab = "student_guide";
    try {
      window.location.hash = "#" + tab;
      localStorage.setItem("counsel_active_tab", tab);
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null, sentSuccess: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    var self = this;
    var durationSec = this.state.recordingDuration;
    var minutes = Math.floor(durationSec / 60);
    var seconds = durationSec % 60;
    var timeFormatted = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);

    return React.createElement(
      "div",
      { className: "min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-cairo", dir: "rtl" },
      React.createElement(
        "div",
        { className: "bg-slate-800/90 border border-slate-700 max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center space-y-6" },
        
        React.createElement("div", { className: "w-20 h-20 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-4xl shadow-inner animate-pulse" }, "⚠️"),
        
        React.createElement(
          "div",
          { className: "space-y-2" },
          React.createElement("h2", { className: "text-xl sm:text-2xl font-bold text-white" }, "نعتذر عن هذا التوقف المؤقت"),
          React.createElement("p", { className: "text-xs sm:text-sm text-slate-300 leading-relaxed" }, 
            "تم إرسال تفاصيل الخطأ تلقائياً إلى المشرفين، وسيتم الإصلاح في أقرب وقت. يمكنك الانتقال للصفحة الرئيسية لمتابعة استخدام المنصة بشكل طبيعي."
          )
        ),

        // قسم التسجيل الصوتي
        React.createElement(
          "div",
          { className: "p-4 bg-slate-900/60 rounded-2xl border border-slate-700/60 space-y-3 text-right" },
          React.createElement("div", { className: "flex items-center justify-between" },
            React.createElement("span", { className: "text-xs font-bold text-slate-300 flex items-center gap-1.5" },
              React.createElement("span", null, "🎙️"),
              "تسجيل فويس سريع يشرح المشكلة (اختياري)"
            ),
            this.state.isRecording ? React.createElement("span", { className: "text-xs text-rose-400 font-bold animate-pulse" }, "● جاري التسجيل: " + timeFormatted) : null
          ),
          
          React.createElement(
            "div",
            { className: "flex items-center gap-2 justify-center pt-1" },
            !this.state.isRecording ? React.createElement("button", {
              type: "button",
              onClick: this.startRecording,
              className: "px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-emerald-400 flex items-center gap-2 transition-all shadow-sm"
            }, "بدء التسجيل الصوتي 🎙️") : React.createElement("button", {
              type: "button",
              onClick: this.stopRecording,
              className: "px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm animate-pulse"
            }, "إنهاء وحفظ التسجيل ⏹️")
          ),

          this.state.audioUrl ? React.createElement(
            "div",
            { className: "pt-2 flex flex-col items-center gap-1" },
            React.createElement("audio", { src: this.state.audioUrl, controls: true, className: "w-full h-9 rounded-lg" }),
            React.createElement("span", { className: "text-[11px] text-emerald-400 font-bold" }, "✓ تم تسجيل الصوت وجاهز للإرسال")
          ) : null
        ),

        this.state.sentSuccess ? React.createElement(
          "div",
          { className: "p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-center space-y-1" },
          React.createElement("div", { className: "text-2xl" }, "✅"),
          React.createElement("div", { className: "text-sm font-bold text-emerald-300" }, "تم إرسال تقرير الخطأ بنجاح!"),
          React.createElement("div", { className: "text-xs text-emerald-400" }, "جاري نقلك للصفحة الرئيسية...")
        ) : React.createElement(
          "div",
          { className: "space-y-3 pt-2" },
          React.createElement("p", { className: "text-xs font-bold text-slate-300 text-center" }, "يمكنك متابعة التصفح عبر الانتقال لقسم بديل بالمنصة:"),
          React.createElement(
            "div",
            { className: "grid grid-cols-3 gap-2" },
            React.createElement("button", {
              type: "button",
              onClick: function() { self.handleRecover("lectures"); },
              className: "py-2.5 px-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white font-bold text-xs shadow-md transition-all flex flex-col items-center gap-1"
            },
              React.createElement("span", { className: "text-base" }, "🎧"),
              React.createElement("span", null, "المحاضرات")
            ),
            React.createElement("button", {
              type: "button",
              onClick: function() { self.handleRecover("books"); },
              className: "py-2.5 px-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white font-bold text-xs shadow-md transition-all flex flex-col items-center gap-1"
            },
              React.createElement("span", { className: "text-base" }, "📚"),
              React.createElement("span", null, "المكتبة")
            ),
            React.createElement("button", {
              type: "button",
              onClick: function() { self.handleRecover("guide"); },
              className: "py-2.5 px-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white font-bold text-xs shadow-md transition-all flex flex-col items-center gap-1"
            },
              React.createElement("span", { className: "text-base" }, "📖"),
              React.createElement("span", null, "دليل الطالب")
            )
          )
        ),

        // إظهار كود الخطأ بشكل مصغر قابل للطي
        React.createElement(
          "details",
          { className: "text-right text-[11px] text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-700/40" },
          React.createElement("summary", { className: "cursor-pointer font-bold select-none text-slate-400 hover:text-slate-200" }, "عرض التفاصيل التقنية للخطأ"),
          React.createElement("pre", { className: "mt-2 font-mono whitespace-pre-wrap text-[10px] text-rose-300 max-h-32 overflow-y-auto ltr", dir: "ltr" },
            (this.state.error ? this.state.error.toString() : "") + "\n" +
            (this.state.errorInfo ? this.state.errorInfo.componentStack : "")
          )
        )
      )
    );
  }
};
