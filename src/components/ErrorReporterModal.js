// نافذة الإبلاغ عن عطل فني أو تقديم اقتراح مع دعم الفويس نوت
window.ErrorReporterModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var currentUser = props.currentUser || {};
  var activeTab = props.activeTab || "عام";

  // نوع البلاغ: عطل أو اقتراح
  var [reportType, setReportType] = React.useState("bug"); // "bug" or "suggestion"
  var [userDescription, setUserDescription] = React.useState("");
  var [capturedErrorCode, setCapturedErrorCode] = React.useState("");
  var [isSending, setIsSending] = React.useState(false);
  var [successNotice, setSuccessNotice] = React.useState(false);

  // حالة التسجيل الصوتي
  var [isRecording, setIsRecording] = React.useState(false);
  var [audioBlob, setAudioBlob] = React.useState(null);
  var [audioUrl, setAudioUrl] = React.useState(null);
  var [recordingDuration, setRecordingDuration] = React.useState(0);

  var mediaRecorderRef = React.useRef(null);
  var audioChunksRef = React.useRef([]);
  var timerRef = React.useRef(null);

  React.useEffect(function() {
    if (isOpen) {
      var last = window.ErrorReportService.lastError;
      if (last) {
        setCapturedErrorCode(
          "الرسالة: " + last.message + "\n" +
          "الملف: " + (last.source || "غير محدد") + " (سطر: " + (last.line || "-") + ")\n" +
          "التتبع: " + (last.stack || "")
        );
      } else {
        setCapturedErrorCode("لم يتم تسجيل انهيار تلقائي؛ تم فتح النموذج يدوياً من الشاشة: " + activeTab);
      }
      setReportType("bug");
      setUserDescription("");
      setSuccessNotice(false);
      setIsRecording(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingDuration(0);
    }
  }, [isOpen, activeTab]);

  React.useEffect(function() {
    return function() {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  var startRecording = async function() {
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      var recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = function(e) {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = function() {
        var blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        var url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setIsRecording(false);
        stream.getTracks().forEach(function(track) { track.stop(); });
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setAudioBlob(null);
      setAudioUrl(null);

      timerRef.current = setInterval(function() {
        setRecordingDuration(function(prev) { return prev + 1; });
      }, 1000);
    } catch (err) {
      alert("تعذر فتح الميكروفون: " + err.message + "\nيرجى السماح بصلاحية الميكروفون من إعدادات المتصفح.");
    }
  };

  var stopRecording = function() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  var deleteAudioRecording = function() {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
  };

  var handleSubmit = async function(e) {
    if (e) e.preventDefault();
    if (!userDescription.trim() && !audioBlob) {
      alert(reportType === "suggestion" ? "يرجى كتابة فكرة الاقتراح أو تسجيلها بالصوت." : "يرجى كتابة وصف للمشكلة أو تسجيلها بالصوت.");
      return;
    }

    setIsSending(true);

    try {
      var audioData = null;
      if (audioBlob && window.ErrorReportService.uploadAudio) {
        audioData = await window.ErrorReportService.uploadAudio(audioBlob);
      }

      await window.ErrorReportService.sendReport({
        type: reportType, // "bug" or "suggestion"
        page: activeTab,
        userDescription: userDescription.trim() || (audioBlob ? (reportType === "suggestion" ? "تم إرسال اقتراح صوتي 🎙️" : "تم إرسال شرح صوتي للمشكلة 🎙️") : "بدون وصف"),
        errorDetails: reportType === "bug" ? capturedErrorCode : "اقتراح تطوير مقدم من الدارس",
        senderName: currentUser.fullName || "دارس غير مسجل",
        senderPhone: currentUser.phone || "-",
        senderEmail: currentUser.email || "-",
        deviceInfo: navigator.userAgent,
        audioUrl: audioData ? audioData.audioUrl : null,
        audioStoragePath: audioData ? audioData.storagePath : null
      });

      setSuccessNotice(true);
      setTimeout(function() {
        onClose();
      }, 2000);
    } catch (err) {
      alert("خطأ أثناء الإرسال: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  var minutes = Math.floor(recordingDuration / 60);
  var seconds = recordingDuration % 60;
  var timeFormatted = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" },
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-right", dir: "rtl" },

      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3" },
        React.createElement("div", null,
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white flex items-center gap-2" },
            React.createElement("span", null, reportType === "suggestion" ? "💡" : "🚨"),
            "إبلاغ عن عطل أو تقديم اقتراح"
          ),
          React.createElement("p", { className: "text-xs text-slate-400 mt-0.5" }, "سجل فويس أو اكتب ما تريد وسيصل مباشرة للأدمن للتعامل معه")
        ),
        React.createElement("button", { onClick: onClose, className: "p-1.5 text-slate-400 hover:text-slate-600 rounded-xl" }, "✕")
      ),

      successNotice ? React.createElement(
        "div",
        { className: "p-6 text-center space-y-2" },
        React.createElement("div", { className: "text-3xl" }, "✅"),
        React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, reportType === "suggestion" ? "تم إرسال اقتراحك بنجاح!" : "تم إرسال بلاغ العطل بنجاح!"),
        React.createElement("p", { className: "text-xs text-slate-500" }, "شكراً لك. سيقوم الأدمن بالاطلاع على رسالتك قريباً.")
      ) : React.createElement(
        "form",
        { onSubmit: handleSubmit, className: "space-y-4" },

        // التبديل بين إبلاغ عن عطل أو اقتراح جديد
        React.createElement(
          "div",
          { className: "grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl" },
          React.createElement("button", {
            type: "button",
            onClick: function() { setReportType("bug"); },
            className: "py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 " + 
              (reportType === "bug" ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")
          },
            React.createElement("span", null, "🚨"),
            "عطل فني أو مشكلة"
          ),
          React.createElement("button", {
            type: "button",
            onClick: function() { setReportType("suggestion"); },
            className: "py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 " + 
              (reportType === "suggestion" ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")
          },
            React.createElement("span", null, "💡"),
            "فكرة أو اقتراح تحسين"
          )
        ),

        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300" }, "القسم / الشاشة الحالية"),
          React.createElement("input", {
            type: "text",
            disabled: true,
            value: "قسم: " + activeTab,
            className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300"
          })
        ),

        // بطاقة تسجيل الفويس
        React.createElement(
          "div",
          { className: "p-4 rounded-2xl border " + (reportType === "suggestion" ? "border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20" : "border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20") + " space-y-3" },
          React.createElement("div", { className: "flex items-center justify-between" },
            React.createElement("span", { className: "text-xs font-bold " + (reportType === "suggestion" ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300") + " flex items-center gap-1.5" },
              React.createElement("span", null, "🎙️"),
              reportType === "suggestion" ? "تسجيل فويس لشرح فكرتك واقتراحك بصوتك" : "تسجيل فويس لشرح المشكلة بصوتك"
            ),
            isRecording ? React.createElement("span", { className: "text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse" }, "● يسجل: " + timeFormatted) : null
          ),

          React.createElement(
            "div",
            { className: "flex items-center gap-2 justify-center" },
            !isRecording ? React.createElement("button", {
              type: "button",
              onClick: startRecording,
              className: "px-4 py-2 rounded-xl " + (reportType === "suggestion" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700") + " text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            }, audioUrl ? "إعادة تسجيل فويس جديد 🔄" : "اضغط لبدء تسجيل صوتك 🎙️") : React.createElement("button", {
              type: "button",
              onClick: stopRecording,
              className: "px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm animate-pulse"
            }, "إنهاء التسجيل ⏹️ (" + timeFormatted + ")")
          ),

          audioUrl ? React.createElement(
            "div",
            { className: "pt-1 flex flex-col items-center gap-2" },
            React.createElement("audio", { src: audioUrl, controls: true, className: "w-full h-8" }),
            React.createElement("div", { className: "flex items-center justify-between w-full text-[11px]" },
              React.createElement("span", { className: "text-emerald-700 dark:text-emerald-400 font-bold" }, "✓ تم تسجيل الصوت وجاهز للإرسال"),
              React.createElement("button", {
                type: "button",
                onClick: deleteAudioRecording,
                className: "text-rose-600 hover:underline"
              }, "حذف الصوت ✕")
            )
          ) : null
        ),

        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300" }, 
            reportType === "suggestion" ? "وصف الاقتراح كتابياً (اختياري لو سجلت فويس)" : "وصف المشكلة كتابياً (اختياري لو سجلت فويس)"
          ),
          React.createElement("textarea", {
            rows: 2,
            value: userDescription,
            onChange: function(e) { setUserDescription(e.target.value); },
            placeholder: reportType === "suggestion" ? "مثال: أقترح إضافة زر لتكرار مقطع الصوت، أو ترتيب الكتب حسب التاريخ..." : "مثال: الصوت توقف، أو الصفحة لا تفتح، أو أي ملاحظة...",
            className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
          })
        ),

        reportType === "bug" ? React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-semibold text-slate-500 mb-1" }, "كود وتتبع الخطأ المسجل تقنياً"),
          React.createElement("textarea", {
            rows: 2,
            disabled: true,
            value: capturedErrorCode,
            className: "w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 font-mono text-[11px] text-rose-600 dark:text-rose-400"
          })
        ) : null,

        React.createElement(
          "div",
          { className: "flex justify-end gap-2 pt-2" },
          React.createElement("button", { type: "button", onClick: onClose, className: "px-4 py-2 text-xs rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" }, "إلغاء"),
          React.createElement("button", {
            type: "submit",
            disabled: isSending,
            className: "px-5 py-2 rounded-xl text-xs font-bold " + (reportType === "suggestion" ? "bg-amber-600 hover:bg-amber-700" : "bg-rose-600 hover:bg-rose-700") + " text-white shadow-sm flex items-center gap-1.5 transition-all"
          }, isSending ? "جاري الرفع والإرسال..." : (reportType === "suggestion" ? "إرسال الاقتراح 💡" : "إرسال البلاغ 🚨"))
        )
      )
    )
  );
};
