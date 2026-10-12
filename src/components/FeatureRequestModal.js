// نافذة اقتراح ميزة أو وظيفة جديدة للدارسين مع متابعة الردود الشخصية
window.FeatureRequestModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var currentUser = props.currentUser || {};

  var [activeTab, setActiveTab] = React.useState("submit"); // "submit" or "my_requests"
  
  // حقول الاقتراح الجديد
  var [featureTitle, setFeatureTitle] = React.useState("");
  var [category, setCategory] = React.useState("محاضرات وصوتيات");
  var [description, setDescription] = React.useState("");
  var [isSending, setIsSending] = React.useState(false);
  var [successNotice, setSuccessNotice] = React.useState(false);

  // حالة التسجيل الصوتي (فويس نوت)
  var [isRecording, setIsRecording] = React.useState(false);
  var [audioBlob, setAudioBlob] = React.useState(null);
  var [audioUrl, setAudioUrl] = React.useState(null);
  var [recordingDuration, setRecordingDuration] = React.useState(0);

  // قائمة اقتراحات الدارس السابقة
  var [myRequests, setMyRequests] = React.useState([]);
  var [isLoadingMyRequests, setIsLoadingMyRequests] = React.useState(false);

  var mediaRecorderRef = React.useRef(null);
  var audioChunksRef = React.useRef([]);
  var timerRef = React.useRef(null);

  var categories = [
    { id: "محاضرات وصوتيات", icon: "🎙️", name: "المحاضرات والتسجيلات" },
    { id: "كتب ومراجع", icon: "📚", name: "الكتب والمكتبة الإلكترونية" },
    { id: "مذكرات وتأملات", icon: "📝", name: "المذكرات والملاحظات" },
    { id: "ذكاء اصطناعي", icon: "🤖", name: "أدوات الذكاء الاصطناعي والمساعد" },
    { id: "دليل الدارس", icon: "📋", name: "دليل الدارس واللوائح" },
    { id: "عام وتصميم", icon: "🌐", name: "عام / تحسين الواجهة والتجربة" }
  ];

  // جلب اقتراحات الدارس السابقة
  var fetchMyRequests = function() {
    if (!window.db) return;
    var userEmail = (currentUser.email || "").toLowerCase().trim();
    if (!userEmail) return;

    setIsLoadingMyRequests(true);
    window.db.collection("error_reports")
      .where("type", "==", "feature_request")
      .where("senderEmail", "==", userEmail)
      .get()
      .then(function(snap) {
        var list = [];
        snap.forEach(function(doc) {
          list.push(Object.assign({ id: doc.id }, doc.data()));
        });
        list.sort(function(a, b) {
          var tA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : (a.timestamp || 0);
          var tB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : (b.timestamp || 0);
          return tB - tA;
        });
        setMyRequests(list);
      })
      .catch(function(err) {
        console.warn("Error fetching user feature requests:", err);
      })
      .finally(function() {
        setIsLoadingMyRequests(false);
      });
  };

  React.useEffect(function() {
    if (isOpen) {
      setFeatureTitle("");
      setCategory("محاضرات وصوتيات");
      setDescription("");
      setSuccessNotice(false);
      setIsRecording(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingDuration(0);
      setActiveTab("submit");
      fetchMyRequests();
    }
  }, [isOpen]);

  React.useEffect(function() {
    if (activeTab === "my_requests") {
      fetchMyRequests();
    }
  }, [activeTab]);

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
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
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
      alert("تعذر فتح الميكروفون: " + err.message + "\nيرجى السماح بصلاحية الميكروفون من المتصفح.");
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
    if (!featureTitle.trim()) {
      alert("يرجى كتابة عنوان مختصر للميزة أو الفكرة المقترحة.");
      return;
    }
    if (!description.trim() && !audioBlob) {
      alert("يرجى كتابة شرح للفكرة أو تسجيلها بالصوت لتصل بوضوح لمشرف المنصة.");
      return;
    }

    setIsSending(true);

    try {
      var audioData = null;
      if (audioBlob && window.ErrorReportService && window.ErrorReportService.uploadAudio) {
        audioData = await window.ErrorReportService.uploadAudio(audioBlob);
      }

      var docId = "feat_" + Date.now();
      var payload = {
        id: docId,
        type: "feature_request",
        featureTitle: featureTitle.trim(),
        page: category,
        category: category,
        userDescription: description.trim() || (audioBlob ? "تم تسجيل تفاصيل الفكرة صوتياً 🎙️" : "بدون شرح تفصيلي"),
        errorDetails: "اقتراح خاصية جديدة للدراسة",
        senderName: currentUser.fullName || "دارس غير مسجل",
        senderPhone: currentUser.phone || currentUser.whatsapp || "-",
        senderEmail: (currentUser.email || "").toLowerCase().trim(),
        senderId: currentUser.id || "",
        deviceInfo: navigator.userAgent,
        audioUrl: audioData ? audioData.audioUrl : null,
        audioStoragePath: audioData ? audioData.storagePath : null,
        status: "under_review", // 'under_review', 'in_progress', 'implemented'
        adminReply: "",
        repliedAt: null,
        timestamp: Date.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (window.db) {
        await window.db.collection("error_reports").doc(docId).set(payload);
      }

      // إشعار المشرف فوراً
      try {
        if (window.NotificationService && typeof window.NotificationService.notifyAdminNewFeatureRequest === "function") {
          await window.NotificationService.notifyAdminNewFeatureRequest(payload);
        }
      } catch (errNotif) {
        console.warn("Could not dispatch admin feature notification:", errNotif);
      }

      setSuccessNotice(true);
      setTimeout(function() {
        setSuccessNotice(false);
        setActiveTab("my_requests");
        fetchMyRequests();
      }, 1800);
    } catch (err) {
      alert("خطأ أثناء إرسال الاقتراح: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  var minutes = Math.floor(recordingDuration / 60);
  var seconds = recordingDuration % 60;
  var timeFormatted = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);

  var getStatusBadge = function(status) {
    if (status === "implemented") {
      return React.createElement("span", { className: "px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shrink-0" }, "🎉 تم التنفيذ والإطلاق!");
    }
    if (status === "in_progress") {
      return React.createElement("span", { className: "px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1 shrink-0" }, "🛠️ معتمد وجاري برمجتها");
    }
    if (status === "not_applicable" || status === "declined") {
      return React.createElement("span", { className: "px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1 shrink-0" }, "💬 تمت المراجعة مع التوضيح");
    }
    return React.createElement("span", { className: "px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 shrink-0" }, "⏳ قيد الدراسة والمراجعة");
  };

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in" },
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-right", dir: "rtl" },

      // ترويسة النافذة
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3" },
        React.createElement("div", { className: "flex items-center gap-2.5" },
          React.createElement("div", { className: "w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xl shadow-xs" }, "💡"),
          React.createElement("div", null,
            React.createElement("h3", { className: "text-base sm:text-lg font-bold text-slate-900 dark:text-white" }, "اقترح ميزة أو وظيفة جديدة"),
            React.createElement("p", { className: "text-xs text-slate-400" }, "شاركنا فكرتك لتطوير المنصة، وسيصلك رد مباشر من المشرف")
          )
        ),
        React.createElement("button", {
          onClick: onClose,
          className: "w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 font-bold flex items-center justify-center transition-all"
        }, "✕")
      ),

      // التبديل بين تقديم فكرة وبين متابعة اقتراحاتي
      React.createElement(
        "div",
        { className: "flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 gap-1 text-xs font-bold" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { setActiveTab("submit"); },
            className: "flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 " +
              (activeTab === "submit" ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")
          },
          React.createElement("span", null, "✨"),
          "تقديم فكرة جديدة"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { setActiveTab("my_requests"); },
            className: "flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 " +
              (activeTab === "my_requests" ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")
          },
          React.createElement("span", null, "📋"),
          "اقتراحاتي وردود المشرف (" + myRequests.length + ")"
        )
      ),

      // تبويب تقديم فكرة جديدة
      activeTab === "submit" && React.createElement(
        "form",
        { onSubmit: handleSubmit, className: "space-y-4 pt-1" },

        // عنوان الميزة
        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300" }, "عنوان الميزة أو الفكرة المطلوبة *"),
          React.createElement("input", {
            type: "text",
            required: true,
            value: featureTitle,
            onChange: function(e) { setFeatureTitle(e.target.value); },
            placeholder: "مثال: إمكانية تلوين وتظليل النصوص داخل صفحات الكتب...",
            className: "w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none transition-all"
          })
        ),

        // القسم المراد تطويره
        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300" }, "في أي قسم داخل المنصة؟"),
          React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2" },
            categories.map(function(c) {
              var isSel = category === c.id;
              return React.createElement(
                "button",
                {
                  key: c.id,
                  type: "button",
                  onClick: function() { setCategory(c.id); },
                  className: "p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all " +
                    (isSel
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300")
                },
                React.createElement("span", { className: "text-base" }, c.icon),
                React.createElement("span", { className: "truncate text-[11px]" }, c.name)
              );
            })
          )
        ),

        // شرح الفكرة بالتفصيل
        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300" }, "تفاصيل الفكرة (كيف ستساعدك وتساعد زملاءك؟)"),
          React.createElement("textarea", {
            rows: 3,
            value: description,
            onChange: function(e) { setDescription(e.target.value); },
            placeholder: "اشرح الفكرة والهدف منها بحرية، أو سجلها بالصوت أدناه...",
            className: "w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none transition-all"
          })
        ),

        // تسجيل صوتي اختياري
        React.createElement(
          "div",
          { className: "p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2" },
          React.createElement(
            "div",
            { className: "flex items-center justify-between" },
            React.createElement("div", { className: "flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300" },
              React.createElement("span", { className: "text-base" }, "🎙️"),
              "شرح الفكرة بالصوت (فويس نوت - اختياري)"
            ),
            isRecording && React.createElement("span", { className: "text-xs font-mono font-bold text-rose-500 animate-pulse" }, timeFormatted)
          ),

          React.createElement(
            "div",
            { className: "flex flex-wrap items-center gap-2 pt-1" },
            !isRecording && !audioBlob && React.createElement(
              "button",
              {
                type: "button",
                onClick: startRecording,
                className: "px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
              },
              React.createElement("span", null, "🔴"),
              "ابدأ التسجيل الصوتي"
            ),

            isRecording && React.createElement(
              "button",
              {
                type: "button",
                onClick: stopRecording,
                className: "px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs animate-pulse transition-all"
              },
              React.createElement("span", null, "⏹️"),
              "إيقاف وحفظ التسجيل"
            ),

            audioBlob && React.createElement(
              "div",
              { className: "flex items-center gap-2 w-full pt-1" },
              React.createElement("audio", {
                src: audioUrl,
                controls: true,
                className: "flex-1 h-8"
              }),
              React.createElement("button", {
                type: "button",
                onClick: deleteAudioRecording,
                className: "p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-xs font-bold transition-all"
              }, "🗑️ إعادة")
            )
          )
        ),

        // رسالة النجاح
        successNotice && React.createElement(
          "div",
          { className: "p-3 rounded-2xl bg-emerald-500 text-white text-xs font-bold text-center flex items-center justify-center gap-2 animate-in zoom-in-95" },
          React.createElement("span", null, "🎉"),
          "شكراً لك! تم إرسال فكرتك بنجاح لمشرف المنصة وسيصلك رد مباشر عليها قريباً."
        ),

        // أزرار الحفظ والإرسال
        React.createElement(
          "div",
          { className: "flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" },
          React.createElement("button", {
            type: "button",
            disabled: isSending,
            onClick: onClose,
            className: "px-4 py-2 text-xs rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          }, "إلغاء"),
          React.createElement("button", {
            type: "submit",
            disabled: isSending,
            className: "px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all disabled:opacity-60 active:scale-95"
          }, isSending ? "جاري الإرسال للمشرف..." : "إرسال الاقتراح للمشرف 🚀")
        )
      ),

      // تبويب استعراض اقتراحاتي السابقة وردود المشرف
      activeTab === "my_requests" && React.createElement(
        "div",
        { className: "space-y-3 pt-1 max-h-[60vh] overflow-y-auto" },

        isLoadingMyRequests ? React.createElement(
          "div",
          { className: "p-8 text-center text-slate-400 text-xs font-bold space-y-2" },
          React.createElement("div", { className: "text-2xl animate-spin" }, "⏳"),
          React.createElement("p", null, "جاري جلب اقتراحاتك السابقة...")
        ) : (myRequests.length === 0 ? React.createElement(
          "div",
          { className: "p-8 text-center text-slate-400 text-xs space-y-2 border border-dashed rounded-2xl border-slate-200 dark:border-slate-800" },
          React.createElement("div", { className: "text-3xl" }, "💡"),
          React.createElement("p", { className: "font-bold text-slate-600 dark:text-slate-300" }, "لم تقم بتقديم أي اقتراحات بعد"),
          React.createElement("p", { className: "text-[11px]" }, "شاركنا أي فكرة تود رؤيتها في المنصة من تبويب 'تقديم فكرة جديدة'.")
        ) : myRequests.map(function(item) {
          var dateStr = "-";
          if (item.createdAt && typeof item.createdAt.toDate === "function") {
            dateStr = item.createdAt.toDate().toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
          } else if (item.timestamp) {
            dateStr = new Date(item.timestamp).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
          }

          return React.createElement(
            "div",
            {
              key: item.id,
              className: "p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5 transition-all"
            },
            React.createElement(
              "div",
              { className: "flex items-start justify-between gap-2" },
              React.createElement(
                "div",
                { className: "space-y-1" },
                React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, item.featureTitle || "اقتراح ميزة"),
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2 text-[11px] text-slate-400" },
                  React.createElement("span", { className: "px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 font-semibold" }, item.category || "عام"),
                  React.createElement("span", null, "🕒 " + dateStr)
                )
              ),
              getStatusBadge(item.status)
            ),

            React.createElement("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed" }, item.userDescription),

            // صندوق رد المشرف الشخصي إذا وجد
            item.adminReply ? React.createElement(
              "div",
              { className: "p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-1 text-xs animate-in fade-in" },
              React.createElement(
                "div",
                { className: "flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300" },
                React.createElement("span", null, "💬"),
                React.createElement("span", null, "رد مشرف المنصة (نادر كمال):")
              ),
              React.createElement("p", { className: "text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium" }, item.adminReply)
            ) : React.createElement(
              "div",
              { className: "text-[11px] text-slate-400 flex items-center gap-1 pt-1" },
              React.createElement("span", null, "⏳"),
              "قيد دراسة الفكرة من قِبل المشرف، وسيظهر رده هنا فور مراجعتها."
            )
          );
        }))
      )
    )
  );
};
