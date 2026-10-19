// شاشة إدارة طلبات المستخدمين واعتماد الدارسين وأكواد التخطي السريع (خاصة بالمشرف فقط)
window.UsersManagementPage = function(props) {
  var currentUser = props.currentUser;
  var [users, setUsers] = React.useState([]);
  var [isLoading, setIsLoading] = React.useState(true);
  var [searchQuery, setSearchQuery] = React.useState("");
  var [activeFilter, setActiveFilter] = React.useState("all"); // "pending", "approved", "rejected", "all"

  // نافذة إضافة دارس يدوياً ومعتمد فوراً
  var [showManualAddModal, setShowManualAddModal] = React.useState(false);
  var [manualFullName, setManualFullName] = React.useState("");
  var [manualEmail, setManualEmail] = React.useState("");
  var [manualPassword, setManualPassword] = React.useState("");
  var [manualStudyType, setManualStudyType] = React.useState("أكاديمي");
  var [manualStudyYear, setManualStudyYear] = React.useState("السنة الأولى");
  var [manualChurch, setManualChurch] = React.useState("");
  var [manualDiocese, setManualDiocese] = React.useState("");
  var [manualGov, setManualGov] = React.useState("القاهرة");
  var [manualWhatsapp, setManualWhatsapp] = React.useState("");
  var [isSavingManual, setIsSavingManual] = React.useState(false);

  // نافذة إعادة تعيين كلمة المرور الآمنة (بدون كشف كلمة المرور القديمة)
  var [resetModalUser, setResetModalUser] = React.useState(null);
  var [resetNewPassword, setResetNewPassword] = React.useState("");
  var [isResettingPassword, setIsResettingPassword] = React.useState(false);
  var [resetSuccessData, setResetSuccessData] = React.useState(null);
  var [isSendingResetEmail, setIsSendingResetEmail] = React.useState(false);
  var [resetEmailStatus, setResetEmailStatus] = React.useState("");

  var governoratesList = [
    "القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "الدقهلية",
    "الشرقية", "المنوفية", "الغربية", "كفر الشيخ", "دمياط",
    "بورسعيد", "الإسماعيلية", "السويس", "البحيرة", "بني سويف",
    "الفيوم", "المنيا", "أسيوط", "سوهاج", "قنا",
    "الأقصر", "أسوان", "البحر الأحمر", "الوادي الجديد", "مطروح",
    "شمال سيناء", "جنوب سيناء", "خارج مصر / مقيم بالخارج"
  ];

  // دالة مساعدة لتحليل قيمة Firestore REST API
  var parseFirestoreValue = function(val) {
    if (!val) return null;
    if (val.stringValue !== undefined) return val.stringValue;
    if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
    if (val.doubleValue !== undefined) return parseFloat(val.doubleValue);
    if (val.booleanValue !== undefined) return val.booleanValue;
    if (val.nullValue !== undefined) return null;
    if (val.timestampValue !== undefined) return { seconds: Math.floor(new Date(val.timestampValue).getTime() / 1000) };
    if (val.mapValue !== undefined && val.mapValue.fields) {
      var obj = {};
      Object.keys(val.mapValue.fields).forEach(function(k) { obj[k] = parseFirestoreValue(val.mapValue.fields[k]); });
      return obj;
    }
    if (val.arrayValue !== undefined && val.arrayValue.values) {
      return val.arrayValue.values.map(parseFirestoreValue);
    }
    return null;
  };

  var parseRestUserDoc = function(doc) {
    if (!doc || !doc.fields) return null;
    var obj = {};
    Object.keys(doc.fields).forEach(function(k) { obj[k] = parseFirestoreValue(doc.fields[k]); });
    obj.id = doc.name ? doc.name.split("/").pop() : obj.id;
    return obj;
  };

  var fetchUsers = function() {
    if (!currentUser || currentUser.role !== "admin") {
      setIsLoading(false);
      return function() {};
    }
    setIsLoading(true);

    // جلب أولي فوري عبر REST API (يعمل دائماً على الموبايل بدون خطأ "client is offline")
    var apiKey = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) || "AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8";
    var restUrl = "https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/users?pageSize=500&key=" + apiKey;
    fetch(restUrl, { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.documents && data.documents.length > 0) {
          var list = data.documents.map(parseRestUserDoc).filter(Boolean);
          list.sort(function(a, b) {
            var tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
            var tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
            return tB - tA;
          });
          setUsers(list);
          setIsLoading(false);
        }
      })
      .catch(function(err) { console.warn("REST users fetch notice (non-fatal):", err && err.message); });

    // اشتراك حي عبر SDK للتحديثات الفورية (يكمل عمل REST)
    if (!window.db) { setIsLoading(false); return function() {}; }
    try {
      return window.db.collection("users").onSnapshot(function(snap) {
        var list = [];
        snap.forEach(function(doc) {
          list.push(Object.assign({ id: doc.id }, doc.data()));
        });
        list.sort(function(a, b) {
          var tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
          var tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
          return tB - tA;
        });
        if (list.length > 0) {
          setUsers(list);
        }
        setIsLoading(false);
      }, function(err) {
        console.warn("Realtime users listener failed:", err);
        setIsLoading(false);
      });
    } catch (e) {
      console.error("Error setting up users listener:", e);
      setIsLoading(false);
      return function() {};
    }
  };

  var [mainTab, setMainTab] = React.useState("approval"); // "approval", "analytics", "tracking"
  var [analyticsSortBy, setAnalyticsSortBy] = React.useState("minutes"); // "minutes", "visits", "recent", "name"
  var [analyticsSearchQuery, setAnalyticsSearchQuery] = React.useState("");
  var [analyticsYearFilter, setAnalyticsYearFilter] = React.useState("all");
  var [analyticsTypeFilter, setAnalyticsTypeFilter] = React.useState("all");

  var formatDuration = function(minutes) {
    if (!minutes || minutes <= 0) return "أقل من دقيقة";
    var hrs = Math.floor(minutes / 60);
    var mins = minutes % 60;
    if (hrs === 0) return mins + " دقيقة";
    if (mins === 0) return hrs + " ساعة";
    return hrs + " س و " + mins + " د";
  };

  var [loginLogs, setLoginLogs] = React.useState([]);
  var [isLoadingLogs, setIsLoadingLogs] = React.useState(false);
  var [logSearchQuery, setLogSearchQuery] = React.useState("");
  var [logFilterType, setLogFilterType] = React.useState("students_only"); // "students_only", "all", "admin_only"
  var [isClearingLogs, setIsClearingLogs] = React.useState(false);

  // جلب سجلات الدخول والتتبع
  var fetchLoginLogs = async function() {
    if (!window.CloudSyncService || typeof window.CloudSyncService.getLoginLogs !== "function") return;
    setIsLoadingLogs(true);
    try {
      var logs = await window.CloudSyncService.getLoginLogs(200);
      setLoginLogs(logs);
    } catch (e) {
      console.warn("fetchLoginLogs error:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  var handleClearLogs = async function() {
    if (!confirm("هل تريد بالتأكيد تفريغ سجلات الدخول القديمة لتوفير المساحة في السحابة؟")) return;
    setIsClearingLogs(true);
    try {
      if (window.CloudSyncService && typeof window.CloudSyncService.clearLoginLogs === "function") {
        await window.CloudSyncService.clearLoginLogs();
        setLoginLogs([]);
        alert("✅ تم تفريغ سجل الدخول بنجاح.");
      }
    } catch (e) {
      alert("حدث خطأ أثناء تفريغ السجل: " + (e.message || e));
    } finally {
      setIsClearingLogs(false);
    }
  };

  React.useEffect(function() {
    var unsubscribe = fetchUsers();
    return function() {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  React.useEffect(function() {
    if (mainTab === "tracking") {
      fetchLoginLogs();
    }
  }, [mainTab]);

  var handleUpdateStatus = async function(userId, newStatus) {
    if (!window.db) return;
    try {
      await window.db.collection("users").doc(userId).set({
        status: newStatus,
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      setUsers(users.map(function(u) {
        if (u.id === userId) return Object.assign({}, u, { status: newStatus });
        return u;
      }));
    } catch (e) {
      alert("حدث خطأ أثناء تعديل حالة الحساب: " + e.message);
    }
  };

  var handleDeleteUser = async function(userId, userName) {
    if (!confirm("هل أنت متأكد من حذف حساب '" + userName + "' نهائياً من النظام؟")) return;
    if (!window.db) return;
    try {
      await window.db.collection("users").doc(userId).delete();
      setUsers(users.filter(function(u) { return u.id !== userId; }));
    } catch (e) {
      alert("حدث خطأ أثناء حذف الحساب: " + e.message);
    }
  };

  // توليد كلمة مرور سهلة التذكر لكبار السن والدارسين
  var generateEasyPassword = function() {
    var words = ["Study", "Hope", "Peace", "Light", "Faith", "Blessing"];
    var word = words[Math.floor(Math.random() * words.length)];
    var num = Math.floor(1000 + Math.random() * 9000);
    return word + "@" + num;
  };

  // فتح نافذة إعادة التعيين الآمنة بدون إظهار كلمة المرور القديمة إطلاقاً
  var handleOpenResetModal = function(user) {
    setResetModalUser(user);
    setResetNewPassword(generateEasyPassword());
    setResetSuccessData(null);
    setResetEmailStatus("");
  };

  // تأكيد وتطبيق كلمة المرور الجديدة في قاعدة البيانات
  var handleConfirmResetPassword = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!resetModalUser || !resetNewPassword.trim()) return;
    if (resetNewPassword.trim().length < 4) {
      alert("كلمة المرور يجب ألا تقل عن 4 خانات.");
      return;
    }
    if (!window.db) return;
    setIsResettingPassword(true);
    try {
      var passToSave = resetNewPassword.trim();
      await window.db.collection("users").doc(resetModalUser.id).update({
        password: passToSave,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      setUsers(users.map(function(u) {
        if (u.id === resetModalUser.id) {
          return Object.assign({}, u, { password: passToSave });
        }
        return u;
      }));

      setResetSuccessData({
        user: resetModalUser,
        newPass: passToSave
      });
    } catch (e) {
      alert("حدث خطأ أثناء تعديل كلمة المرور: " + (e.message || e));
    } finally {
      setIsResettingPassword(false);
    }
  };

  // إرسال إشعار تجريبي مخصص لدارس محدد
  var [sendingNotifUserId, setSendingNotifUserId] = React.useState(null);
  var handleSendTestNotifToUser = async function(user) {
    if (!user) return;
    var confirmSend = confirm("هل تريد إرسال إشعار تجريبي خاص للدارس '" + (user.fullName || user.email) + "' فقط؟\n\nلن يظهر هذا الإشعار لأي شخص آخر.");
    if (!confirmSend) return;

    setSendingNotifUserId(user.id);
    try {
      if (window.NotificationService && typeof window.NotificationService.sendDirectUserNotification === "function") {
        await window.NotificationService.sendDirectUserNotification(
          user,
          "🔔 إشعار تجريبي: مرحباً " + (user.fullName || "يا دارس"),
          "مرحباً بك في منصة دراسة المشورة! هذا إشعار تجريبي خاص بك للتأكد من وصول التنبيهات والرنين."
        );
        alert("✅ تم إرسال الإشعار التجريبي بنجاح إلى: " + (user.fullName || user.email) + "\n\nسيظهر على جهازه فور اتصاله بالمنصة دون إزعاج باقي الدارسين.");
      }
    } catch(err) {
      alert("حدث خطأ أثناء إرسال الإشعار: " + (err.message || err));
    } finally {
      setSendingNotifUserId(null);
    }
  };

  // إرسال رابط إعادة التعيين عبر البريد الإلكتروني
  var handleSendEmailReset = async function() {
    if (!resetModalUser || !resetModalUser.email) return;
    setIsSendingResetEmail(true);
    setResetEmailStatus("");
    try {
      if (window.firebase && window.firebase.auth) {
        await window.firebase.auth().sendPasswordResetEmail(resetModalUser.email.trim());
        setResetEmailStatus("✅ تم إرسال رابط إعادة التعيين بنجاح إلى إيميل الدارس: " + resetModalUser.email);
      } else {
        throw new Error("خدمة البريد غير مهيأة.");
      }
    } catch (e) {
      setResetEmailStatus("ℹ️ تنبيه: " + (e.message || "تعذر إرسال البريد التلقائي") + ". يمكنك تعيين كلمة المرور فوراً من الخيار أعلاه وإرسالها له بالواتساب.");
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // إنشاء حساب دارس معتمد يدوياً بواسطة المشرف
  var handleCreateManualUser = async function(e) {
    e.preventDefault();
    if (!window.db) return;
    setIsSavingManual(true);
    try {
      var cleanEmail = manualEmail.trim().toLowerCase();
      var cleanDocId = "user_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");

      var newUserData = {
        id: cleanDocId,
        fullName: manualFullName.trim(),
        email: cleanEmail,
        password: manualPassword.trim() || "123456",
        phone: manualWhatsapp.trim(),
        whatsapp: manualWhatsapp.trim(),
        studyType: manualStudyType,
        studyYear: manualStudyYear,
        church: manualChurch.trim() || "غير محدد",
        diocese: manualDiocese.trim() || "غير محدد",
        governorate: manualGov,
        role: "student",
        status: "approved", // معتمد فوراً بواسطة المشرف
        createdByAdmin: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await window.db.collection("users").doc(cleanDocId).set(newUserData, { merge: true });

      setUsers([newUserData].concat(users));
      alert("تم إنشاء حساب الدارس وتفعيله بنجاح! يمكنه تسجيل الدخول فوراً بالبريد وكلمة المرور.");
      setShowManualAddModal(false);
      setManualFullName("");
      setManualEmail("");
      setManualPassword("");
      setManualWhatsapp("");
      setManualChurch("");
      setManualDiocese("");
    } catch (err) {
      alert("خطأ: " + err.message);
    } finally {
      setIsSavingManual(false);
    }
  };

  var pendingUsers = users.filter(function(u) { return u.status === "pending"; });
  var approvedUsers = users.filter(function(u) { return u.status === "approved" && u.role !== "admin"; });
  var rejectedUsers = users.filter(function(u) { return u.status === "rejected"; });

  // حساب الدارسين النشطين والمتواجدين الآن (خلال آخر 5 دقائق)
  var onlineUsers = approvedUsers.filter(function(u) {
    var lastActiveDate = null;
    if (u.lastActiveAt && typeof u.lastActiveAt.toDate === "function") {
      lastActiveDate = u.lastActiveAt.toDate();
    } else if (u.lastActiveClient) {
      lastActiveDate = new Date(u.lastActiveClient);
    } else if (u.lastLoginAt && typeof u.lastLoginAt.toDate === "function") {
      lastActiveDate = u.lastLoginAt.toDate();
    }
    if (!lastActiveDate || isNaN(lastActiveDate.getTime())) return false;
    var diffMs = Date.now() - lastActiveDate.getTime();
    return diffMs <= 5 * 60 * 1000; // نشط خلال الـ 5 دقائق الماضية
  });

  var filteredUsers = users.filter(function(u) {
    if (activeFilter === "online") {
      return onlineUsers.some(function(ou) { return ou.id === u.id; });
    }
    if (activeFilter === "pending" && u.status !== "pending") return false;
    if (activeFilter === "approved" && (u.status !== "approved" || u.role === "admin")) return false;
    if (activeFilter === "rejected" && u.status !== "rejected") return false;
    
    if (searchQuery.trim()) {
      var q = searchQuery.trim().toLowerCase();
      var matchName = (u.fullName || "").toLowerCase().indexOf(q) !== -1;
      var matchEmail = (u.email || "").toLowerCase().indexOf(q) !== -1;
      var matchPhone = ((u.whatsapp || u.phone) || "").toLowerCase().indexOf(q) !== -1;
      var matchChurch = (u.church || "").toLowerCase().indexOf(q) !== -1;
      var matchDiocese = (u.diocese || "").toLowerCase().indexOf(q) !== -1;
      var matchGov = (u.governorate || "").toLowerCase().indexOf(q) !== -1;
      return matchName || matchEmail || matchPhone || matchChurch || matchDiocese || matchGov;
    }
    return true;
  });

  if (!currentUser || currentUser.role !== "admin") {
    return React.createElement(
      "div",
      { className: "p-12 text-center text-slate-500 space-y-3" },
      React.createElement("div", { className: "text-4xl" }, "🔒"),
      React.createElement("h3", { className: "text-base font-bold text-slate-800 dark:text-white" }, "هذه الصفحة مخصصة لمشرف المنصة فقط"),
      React.createElement("p", { className: "text-xs text-slate-400" }, "ليس لديك الصلاحيات الكافية لإدارة حسابات الدارسين.")
    );
  }

  return React.createElement(
    "div",
    { className: "space-y-6 pb-12 animate-in fade-in duration-300" },

    // ترويسة الصفحة والملخص
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" },
      React.createElement(
        "div",
        null,
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement("h2", { className: "text-lg font-bold text-slate-900 dark:text-white" }, "إدارة طلبات الانضمام واعتماد الدارسين"),
          pendingUsers.length > 0 && React.createElement("span", { className: "bg-rose-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full animate-pulse" },
            pendingUsers.length + " بانتظارك"
          )
        ),
        React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1" },
          "مراجعة بيانات الدارسين وكنائسهم وأبرشياتهم أو تفعيل حسابات فورية"
        )
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-2 flex-wrap" },
        React.createElement("button", {
          onClick: function() { setShowManualAddModal(true); },
          className: "text-xs px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-xs"
        },
          React.createElement("span", null, "➕"),
          React.createElement("span", null, "إضافة دارس معتمد فوراً")
        ),
        React.createElement("button", {
          onClick: fetchUsers,
          className: "text-xs px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all"
        }, "🔄")
      )
    ),

    // التبويبات الرئيسية: إدارة الطلبات مقابل سجل التتبع والدخول
    React.createElement(
      "div",
      { className: "flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2" },
      React.createElement(
        "button",
        {
          onClick: function() { setMainTab("approval"); },
          className: "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 " +
            (mainTab === "approval"
              ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800")
        },
        React.createElement("span", null, "👥"),
        React.createElement("span", null, "طلبات واعتماد الدارسين"),
        pendingUsers.length > 0 && React.createElement("span", { className: "bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black" }, pendingUsers.length)
      ),
      React.createElement(
        "button",
        {
          onClick: function() { setMainTab("analytics"); },
          className: "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 " +
            (mainTab === "analytics"
              ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800")
        },
        React.createElement("span", null, "📊"),
        React.createElement("span", null, "تحليلات وإحصائيات المذاكرة"),
        approvedUsers.length > 0 && React.createElement("span", { className: "bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold" }, approvedUsers.length)
      ),
      React.createElement(
        "button",
        {
          onClick: function() { setMainTab("tracking"); },
          className: "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 " +
            (mainTab === "tracking"
              ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800")
        },
        React.createElement("span", null, "🌍"),
        React.createElement("span", null, "سجل الدخول الجغرافي"),
        loginLogs.length > 0 && React.createElement("span", { className: "bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold" }, loginLogs.length)
      ),
      // زر التواجد الحي المباشر
      React.createElement(
        "button",
        {
          onClick: function() { setMainTab("approval"); setActiveFilter("online"); },
          className: "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 " +
            (mainTab === "approval" && activeFilter === "online"
              ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100")
        },
        React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" }),
        React.createElement("span", null, "النشطون الآن"),
        React.createElement("span", { className: "bg-emerald-700 text-white dark:bg-emerald-500 text-[10px] px-2 py-0.5 rounded-full font-black" }, onlineUsers.length)
      )
    ),

    // ==========================================
    // القسم الأول: طلبات الدارسين والاعتماد
    // ==========================================
    mainTab === "approval" && React.createElement(
      React.Fragment,
      null,

      // إحصائيات سريعة للطلبات والتواجد الحي
      React.createElement(
        "div",
        { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" },
        // بطاقة النشطين الآن
        React.createElement(
          "button",
          {
            onClick: function() { setActiveFilter("online"); },
            className: "p-4 rounded-2xl border text-right transition-all " +
              (activeFilter === "online"
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/30"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300")
          },
          React.createElement("div", { className: "flex items-center justify-between" },
            React.createElement("span", { className: "text-xs text-emerald-700 dark:text-emerald-400 block font-bold" }, "النشطون الآن 🟢"),
            onlineUsers.length > 0 && React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" })
          ),
          React.createElement("span", { className: "text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1" }, onlineUsers.length)
        ),
        React.createElement(
          "button",
          {
            onClick: function() { setActiveFilter("pending"); },
            className: "p-4 rounded-2xl border text-right transition-all " +
              (activeFilter === "pending"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300")
          },
          React.createElement("span", { className: "text-xs text-slate-500 block font-semibold" }, "بانتظار الموافقة"),
          React.createElement("span", { className: "text-2xl font-black text-amber-600 block mt-1" }, pendingUsers.length)
        ),
        React.createElement(
          "button",
          {
            onClick: function() { setActiveFilter("approved"); },
            className: "p-4 rounded-2xl border text-right transition-all " +
              (activeFilter === "approved"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300")
          },
          React.createElement("span", { className: "text-xs text-slate-500 block font-semibold" }, "الدارسون المعتمدون"),
          React.createElement("span", { className: "text-2xl font-black text-emerald-600 block mt-1" }, approvedUsers.length)
        ),
        React.createElement(
          "button",
          {
            onClick: function() { setActiveFilter("rejected"); },
            className: "p-4 rounded-2xl border text-right transition-all " +
              (activeFilter === "rejected"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300")
          },
          React.createElement("span", { className: "text-xs text-slate-500 block font-semibold" }, "المرفوض / المعلق"),
          React.createElement("span", { className: "text-2xl font-black text-rose-600 block mt-1" }, rejectedUsers.length)
        )
      )
    ),

    // شريط البحث والفلترة وقائمة الدارسين (تتبع تبويب الطلبات والاعتماد)
    mainTab === "approval" && React.createElement(
      React.Fragment,
      null,
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-2xs" },
        React.createElement("span", { className: "text-slate-400 text-sm" }, "🔍"),
        React.createElement("input", {
          type: "text",
          value: searchQuery,
          onChange: function(e) { setSearchQuery(e.target.value); },
          placeholder: "بحث باسم الدارس، الكنيسة، الإيبارشية، المحافظة، أو الإيميل...",
          className: "flex-1 bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
        }),
        searchQuery && React.createElement(
          "button",
          { onClick: function() { setSearchQuery(""); }, className: "text-xs text-slate-400 hover:text-slate-600 px-2" },
          "مسح"
        )
      ),

      isLoading ? React.createElement(
        "div",
        { className: "p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2" },
        React.createElement("span", { className: "animate-spin text-base" }, "⏳"),
        "جاري تحميل قائمة المستخدمين من السحابة..."
      ) : filteredUsers.length === 0 ? React.createElement(
        "div",
        { className: "p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 text-slate-400 text-xs" },
        React.createElement("div", { className: "text-3xl" }, "📭"),
        React.createElement("p", null, "لا توجد نتائج مطابقة في هذا القسم.")
      ) : React.createElement(
        "div",
        { className: "space-y-3" },
        filteredUsers.map(function(u) {
          var isPending = u.status === "pending";
          var isApproved = u.status === "approved";
          var isRejected = u.status === "rejected";

          return React.createElement(
            "div",
            {
              key: u.id,
              className: "bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border transition-all shadow-xs space-y-3 " +
                (isPending
                  ? "border-amber-300 dark:border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10"
                  : isApproved
                    ? "border-slate-200 dark:border-slate-800"
                    : "border-rose-200 dark:border-rose-900/40 opacity-75")
            },
            React.createElement(
              "div",
              { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3" },
              React.createElement(
                "div",
                { className: "space-y-1" },
                React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                  React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, u.fullName),
                  React.createElement("span", {
                    className: "text-[10px] font-black px-2.5 py-0.5 rounded-full " +
                      (isPending
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 animate-pulse"
                        : isApproved
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300")
                  }, isPending ? "⏳ بانتظار الاعتماد" : isApproved ? "✓ معتمد ونشط" : "✕ معلق / مرفوض"),
                  u.studyType && React.createElement("span", { className: "text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md" },
                    u.studyType === "أكاديمي" ? "🎓 أكاديمي" : "📖 ثقافي"
                  ),
                  u.studyYear && React.createElement("span", { className: "text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-md" },
                    u.studyYear
                  )
                ),
                React.createElement("div", { className: "text-xs text-slate-500 dark:text-slate-400 leading-relaxed space-y-1.5" },
                  React.createElement("p", null,
                    "كنيسة: " + (u.church || "—") +
                    " • إيبارشية: " + (u.diocese || "—") +
                    " • محافظة: " + (u.governorate || "—") +
                    " • البريد: " + (u.email || "—")
                  ),
                  (u.whatsapp || u.phone) && React.createElement(
                    "div",
                    { className: "flex items-center gap-2 pt-0.5" },
                    React.createElement(
                      "a",
                      {
                        href: "https://wa.me/" + String(u.whatsapp || u.phone).replace(/[^0-9]/g, "").replace(/^0/, "20"),
                        target: "_blank",
                        rel: "noopener noreferrer",
                        title: "فتح محادثة واتساب مباشرة مع الدارس",
                        className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-800/60 transition-all shadow-2xs hover:scale-105 active:scale-95"
                      },
                      React.createElement("span", null, "💬"),
                      React.createElement("span", null, "مراسلة واتساب:"),
                      React.createElement("span", { dir: "ltr", className: "underline font-mono" }, u.whatsapp || u.phone)
                    )
                  )
                )
              ),

              React.createElement(
                "div",
                { className: "flex items-center gap-2 shrink-0 self-end sm:self-center" },
                isPending && React.createElement(
                  "button",
                  {
                    onClick: function() { handleUpdateStatus(u.id, "approved"); },
                    className: "px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                  },
                  React.createElement("span", null, "✓"),
                  React.createElement("span", null, "قبول واعتماد")
                ),
                isPending && React.createElement(
                  "button",
                  {
                    onClick: function() { handleUpdateStatus(u.id, "rejected"); },
                    className: "px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold text-xs transition-all active:scale-95"
                  },
                  "رفض"
                ),
                isApproved && React.createElement(
                  "button",
                  {
                    onClick: function() {
                      if (confirm("هل تريد تعليق حساب الدارس '" + u.fullName + "' ومنعه من الدخول؟")) {
                        handleUpdateStatus(u.id, "rejected");
                      }
                    },
                    className: "text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                  },
                  "تعليق الحساب ⏸"
                ),
                isRejected && React.createElement(
                  "button",
                  {
                    onClick: function() { handleUpdateStatus(u.id, "approved"); },
                    className: "text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg font-bold transition-colors"
                  },
                  "إعادة التفعيل ✓"
                ),
                React.createElement(
                  "button",
                  {
                    onClick: function() { handleSendTestNotifToUser(u); },
                    disabled: sendingNotifUserId === u.id,
                    title: "إرسال إشعار تجريبي خاص لهذا الدارس فقط للتأكد من وصول الإشعارات له دون إزعاج باقي الدارسين",
                    className: "text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2.5 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 shadow-2xs border border-blue-200/60 dark:border-blue-900/40 disabled:opacity-50"
                  },
                  React.createElement("span", null, "🔔"),
                  React.createElement("span", null, sendingNotifUserId === u.id ? "جاري الإرسال..." : "إشعار تجريبي")
                ),
                React.createElement(
                  "button",
                  {
                    onClick: function() { handleOpenResetModal(u); },
                    title: "إعادة تعيين كلمة المرور لمساعدة الدارس",
                    className: "text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 px-2.5 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 shadow-2xs border border-amber-200/60 dark:border-amber-900/40"
                  },
                  React.createElement("span", null, "🔄"),
                  React.createElement("span", null, "إعادة تعيين كلمة المرور")
                ),
                React.createElement(
                  "button",
                  {
                    onClick: function() { handleDeleteUser(u.id, u.fullName); },
                    title: "حذف نهائي",
                    className: "text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                  },
                  "🗑️"
                )
              )
            ),

            (function() {
              var lastLoginDate = null;
              if (u.lastLoginAt && typeof u.lastLoginAt.toDate === "function") {
                lastLoginDate = u.lastLoginAt.toDate();
              } else if (u.lastLoginAt) {
                lastLoginDate = new Date(u.lastLoginAt);
              }

              var isOnlineNow = false;
              var lastSeenStr = "لم يسجل دخول بعد";
              if (lastLoginDate && !isNaN(lastLoginDate.getTime())) {
                var diffMs = Date.now() - lastLoginDate.getTime();
                var diffMins = Math.floor(diffMs / 60000);
                var diffHours = Math.floor(diffMins / 60);
                var diffDays = Math.floor(diffHours / 24);

                // يعتبر متصلاً الآن إذا كان آخر دخول له خلال الـ 15 دقيقة الماضية
                if (diffMins < 15) {
                  isOnlineNow = true;
                  lastSeenStr = "متواجد الآن 🟢";
                } else if (diffMins < 60) {
                  lastSeenStr = "منذ " + diffMins + " دقيقة";
                } else if (diffHours < 24) {
                  lastSeenStr = "منذ " + diffHours + " ساعة";
                } else if (diffDays === 1) {
                  lastSeenStr = "أمس";
                } else if (diffDays < 7) {
                  lastSeenStr = "منذ " + diffDays + " أيام";
                } else {
                  lastSeenStr = lastLoginDate.toLocaleDateString("ar-EG");
                }
              }

              return React.createElement(
                "div",
                { className: "flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 pt-1.5 gap-2 border-t border-slate-50 dark:border-slate-800/50" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-3 flex-wrap" },
                  // شارة التواجد والنشاط
                  React.createElement(
                    "span",
                    {
                      className: "px-2 py-0.5 rounded-md font-bold flex items-center gap-1.5 " +
                        (isOnlineNow
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          : lastLoginDate
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-slate-50 text-slate-400 dark:bg-slate-800/40")
                    },
                    React.createElement("span", { className: "w-2 h-2 rounded-full " + (isOnlineNow ? "bg-emerald-500 animate-ping" : lastLoginDate ? "bg-slate-400" : "bg-slate-300") }),
                    "آخر نشاط: " + lastSeenStr
                  ),
                  (u.totalMinutes > 0 || u.loginCount > 0) && React.createElement(
                    "span",
                    { className: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded-md font-bold flex items-center gap-1" },
                    "⏱️ " + (u.totalMinutes ? formatDuration(u.totalMinutes) : "أقل من دقيقة") +
                    " (" + (u.loginCount || 1) + " دخول)"
                  ),
                  u.lastLoginCountry && React.createElement(
                    "span",
                    { className: "text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1" },
                    "📍 " + u.lastLoginCountry + (u.lastDevice ? " (" + u.lastDevice + ")" : "")
                  ),
                  React.createElement("span", { className: "text-slate-400" },
                    "تاريخ التسجيل: " + (u.createdAt && u.createdAt.toDate ? u.createdAt.toDate().toLocaleDateString("ar-EG") : "حديثاً")
                  )
                ),
                React.createElement("span", { className: "font-mono text-[10px] text-slate-400 self-end sm:self-center" },
                  "معرف: " + u.id
                )
              );
            })()
          );
        })
      )
    ),

    // ==========================================
    // القسم الثاني: تحليلات نشاط وإحصائيات المذاكرة
    // ==========================================
    mainTab === "analytics" && (function() {
      // 1. حساب الإحصائيات التراكمية
      var totalMinutesSum = approvedUsers.reduce(function(acc, u) { return acc + (u.totalMinutes || 0); }, 0);
      var totalVisitsSum = approvedUsers.reduce(function(acc, u) { return acc + (u.loginCount || (u.lastLoginAt ? 1 : 0)); }, 0);
      var activeWithTime = approvedUsers.filter(function(u) { return (u.totalMinutes || 0) > 0 || (u.loginCount || 0) > 0; });
      var avgMinutes = activeWithTime.length > 0 ? Math.round(totalMinutesSum / activeWithTime.length) : 0;

      // 2. فرز وترتيب الدارسين حسب الاختيار
      var sortedUsers = approvedUsers.slice().sort(function(a, b) {
        if (analyticsSortBy === "minutes") {
          var minA = a.totalMinutes || 0;
          var minB = b.totalMinutes || 0;
          if (minB !== minA) return minB - minA;
          return (b.loginCount || 0) - (a.loginCount || 0);
        } else if (analyticsSortBy === "visits") {
          var vA = a.loginCount || (a.lastLoginAt ? 1 : 0);
          var vB = b.loginCount || (b.lastLoginAt ? 1 : 0);
          if (vB !== vA) return vB - vA;
          return (b.totalMinutes || 0) - (a.totalMinutes || 0);
        } else if (analyticsSortBy === "recent") {
          var tA = a.lastActiveAt && a.lastActiveAt.seconds ? a.lastActiveAt.seconds : (a.lastLoginAt && a.lastLoginAt.seconds ? a.lastLoginAt.seconds : 0);
          var tB = b.lastActiveAt && b.lastActiveAt.seconds ? b.lastActiveAt.seconds : (b.lastLoginAt && b.lastLoginAt.seconds ? b.lastLoginAt.seconds : 0);
          return tB - tA;
        } else if (analyticsSortBy === "name") {
          return (a.fullName || "").localeCompare(b.fullName || "", "ar");
        }
        return 0;
      });

      // 3. تطبيق الفلترة (بحث)
      var displayUsers = sortedUsers.filter(function(u) {
        if (analyticsSearchQuery.trim()) {
          var q = analyticsSearchQuery.trim().toLowerCase();
          var mName = (u.fullName || "").toLowerCase().indexOf(q) !== -1;
          var mChurch = (u.church || "").toLowerCase().indexOf(q) !== -1;
          var mDiocese = (u.diocese || "").toLowerCase().indexOf(q) !== -1;
          var mGov = (u.governorate || "").toLowerCase().indexOf(q) !== -1;
          var mEmail = (u.email || "").toLowerCase().indexOf(q) !== -1;
          return mName || mChurch || mDiocese || mGov || mEmail;
        }
        return true;
      });

      var maxMinutes = Math.max.apply(Math, approvedUsers.map(function(u) { return u.totalMinutes || 0; }).concat([1]));

      // أفضل 3 دارسين للوحة الشرف
      var topThree = sortedUsers.filter(function(u) { return (u.totalMinutes || 0) > 0 || (u.loginCount || 0) > 0; }).slice(0, 3);

      return React.createElement(
        "div",
        { className: "space-y-6 animate-in fade-in duration-200" },

        // بطاقات المؤشرات العامة (KPIs)
        React.createElement(
          "div",
          { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" },
          React.createElement(
            "div",
            { className: "bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-indigo-100 dark:border-indigo-950/60 shadow-xs space-y-1 relative overflow-hidden" },
            React.createElement("div", { className: "flex items-center justify-between text-indigo-600 dark:text-indigo-400" },
              React.createElement("span", { className: "text-xs font-bold" }, "إجمالي ساعات المذاكرة"),
              React.createElement("span", { className: "text-xl" }, "⏱️")
            ),
            React.createElement("span", { className: "text-xl sm:text-2xl font-black text-slate-900 dark:text-white block mt-1" },
              totalMinutesSum >= 60 ? (Math.floor(totalMinutesSum / 60) + " س و " + (totalMinutesSum % 60) + " د") : (totalMinutesSum + " دقيقة")
            ),
            React.createElement("p", { className: "text-[11px] text-slate-400" }, "الوقت التراكمي لكافة الدارسين")
          ),
          React.createElement(
            "div",
            { className: "bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-emerald-100 dark:border-emerald-950/60 shadow-xs space-y-1 relative overflow-hidden" },
            React.createElement("div", { className: "flex items-center justify-between text-emerald-600 dark:text-emerald-400" },
              React.createElement("span", { className: "text-xs font-bold" }, "إجمالي الزيارات والجلسات"),
              React.createElement("span", { className: "text-xl" }, "🔄")
            ),
            React.createElement("span", { className: "text-xl sm:text-2xl font-black text-slate-900 dark:text-white block mt-1" },
              totalVisitsSum + " جلسة"
            ),
            React.createElement("p", { className: "text-[11px] text-slate-400" }, "جلسات دراسية مسجلة")
          ),
          React.createElement(
            "div",
            { className: "bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-1 relative overflow-hidden" },
            React.createElement("div", { className: "flex items-center justify-between text-emerald-600 dark:text-emerald-400" },
              React.createElement("span", { className: "text-xs font-bold" }, "المتواجدون الآن 🟢"),
              onlineUsers.length > 0 && React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" })
            ),
            React.createElement("span", { className: "text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1" },
              onlineUsers.length + " دارس"
            ),
            React.createElement("p", { className: "text-[11px] text-slate-400" }, "نشطون في هذه اللحظة")
          ),
          React.createElement(
            "div",
            { className: "bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-amber-100 dark:border-amber-950/60 shadow-xs space-y-1 relative overflow-hidden" },
            React.createElement("div", { className: "flex items-center justify-between text-amber-600 dark:text-amber-400" },
              React.createElement("span", { className: "text-xs font-bold" }, "متوسط وقت الدارس"),
              React.createElement("span", { className: "text-xl" }, "📈")
            ),
            React.createElement("span", { className: "text-xl sm:text-2xl font-black text-slate-900 dark:text-white block mt-1" },
              formatDuration(avgMinutes)
            ),
            React.createElement("p", { className: "text-[11px] text-slate-400" }, "لكل دارس نشط بالمنصة")
          )
        ),

        // لوحة الشرف (Top 3 Podium)
        topThree.length > 0 && React.createElement(
          "div",
          { className: "bg-gradient-to-br from-amber-500/10 via-slate-50 to-indigo-500/10 dark:from-amber-950/20 dark:via-slate-900 dark:to-indigo-950/20 p-5 rounded-3xl border border-amber-200/60 dark:border-amber-900/40 space-y-4" },
          React.createElement(
            "div",
            { className: "flex items-center justify-between flex-wrap gap-2" },
            React.createElement("div", { className: "flex items-center gap-2" },
              React.createElement("span", { className: "text-2xl" }, "🏆"),
              React.createElement("h3", { className: "text-sm font-black text-slate-900 dark:text-white" }, "لوحة الشرف: الدارسون الأكثر نشاطاً والتزاماً"),
              React.createElement("span", { className: "text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full" }, "الأوائل")
            ),
            React.createElement("p", { className: "text-[11px] text-slate-500 dark:text-slate-400" }, "تكريم وتشجيع الدارسين الأكثر مكوثاً في المحاضرات والكتب")
          ),
          React.createElement(
            "div",
            { className: "grid grid-cols-1 md:grid-cols-3 gap-3" },
            topThree.map(function(u, idx) {
              var medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
              var medalTitle = idx === 0 ? "المركز الأول" : idx === 1 ? "المركز الثاني" : "المركز الثالث";
              var borderCls = idx === 0 ? "border-amber-400 dark:border-amber-500/60 bg-amber-50/50 dark:bg-amber-950/20" : idx === 1 ? "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" : "border-amber-700/40 dark:border-amber-800/40 bg-white dark:bg-slate-900";

              return React.createElement(
                "div",
                { key: u.id, className: "p-4 rounded-2xl border transition-all shadow-xs space-y-2 " + borderCls },
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between" },
                  React.createElement("span", { className: "text-xl font-black" }, medal),
                  React.createElement("span", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider" }, medalTitle)
                ),
                React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white truncate" }, u.fullName),
                React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 truncate" }, (u.church || "كنيسة غير محددة") + " • " + (u.diocese || "الإيبارشية")),
                React.createElement(
                  "div",
                  { className: "pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs" },
                  React.createElement("span", { className: "font-black text-indigo-600 dark:text-indigo-400" }, "⏱️ " + formatDuration(u.totalMinutes)),
                  React.createElement("span", { className: "text-slate-500 font-semibold" }, "🔄 " + (u.loginCount || 1) + " زيارة")
                )
              );
            })
          )
        ),

        // شريط أدوات الفرز والبحث
        React.createElement(
          "div",
          { className: "bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2.5 flex-1 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-2xl border border-slate-100 dark:border-slate-800" },
            React.createElement("span", { className: "text-slate-400 text-xs" }, "🔍"),
            React.createElement("input", {
              type: "text",
              value: analyticsSearchQuery,
              onChange: function(e) { setAnalyticsSearchQuery(e.target.value); },
              placeholder: "بحث باسم الدارس، الكنيسة، أو الإيبارشية...",
              className: "flex-1 bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            }),
            analyticsSearchQuery && React.createElement(
              "button",
              { onClick: function() { setAnalyticsSearchQuery(""); }, className: "text-xs text-slate-400 hover:text-slate-600" },
              "مسح"
            )
          ),
          React.createElement(
            "div",
            { className: "flex items-center gap-1.5 flex-wrap self-end md:self-center" },
            React.createElement("span", { className: "text-[11px] text-slate-400 font-bold ml-1" }, "ترتيب حسب:"),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setAnalyticsSortBy("minutes"); },
                className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " +
                  (analyticsSortBy === "minutes" ? "bg-indigo-600 text-white shadow-2xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200")
              },
              "⏱️ الأكثر وقتاً"
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setAnalyticsSortBy("visits"); },
                className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " +
                  (analyticsSortBy === "visits" ? "bg-emerald-600 text-white shadow-2xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200")
              },
              "🔄 الأكثر زيارة"
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setAnalyticsSortBy("recent"); },
                className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " +
                  (analyticsSortBy === "recent" ? "bg-slate-900 text-white dark:bg-slate-700 shadow-2xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200")
              },
              "🟢 الأحدث نشاطاً"
            )
          )
        ),

        // قائمة بطاقات الدارسين التحليلية الكاملة
        displayUsers.length === 0 ? React.createElement(
          "div",
          { className: "p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 text-slate-400 text-xs" },
          React.createElement("div", { className: "text-3xl" }, "📊"),
          React.createElement("p", null, "لا توجد نتائج تطابق خيارات البحث الحالية.")
        ) : React.createElement(
          "div",
          { className: "space-y-3" },
          displayUsers.map(function(u, idx) {
            var rank = idx + 1;
            var rankBadge = rank === 1 ? "🥇 #1" : rank === 2 ? "🥈 #2" : rank === 3 ? "🥉 #3" : ("#" + rank);
            var rankColor = rank === 1 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800" : rank === 2 ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700" : rank === 3 ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-400 border-amber-700/30" : "bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-slate-200 dark:border-slate-800";

            var progressPct = maxMinutes > 0 ? Math.min(100, Math.round(((u.totalMinutes || 0) / maxMinutes) * 100)) : 0;

            var lastActiveDate = null;
            if (u.lastActiveAt && typeof u.lastActiveAt.toDate === "function") lastActiveDate = u.lastActiveAt.toDate();
            else if (u.lastActiveClient) lastActiveDate = new Date(u.lastActiveClient);
            else if (u.lastLoginAt && typeof u.lastLoginAt.toDate === "function") lastActiveDate = u.lastLoginAt.toDate();

            var statusText = "لم يسجل دخول بعد";
            var isOnlineNow = false;
            if (lastActiveDate && !isNaN(lastActiveDate.getTime())) {
              var diffMs = Date.now() - lastActiveDate.getTime();
              var diffMins = Math.floor(diffMs / 60000);
              var diffHours = Math.floor(diffMins / 60);
              var diffDays = Math.floor(diffHours / 24);

              if (diffMins < 5) {
                isOnlineNow = true;
                statusText = "متواجد الآن 🟢";
              } else if (diffMins < 60) {
                statusText = "منذ " + diffMins + " دقيقة";
              } else if (diffHours < 24) {
                statusText = "منذ " + diffHours + " ساعة";
              } else if (diffDays === 1) {
                statusText = "أمس";
              } else if (diffDays < 7) {
                statusText = "منذ " + diffDays + " أيام";
              } else {
                statusText = "منقطع (" + diffDays + " يوم)";
              }
            }

            return React.createElement(
              "div",
              {
                key: u.id,
                className: "bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs space-y-3"
              },
              React.createElement(
                "div",
                { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" },
                React.createElement(
                  "div",
                  { className: "flex items-start sm:items-center gap-3" },
                  React.createElement(
                    "span",
                    { className: "px-2.5 py-1 rounded-xl text-xs font-black border shrink-0 font-mono " + rankColor },
                    rankBadge
                  ),
                  React.createElement(
                    "div",
                    { className: "space-y-1" },
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-2 flex-wrap" },
                      React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, u.fullName),
                      u.studyType && React.createElement("span", { className: "text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md" },
                        u.studyType === "أكاديمي" ? "🎓 أكاديمي" : "📖 ثقافي"
                      ),
                      u.studyYear && React.createElement("span", { className: "text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-md" },
                        u.studyYear
                      ),
                      React.createElement(
                        "span",
                        {
                          className: "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 " +
                            (isOnlineNow
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500")
                        },
                        isOnlineNow && React.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" }),
                        statusText
                      )
                    ),
                    React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400" },
                      (u.church || "كنيسة غير محددة") + " • " + (u.diocese || "الإيبارشية") + " • " + (u.governorate || "المحافظة")
                    )
                  )
                ),
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2 shrink-0 self-end sm:self-center" },
                  (u.whatsapp || u.phone) && React.createElement(
                    "a",
                    {
                      href: "https://wa.me/" + String(u.whatsapp || u.phone).replace(/[^0-9]/g, "").replace(/^0/, "20") + "?text=" + encodeURIComponent("سلام ونعمة يا د/ " + (u.fullName || "") + "، حابين نشجعك في دراسة المشورة ونتطمن على خطواتك في المنهج."),
                      target: "_blank",
                      rel: "noopener noreferrer",
                      title: "إرسال رسالة تشجيع ومتابعة على الواتساب",
                      className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-800/60 transition-all shadow-2xs"
                    },
                    React.createElement("span", null, "💬"),
                    React.createElement("span", null, "تشجيع واتساب")
                  ),
                  React.createElement(
                    "button",
                    {
                      onClick: function() { handleSendTestNotifToUser(u); },
                      disabled: sendingNotifUserId === u.id,
                      title: "إرسال إشعار مباشر لهذا الدارس",
                      className: "p-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 text-xs transition-colors"
                    },
                    "🔔"
                  )
                )
              ),

              React.createElement(
                "div",
                { className: "grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs" },
                React.createElement(
                  "div",
                  { className: "bg-indigo-50/60 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-950/40 space-y-0.5" },
                  React.createElement("span", { className: "text-[10px] text-indigo-700 dark:text-indigo-400 font-bold block" }, "إجمالي المذاكرة"),
                  React.createElement("span", { className: "text-sm font-black text-slate-900 dark:text-white" }, "⏱️ " + formatDuration(u.totalMinutes))
                ),
                React.createElement(
                  "div",
                  { className: "bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950/40 space-y-0.5" },
                  React.createElement("span", { className: "text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block" }, "مرات الدخول"),
                  React.createElement("span", { className: "text-sm font-black text-slate-900 dark:text-white" }, "🔄 " + (u.loginCount || (u.lastLoginAt ? 1 : 0)) + " زيارة")
                ),
                React.createElement(
                  "div",
                  { className: "bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-0.5" },
                  React.createElement("span", { className: "text-[10px] text-slate-500 dark:text-slate-400 font-bold block" }, "مدة آخر جلسة"),
                  React.createElement("span", { className: "text-sm font-bold text-slate-700 dark:text-slate-300" }, (u.lastSessionMinutes ? (u.lastSessionMinutes + " دقيقة") : "—"))
                ),
                React.createElement(
                  "div",
                  { className: "bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-0.5" },
                  React.createElement("span", { className: "text-[10px] text-slate-500 dark:text-slate-400 font-bold block" }, "الجهاز وموقع الدخول"),
                  React.createElement("span", { className: "text-xs font-semibold text-slate-600 dark:text-slate-300 truncate block", title: u.lastLoginCountry || "" },
                    (u.lastDevice ? (u.lastDevice + " • ") : "") + (u.lastLoginCountry || "—")
                  )
                )
              ),

              React.createElement(
                "div",
                { className: "space-y-1 pt-1" },
                React.createElement(
                  "div",
                  { className: "flex justify-between text-[10px] text-slate-400 font-mono" },
                  React.createElement("span", null, "نسبة النشاط مقارنة بالمتصدر"),
                  React.createElement("span", null, progressPct + "%")
                ),
                React.createElement(
                  "div",
                  { className: "w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden" },
                  React.createElement("div", {
                    className: "h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500",
                    style: { width: Math.max(progressPct, 3) + "%" }
                  })
                )
              )
            );
          })
        )
      );
    })(),

    // ==========================================
    // القسم الثالث: سجل الدخول الجغرافي والـ IP
    // ==========================================
    mainTab === "tracking" && React.createElement(
      "div",
      { className: "space-y-4 animate-in fade-in duration-200" },

      // بطاقة شريط أدوات التتبع والتفريغ
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs" },
        React.createElement(
          "div",
          null,
          React.createElement("h3", { className: "text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2" },
            React.createElement("span", null, "🌍"),
            "سجل الدخول الجغرافي ونشاط الدارسين"
          ),
          React.createElement("p", { className: "text-[11px] text-slate-500 dark:text-slate-400 mt-0.5" },
            "يتتبع الدولة، المدينة، الـ IP، ونوع الجهاز عند تسجيل أو فتح كل دارس للمنصة."
          )
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2 shrink-0 flex-wrap" },
          React.createElement(
            "button",
            {
              onClick: fetchLoginLogs,
              disabled: isLoadingLogs,
              className: "px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5"
            },
            React.createElement("span", null, "🔄"),
            React.createElement("span", null, isLoadingLogs ? "جاري التحديث..." : "تحديث السجل")
          ),
          React.createElement(
            "button",
            {
              onClick: handleClearLogs,
              disabled: isClearingLogs || loginLogs.length === 0,
              className: "px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            },
            React.createElement("span", null, "🗑️"),
            React.createElement("span", null, isClearingLogs ? "جاري المسح..." : "تفريغ السجل القديم")
          )
        )
      ),

      // شريط بحث وأزرار تصفية السجل (الدارسون فقط / الكل)
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs" },
        React.createElement(
          "div",
          { className: "flex items-center gap-2.5 flex-1" },
          React.createElement("span", { className: "text-slate-400 text-xs" }, "🔍"),
          React.createElement("input", {
            type: "text",
            value: logSearchQuery,
            onChange: function(e) { setLogSearchQuery(e.target.value); },
            placeholder: "تصفية السجل باسم الدارس، الدولة، المدينة، أو الـ IP...",
            className: "flex-1 bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          }),
          logSearchQuery && React.createElement(
            "button",
            { onClick: function() { setLogSearchQuery(""); }, className: "text-xs text-slate-400 hover:text-slate-600 px-2" },
            "مسح"
          )
        ),
        // أزرار فرز المشرف مقابل الدارسين
        React.createElement(
          "div",
          { className: "flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end sm:self-center shrink-0 text-xs" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setLogFilterType("students_only"); },
              className: "px-3 py-1 rounded-lg font-bold transition-all " +
                (logFilterType === "students_only" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs" : "text-slate-500 hover:text-slate-800")
            },
            "👥 الدارسين فقط"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setLogFilterType("all"); },
              className: "px-3 py-1 rounded-lg font-bold transition-all " +
                (logFilterType === "all" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs" : "text-slate-500 hover:text-slate-800")
            },
            "الكل (" + loginLogs.length + ")"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setLogFilterType("admin_only"); },
              className: "px-3 py-1 rounded-lg font-bold transition-all " +
                (logFilterType === "admin_only" ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs" : "text-slate-500 hover:text-slate-800")
            },
            "🛡️ المشرف"
          )
        )
      ),

      // عرض السجلات
      isLoadingLogs ? React.createElement(
        "div",
        { className: "p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2" },
        React.createElement("span", { className: "animate-spin text-base" }, "⏳"),
        "جاري جلب سجل النشاط من السحابة..."
      ) : (function() {
        var filteredLogs = loginLogs.filter(function(log) {
          // تصفية حسب الرتبة (المشرف / الدارسين)
          var isAdminLog = log.role === "admin" || (log.email || "").toLowerCase().indexOf("eng.naderkamel") !== -1;
          if (logFilterType === "students_only" && isAdminLog) return false;
          if (logFilterType === "admin_only" && !isAdminLog) return false;

          if (!logSearchQuery.trim()) return true;
          var q = logSearchQuery.trim().toLowerCase();
          var mName = (log.fullName || "").toLowerCase().indexOf(q) !== -1;
          var mEmail = (log.email || "").toLowerCase().indexOf(q) !== -1;
          var mCountry = (log.country || "").toLowerCase().indexOf(q) !== -1;
          var mCity = (log.city || "").toLowerCase().indexOf(q) !== -1;
          var mRegion = (log.region || "").toLowerCase().indexOf(q) !== -1;
          var mIp = (log.ip || "").toLowerCase().indexOf(q) !== -1;
          return mName || mEmail || mCountry || mCity || mRegion || mIp;
        });

        if (filteredLogs.length === 0) {
          return React.createElement(
            "div",
            { className: "p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 text-slate-400 text-xs" },
            React.createElement("div", { className: "text-3xl" }, "🌐"),
            React.createElement("p", null, logFilterType === "students_only" ? "لا توجد سجلات دخول للدارسين بعد." : "لا توجد سجلات تطابق بحثك.")
          );
        }

        return React.createElement(
          "div",
          { className: "space-y-2.5" },
          filteredLogs.map(function(item) {
            var timeFormatted = "الآن";
            try {
              if (item.timestamp && item.timestamp.toDate) {
                timeFormatted = item.timestamp.toDate().toLocaleString("ar-EG");
              } else if (item.createdAtClient) {
                timeFormatted = new Date(item.createdAtClient).toLocaleString("ar-EG");
              }
            } catch (e) {}

            var isEgypt = (item.countryCode === "EG" || (item.country || "").indexOf("Egypt") !== -1 || (item.country || "").indexOf("مصر") !== -1);

            return React.createElement(
              "div",
              {
                key: item.id,
                className: "bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
              },
              React.createElement(
                "div",
                { className: "space-y-1" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2 flex-wrap" },
                  React.createElement("span", { className: "font-bold text-xs text-slate-900 dark:text-white" }, item.fullName),
                  React.createElement("span", { className: "text-[11px] text-slate-400 font-mono" }, "(" + item.email + ")"),
                  item.role === "admin" && React.createElement("span", { className: "text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold" }, "مشرف")
                ),
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap pt-0.5" },
                  React.createElement(
                    "span",
                    { className: "font-semibold flex items-center gap-1 " + (isEgypt ? "text-slate-700 dark:text-slate-300" : "text-amber-600 dark:text-amber-400 font-bold") },
                    React.createElement("span", null, isEgypt ? "🇪🇬" : "🌍"),
                    (function() {
                      var locParts = [];
                      if (item.country && item.country !== "غير محدد") locParts.push(item.country);
                      if (item.region && item.region !== "غير محدد" && locParts.indexOf(item.region) === -1) locParts.push(item.region);
                      if (item.city && item.city !== "غير محدد" && locParts.indexOf(item.city) === -1) locParts.push(item.city);
                      return locParts.length > 0 ? locParts.join(" - ") : "مكان غير محدد";
                    })()
                  ),
                  React.createElement("span", { className: "text-slate-300 dark:text-slate-700" }, "•"),
                  React.createElement("span", { className: "font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300" }, "IP: " + (item.ip || "—")),
                  React.createElement("span", { className: "text-slate-300 dark:text-slate-700" }, "•"),
                  React.createElement("span", null, item.device || "جهاز غير محدد")
                )
              ),
              React.createElement(
                "div",
                { className: "shrink-0 self-end sm:self-center text-left text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl font-mono" },
                timeFormatted
              )
            );
          })
        );
      })()
    ),

    // نافذة منبثقة لإضافة وتفعيل دارس يدوياً
    showManualAddModal && React.createElement(
      "div",
      { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b pb-3" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "➕ إضافة دارس معتمد فوراً"),
          React.createElement("button", { onClick: function() { setShowManualAddModal(false); }, className: "text-slate-400 hover:text-slate-600" }, "✕")
        ),

        React.createElement(
          "form",
          { onSubmit: handleCreateManualUser, className: "space-y-3" },
          React.createElement("div", { className: "grid grid-cols-2 gap-2" },
            React.createElement("div", null,
              React.createElement("label", { className: "block text-xs font-bold mb-1" }, "الاسم بالكامل *"),
              React.createElement("input", {
                type: "text",
                required: true,
                value: manualFullName,
                onChange: function(e) { setManualFullName(e.target.value); },
                placeholder: "اسم الدارس...",
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              })
            ),
            React.createElement("div", null,
              React.createElement("label", { className: "block text-xs font-bold mb-1 flex items-center gap-1" },
                React.createElement("span", null, "💬"),
                React.createElement("span", null, "رقم الواتساب")
              ),
              React.createElement("input", {
                type: "tel",
                value: manualWhatsapp,
                onChange: function(e) { setManualWhatsapp(e.target.value); },
                placeholder: "01xxxxxxxxx",
                dir: "ltr",
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs text-right"
              })
            )
          ),
          React.createElement("div", { className: "grid grid-cols-2 gap-2" },
            React.createElement("div", null,
              React.createElement("label", { className: "block text-xs font-bold mb-1" }, "البريد الإلكتروني *"),
              React.createElement("input", {
                type: "email",
                required: true,
                value: manualEmail,
                onChange: function(e) { setManualEmail(e.target.value); },
                placeholder: "email@example.com",
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              })
            ),
            React.createElement("div", null,
              React.createElement("label", { className: "block text-xs font-bold mb-1" }, "كلمة المرور *"),
              React.createElement("input", {
                type: "text",
                required: true,
                value: manualPassword,
                onChange: function(e) { setManualPassword(e.target.value); },
                placeholder: "123456",
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              })
            )
          ),
          React.createElement("div", { className: "grid grid-cols-2 gap-2" },
            React.createElement("div", null,
              React.createElement("label", { className: "block text-xs font-bold mb-1" }, "نوع الدراسة"),
              React.createElement("select", {
                value: manualStudyType,
                onChange: function(e) { setManualStudyType(e.target.value); },
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              },
                React.createElement("option", { value: "أكاديمي" }, "أكاديمي"),
                React.createElement("option", { value: "ثقافي" }, "ثقافي")
              )
            ),
            React.createElement("div", null,
              React.createElement("label", { className: "block text-xs font-bold mb-1" }, "السنة الدراسية"),
              React.createElement("select", {
                value: manualStudyYear,
                onChange: function(e) { setManualStudyYear(e.target.value); },
                className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              },
                React.createElement("option", { value: "السنة الأولى" }, "السنة الأولى"),
                React.createElement("option", { value: "السنة الثانية" }, "السنة الثانية"),
                React.createElement("option", { value: "السنة الثالثة" }, "السنة الثالثة"),
                React.createElement("option", { value: "السنة الرابعة" }, "السنة الرابعة"),
                React.createElement("option", { value: "خريج / متابع عام" }, "خريج / متابع عام")
              )
            )
          ),
          React.createElement("div", { className: "grid grid-cols-3 gap-2" },
            React.createElement("div", null,
              React.createElement("label", { className: "block text-xs font-bold mb-1" }, "الكنيسة"),
              React.createElement("input", {
                type: "text",
                value: manualChurch,
                onChange: function(e) { setManualChurch(e.target.value); },
                placeholder: "الكنيسة...",
                className: "w-full px-2 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              })
            ),
            React.createElement("div", null,
              React.createElement("label", { className: "block text-xs font-bold mb-1" }, "الإيبارشية"),
              React.createElement("input", {
                type: "text",
                value: manualDiocese,
                onChange: function(e) { setManualDiocese(e.target.value); },
                placeholder: "الإيبارشية...",
                className: "w-full px-2 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              })
            ),
            React.createElement("div", null,
              React.createElement("label", { className: "block text-xs font-bold mb-1" }, "المحافظة"),
              React.createElement("select", {
                value: manualGov,
                onChange: function(e) { setManualGov(e.target.value); },
                className: "w-full px-2 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              }, governoratesList.map(function(g) { return React.createElement("option", { key: g, value: g }, g); }))
            )
          ),
          React.createElement("button", {
            type: "submit",
            disabled: isSavingManual,
            className: "w-full py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs shadow-md mt-2"
          }, isSavingManual ? "جاري الإضافة..." : "إضافة وتفعيل الحساب فوراً ✓")
        )
      )
    ),

    // نافذة إعادة تعيين كلمة المرور الآمنة لمساعدة الدارس
    resetModalUser && React.createElement(
      "div",
      {
        className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto",
        onClick: function(e) { if (e.target === e.currentTarget) setResetModalUser(null); }
      },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-auto" },

        React.createElement(
          "div",
          { className: "flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3" },
          React.createElement(
            "div",
            null,
            React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white flex items-center gap-2" },
              React.createElement("span", null, "🔄"),
              React.createElement("span", null, "إعادة تعيين كلمة المرور")
            ),
            React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5" },
              "الدارس: " + (resetModalUser.fullName || "") + " • " + (resetModalUser.email || "")
            )
          ),
          React.createElement("button", { onClick: function() { setResetModalUser(null); }, className: "text-slate-400 hover:text-slate-600 text-sm p-1" }, "✕")
        ),

        // تنبيه الأمان والخصوصية
        React.createElement(
          "div",
          { className: "p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed flex items-start gap-2" },
          React.createElement("span", { className: "text-base shrink-0" }, "🛡️"),
          React.createElement("div", null,
            React.createElement("strong", { className: "block font-bold mb-0.5" }, "حماية الخصوصية والأمان:"),
            React.createElement("span", null, "كلمة المرور الحالية للدارس مشفرة بالكامل ومحمية للحفاظ على خصوصيته. يمكنك فقط تعيين كلمة مرور جديدة لمساعدته.")
          )
        ),

        // في حال تم تعيين كلمة المرور بنجاح
        resetSuccessData ? React.createElement(
          "div",
          { className: "space-y-4 pt-1" },
          React.createElement(
            "div",
            { className: "p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2" },
            React.createElement("div", { className: "text-2xl" }, "✅"),
            React.createElement("h4", { className: "text-sm font-bold text-emerald-800 dark:text-emerald-300" }, "تم تعيين كلمة المرور الجديدة بنجاح!"),
            React.createElement("div", { className: "p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 font-mono text-base font-bold text-slate-900 dark:text-white select-all inline-block px-4 shadow-xs" },
              resetSuccessData.newPass
            ),
            React.createElement("p", { className: "text-[11px] text-slate-500 dark:text-slate-400" },
              "يمكن للدارس الآن تسجيل الدخول مباشرة بهذه الكلمة."
            )
          ),

          React.createElement(
            "div",
            { className: "space-y-2" },
            (resetModalUser.whatsapp || resetModalUser.phone) && React.createElement(
              "a",
              {
                href: "https://wa.me/" + String(resetModalUser.whatsapp || resetModalUser.phone).replace(/[^0-9]/g, "").replace(/^0/, "20") + "?text=" + encodeURIComponent("سلام ومحبة يا أ/ " + resetModalUser.fullName + "،\n\nتم تعيين كلمة مرور جديدة لحسابك في منصة معهد المشورة:\n📧 البريد: " + resetModalUser.email + "\n🔑 كلمة المرور الجديدة: " + resetSuccessData.newPass + "\n\nرابط تسجيل الدخول:\n" + window.location.origin + window.location.pathname),
                target: "_blank",
                rel: "noopener noreferrer",
                className: "w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
              },
              React.createElement("span", null, "💬"),
              React.createElement("span", null, "إرسال كلمة المرور للدارس عبر واتساب")
            ),
            React.createElement(
              "a",
              {
                href: "mailto:" + resetModalUser.email + "?subject=" + encodeURIComponent("كلمة المرور الجديدة لحسابك - منصة المشورة") + "&body=" + encodeURIComponent("مرحباً " + resetModalUser.fullName + "،\n\nتم تعيين كلمة مرور جديدة لحسابك:\nالبريد: " + resetModalUser.email + "\nكلمة المرور: " + resetSuccessData.newPass),
                className: "w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              },
              React.createElement("span", null, "✉️"),
              React.createElement("span", null, "إرسال إيميل للدارس")
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() {
                  navigator.clipboard.writeText(resetSuccessData.newPass);
                  alert("تم نسخ كلمة المرور الجديدة إلى الحافظة! ✓");
                },
                className: "w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
              },
              "📋 نسخ كلمة المرور"
            )
          ),

          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setResetModalUser(null); },
              className: "w-full py-2 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 text-xs font-bold"
            },
            "إغلاق"
          )
        ) : React.createElement(
          "form",
          { onSubmit: handleConfirmResetPassword, className: "space-y-4 pt-1" },
          React.createElement(
            "div",
            null,
            React.createElement("div", { className: "flex items-center justify-between mb-1" },
              React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300" }, "كلمة المرور الجديدة:"),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { setResetNewPassword(generateEasyPassword()); },
                  className: "text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1 hover:underline"
                },
                React.createElement("span", null, "🎲"),
                React.createElement("span", null, "توليد كلمة سهلة")
              )
            ),
            React.createElement("input", {
              type: "text",
              required: true,
              value: resetNewPassword,
              onChange: function(e) { setResetNewPassword(e.target.value); },
              placeholder: "أدخل كلمة المرور الجديدة...",
              className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
            }),
            React.createElement("p", { className: "text-[11px] text-slate-400 mt-1" },
              "💡 يمكنك ترك الكلمة المولدة تلقائياً أو كتابة كلمة مخصصة للدارس."
            )
          ),

          React.createElement(
            "button",
            {
              type: "submit",
              disabled: isResettingPassword,
              className: "w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            },
            isResettingPassword ? "جاري الحفظ..." : "حفظ وتعيين كلمة المرور الجديدة ✓"
          ),

          React.createElement(
            "div",
            { className: "relative my-3" },
            React.createElement("div", { className: "absolute inset-0 flex items-center" },
              React.createElement("div", { className: "w-full border-t border-slate-200 dark:border-slate-800" })
            ),
            React.createElement("div", { className: "relative flex justify-center text-[10px] uppercase" },
              React.createElement("span", { className: "bg-white dark:bg-slate-900 px-2 text-slate-400 font-bold" }, "أو للدارسين القادرين على فتح الإيميل")
            )
          ),

          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleSendEmailReset,
              disabled: isSendingResetEmail,
              className: "w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            },
            React.createElement("span", null, "📧"),
            React.createElement("span", null, isSendingResetEmail ? "جاري الإرسال..." : "إرسال رابط استعادة إلى إيميل الدارس")
          ),

          resetEmailStatus && React.createElement(
            "div",
            { className: "p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed" },
            resetEmailStatus
          )
        )
      )
    )
  );
};
