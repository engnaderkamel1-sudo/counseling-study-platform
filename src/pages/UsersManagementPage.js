// شاشة إدارة طلبات المستخدمين واعتماد الدارسين وأكواد التخطي السريع (خاصة بالمشرف فقط)
window.UsersManagementPage = function(props) {
  var currentUser = props.currentUser;
  var [users, setUsers] = React.useState([]);
  var [isLoading, setIsLoading] = React.useState(true);
  var [searchQuery, setSearchQuery] = React.useState("");
  var [activeFilter, setActiveFilter] = React.useState("pending"); // "pending", "approved", "rejected", "all"

  // إعدادات كود التخطي والقائمة البيضاء
  var [bypassCode, setBypassCode] = React.useState("counsel2026");
  var [whitelistedEmails, setWhitelistedEmails] = React.useState([]);
  var [newWhitelistEmail, setNewWhitelistEmail] = React.useState("");
  var [showBypassSettings, setShowBypassSettings] = React.useState(false);
  var [isSavingSettings, setIsSavingSettings] = React.useState(false);

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

  var governoratesList = [
    "القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "الدقهلية",
    "الشرقية", "المنوفية", "الغربية", "كفر الشيخ", "دمياط",
    "بورسعيد", "الإسماعيلية", "السويس", "البحيرة", "بني سويف",
    "الفيوم", "المنيا", "أسيوط", "سوهاج", "قنا",
    "الأقصر", "أسوان", "البحر الأحمر", "الوادي الجديد", "مطروح",
    "شمال سيناء", "جنوب سيناء", "خارج مصر / مقيم بالخارج"
  ];

  var fetchUsers = async function() {
    if (!window.db) return;
    setIsLoading(true);
    try {
      var snap = await window.db.collection("users").get();
      var list = [];
      snap.forEach(function(doc) {
        list.push(Object.assign({ id: doc.id }, doc.data()));
      });
      list.sort(function(a, b) {
        var tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
        var tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
        return tB - tA;
      });
      setUsers(list);

      // جلب إعدادات التخطي
      var confDoc = await window.db.collection("system_settings").doc("auth_config").get();
      if (confDoc.exists) {
        var d = confDoc.data();
        if (d.bypassCode) setBypassCode(d.bypassCode);
        if (Array.isArray(d.whitelistedEmails)) setWhitelistedEmails(d.whitelistedEmails);
      }
    } catch (e) {
      console.error("Error fetching users:", e);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(function() {
    fetchUsers();
  }, []);

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

  var handleResetUserPassword = async function(userId, userName, currentPass) {
    var newPass = prompt("أدخل كلمة المرور الجديدة لحساب '" + userName + "':", currentPass || "");
    if (!newPass || !newPass.trim()) return;
    if (newPass.trim().length < 4) {
      alert("كلمة المرور يجب ألا تقل عن 4 خانات.");
      return;
    }
    if (!window.db) return;
    try {
      await window.db.collection("users").doc(userId).update({
        password: newPass.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setUsers(users.map(function(u) {
        if (u.id === userId) {
          return Object.assign({}, u, { password: newPass.trim() });
        }
        return u;
      }));
      alert("تم تحديث كلمة المرور لحساب '" + userName + "' بنجاح! ✓");
    } catch (e) {
      alert("حدث خطأ أثناء تعديل كلمة المرور: " + e.message);
    }
  };

  // حفظ كود التخطي والقائمة البيضاء
  var handleSaveBypassSettings = async function() {
    if (!window.db) return;
    setIsSavingSettings(true);
    try {
      await window.db.collection("system_settings").doc("auth_config").set({
        bypassCode: bypassCode.trim(),
        whitelistedEmails: whitelistedEmails,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      alert("تم حفظ إعدادات كود التخطي والقائمة البيضاء بنجاح! ✓");
      setShowBypassSettings(false);
    } catch (err) {
      alert("خطأ أثناء حفظ الإعدادات: " + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  var handleAddWhitelistEmail = function(e) {
    e.preventDefault();
    var em = newWhitelistEmail.trim().toLowerCase();
    if (!em) return;
    if (whitelistedEmails.indexOf(em) !== -1) {
      alert("هذا البريد موجود بالقائمة بالفعل.");
      return;
    }
    setWhitelistedEmails([em].concat(whitelistedEmails));
    setNewWhitelistEmail("");
  };

  var handleRemoveWhitelistEmail = function(em) {
    setWhitelistedEmails(whitelistedEmails.filter(function(x) { return x !== em; }));
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
        bypassed: true,
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

  var filteredUsers = users.filter(function(u) {
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
          onClick: function() { setShowBypassSettings(!showBypassSettings); },
          className: "text-xs px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-100 transition-all flex items-center gap-1.5 shadow-2xs"
        },
          React.createElement("span", null, "⚡"),
          React.createElement("span", null, "إعدادات كود التخطي (Bypass)")
        ),
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

    // لوحة إعدادات التخطي المباشر (Bypass & Whitelist)
    showBypassSettings && React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-amber-400/80 dark:border-amber-500/50 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-150" },
      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b pb-3" },
        React.createElement("div", null,
          React.createElement("h3", { className: "text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2" },
            React.createElement("span", null, "⚡"),
            "خيارات تخطي المراجعة والاعتماد الفوري (Bypass Approval)"
          ),
          React.createElement("p", { className: "text-xs text-slate-500 mt-0.5" },
            "يمكنك إعطاء كود موحد لأشخاص تثق بهم ليُعتمد حسابهم تلقائياً، أو إضافة إيميلات محددة مسبقاً."
          )
        ),
        React.createElement("button", { onClick: function() { setShowBypassSettings(false); }, className: "text-slate-400 hover:text-slate-600" }, "✕")
      ),

      React.createElement(
        "div",
        { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
        // 1. كود التخطي الموحد
        React.createElement(
          "div",
          { className: "p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2" },
          React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200" }, "كود التفعيل الفوري (Bypass Code)"),
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement("input", {
              type: "text",
              value: bypassCode,
              onChange: function(e) { setBypassCode(e.target.value); },
              placeholder: "مثال: counsel2026",
              className: "flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
            }),
            React.createElement("button", {
              type: "button",
              onClick: function() {
                navigator.clipboard.writeText(bypassCode);
                alert("تم نسخ الكود: " + bypassCode);
              },
              className: "px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-semibold"
            }, "نسخ 📋")
          ),
          React.createElement("p", { className: "text-[11px] text-slate-400" }, "أي شخص يكتب هذا الكود في خانة كود الاعتماد الفوري أثناء التسجيل يدخل للمنصة فوراً دون انتظار.")
        ),

        // 2. القائمة البيضاء للإيميلات المعتمدة مسبقاً
        React.createElement(
          "div",
          { className: "p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2" },
          React.createElement("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200" }, "القائمة البيضاء للإيميلات (Pre-approved Emails)"),
          React.createElement(
            "form",
            { onSubmit: handleAddWhitelistEmail, className: "flex items-center gap-2" },
            React.createElement("input", {
              type: "email",
              value: newWhitelistEmail,
              onChange: function(e) { setNewWhitelistEmail(e.target.value); },
              placeholder: "user@example.com",
              className: "flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
            }),
            React.createElement("button", {
              type: "submit",
              className: "px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            }, "إضافة +")
          ),
          whitelistedEmails.length > 0 ? React.createElement(
            "div",
            { className: "flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1" },
            whitelistedEmails.map(function(em) {
              return React.createElement(
                "span",
                { key: em, className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-900 border text-[11px] font-mono" },
                em,
                React.createElement("button", {
                  type: "button",
                  onClick: function() { handleRemoveWhitelistEmail(em); },
                  className: "text-rose-500 hover:text-rose-700 font-bold mr-1"
                }, "✕")
              );
            })
          ) : React.createElement("p", { className: "text-[11px] text-slate-400" }, "لا توجد إيميلات بالقائمة حالياً.")
        )
      ),

      React.createElement(
        "div",
        { className: "flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800" },
        React.createElement("button", {
          onClick: handleSaveBypassSettings,
          disabled: isSavingSettings,
          className: "px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all"
        }, isSavingSettings ? "جاري الحفظ..." : "حفظ إعدادات التخطي السحابية ✓")
      )
    ),

    // إحصائيات سريعة للطلبات
    React.createElement(
      "div",
      { className: "grid grid-cols-3 gap-3" },
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
    ),

    // شريط البحث والفلترة
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

    // قائمة المستخدمين
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
          // السطر العلوي: اسم الدارس + الشارات + أزرار الإجراء
          React.createElement(
            "div",
            { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3" },
            React.createElement(
              "div",
              { className: "space-y-1" },
              React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, u.fullName),
                // شارة الحالة
                React.createElement("span", {
                  className: "text-[10px] font-black px-2.5 py-0.5 rounded-full " +
                    (isPending
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 animate-pulse"
                      : isApproved
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300")
                }, isPending ? "⏳ بانتظار الاعتماد" : isApproved ? "✓ معتمد ونشط" : "✕ معلق / مرفوض"),
                
                // شارة الاعتماد السريع إذا وجد
                u.bypassed && React.createElement("span", { className: "text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold px-2 py-0.5 rounded-md" },
                  "⚡ تخطي سريع"
                ),
                // شارة نوع الدراسة
                u.studyType && React.createElement("span", { className: "text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md" },
                  u.studyType === "أكاديمي" ? "🎓 أكاديمي" : "📖 ثقافي"
                ),
                // شارة السنة
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

            // أزرار اتخاذ القرار
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
                  onClick: function() { handleResetUserPassword(u.id, u.fullName, u.password); },
                  title: "تعديل كلمة المرور",
                  className: "text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 px-2 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1"
                },
                React.createElement("span", null, "🔑"),
                React.createElement("span", { className: "hidden sm:inline" }, "كلمة المرور")
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

          // تفاصيل إضافية
          React.createElement(
            "div",
            { className: "flex items-center justify-between text-[11px] text-slate-400 pt-1" },
            React.createElement("span", null,
              "تاريخ التسجيل: " + (u.createdAt && u.createdAt.toDate ? u.createdAt.toDate().toLocaleDateString("ar-EG") : "حديثاً")
            ),
            React.createElement("span", { className: "font-mono text-[10px]" },
              "معرف: " + u.id
            )
          )
        );
      })
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
    )
  );
};
