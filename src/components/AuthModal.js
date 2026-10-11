// نافذة وشاشة تسجيل الدخول وبوابة اعتماد الدارسين
window.AuthModal = function(props) {
  var isOpen = props.isOpen;
  var isBlocking = props.isBlocking; // عند الدخول الأول للمنصة بدون تسجيل
  var onClose = props.onClose;
  var onLoginSuccess = props.onLoginSuccess;

  var MASTER_ADMIN_EMAIL = "eng.naderkamel@gmail.com";

  var [isLogin, setIsLogin] = React.useState(true);
  
  // حقول الدخول
  var [loginIdentifier, setLoginIdentifier] = React.useState("");
  var [loginPassword, setLoginPassword] = React.useState("");
  var [showLoginPassword, setShowLoginPassword] = React.useState(false);

  // حقول التسجيل الجديد
  var [fullName, setFullName] = React.useState("");
  var [email, setEmail] = React.useState("");
  var [password, setPassword] = React.useState("");
  var [showPassword, setShowPassword] = React.useState(false);
  var [phone, setPhone] = React.useState("");
  var [studyType, setStudyType] = React.useState("أكاديمي"); // "أكاديمي" أو "ثقافي"
  var [studyYear, setStudyYear] = React.useState("السنة الأولى");
  var [church, setChurch] = React.useState("");

  var [isLoading, setIsLoading] = React.useState(false);
  var [pendingNotice, setPendingNotice] = React.useState(false);
  var [errorMsg, setErrorMsg] = React.useState("");
  var [successMsg, setSuccessMsg] = React.useState("");

  if (!isOpen) return null;

  var handleRegisterRequest = async function(e) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (!window.db) throw new Error("قاعدة البيانات غير متصلة بالإنترنت حالياً. يرجى التحقق من الاتصال.");

      var cleanEmail = email.trim().toLowerCase();
      var cleanPhone = phone.trim();
      var cleanPassword = password.trim();

      if (!cleanEmail || !cleanPhone || !fullName.trim() || !cleanPassword) {
        throw new Error("يرجى ملء جميع الحقول المطلوبة.");
      }

      if (cleanPassword.length < 4) {
        throw new Error("كلمة المرور يجب ألا تقل عن 4 أحرف أو أرقام.");
      }

      // فحص الحساب الرئيسي للمشرف
      var isMasterAdmin = (cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase());

      var userDocId = "user_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");

      // فحص ما إذا كان المستخدم مسجلاً بالفعل
      var snap = await window.db.collection("users").doc(userDocId).get();
      if (snap.exists && !isMasterAdmin) {
        throw new Error("يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل. يرجى تسجيل الدخول.");
      }

      var userData = {
        id: userDocId,
        fullName: fullName.trim(),
        email: cleanEmail,
        password: cleanPassword,
        phone: cleanPhone,
        studyType: studyType,
        studyYear: studyYear,
        church: church.trim() || "غير محدد",
        role: isMasterAdmin ? "admin" : "student",
        status: isMasterAdmin ? "approved" : "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await window.db.collection("users").doc(userDocId).set(userData, { merge: true });

      // محاولة إنشاء حساب في Firebase Auth إن أمكن لدعم الاستعادة المتقدمة
      if (window.auth && typeof window.auth.createUserWithEmailAndPassword === "function") {
        try {
          await window.auth.createUserWithEmailAndPassword(cleanEmail, cleanPassword);
        } catch (authErr) {
          // نتجاهل أي خطأ هنا حتى لا يتعطل التسجيل في حال كانت سياسات فايربيز صارمة
          console.log("Firebase auth note:", authErr.code);
        }
      }

      if (isMasterAdmin) {
        onLoginSuccess(userData);
        if (onClose) onClose();
        return;
      }

      // إرسال إشعار فوري للمشرف بوصول طلب جديد
      if (window.NotificationService && typeof window.NotificationService.notifyAdminNewUserRegistration === "function") {
        window.NotificationService.notifyAdminNewUserRegistration(userData);
      }

      setPendingNotice(true);
    } catch (err) {
      setErrorMsg(err.message || "حدث خطأ أثناء إرسال طلب الانضمام.");
    } finally {
      setIsLoading(false);
    }
  };

  var handleLogin = async function(e) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (!window.db) throw new Error("قاعدة البيانات غير متصلة بالإنترنت حالياً.");

      var ident = loginIdentifier.trim().toLowerCase();
      var pwd = loginPassword.trim();

      if (!ident || !pwd) {
        throw new Error("يرجى كتابة البريد الإلكتروني أو الهاتف وكلمة المرور.");
      }

      // حساب المشرف الرئيسي
      var isMasterAdmin = (ident === MASTER_ADMIN_EMAIL.toLowerCase());

      var userDoc = null;
      var userDocId = "user_" + ident.replace(/[^a-zA-Z0-9]/g, "_");

      // محاولة الجلب المباشر عبر الـ ID
      var directSnap = await window.db.collection("users").doc(userDocId).get();
      if (directSnap.exists) {
        userDoc = directSnap.data();
      } else {
        // البحث بالبريد
        var emailSnap = await window.db.collection("users").where("email", "==", ident).limit(1).get();
        if (!emailSnap.empty) {
          userDoc = emailSnap.docs[0].data();
        } else {
          // البحث بالهاتف
          var phoneSnap = await window.db.collection("users").where("phone", "==", loginIdentifier.trim()).limit(1).get();
          if (!phoneSnap.empty) {
            userDoc = phoneSnap.docs[0].data();
          }
        }
      }

      // حالة خاصة: المشرف يدخل لأول مرة ولم يُنشئ حسابه بعد
      if (!userDoc && isMasterAdmin) {
        var masterData = {
          id: userDocId,
          fullName: "مشرف المنصة",
          email: MASTER_ADMIN_EMAIL.toLowerCase(),
          password: pwd,
          phone: "01275571569",
          studyType: "أكاديمي",
          studyYear: "المشرف العام",
          church: "الإدارة",
          role: "admin",
          status: "approved",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await window.db.collection("users").doc(userDocId).set(masterData, { merge: true });
        onLoginSuccess(masterData);
        if (onClose) onClose();
        return;
      }

      if (!userDoc) {
        throw new Error("لا يوجد حساب مسجل بهذه البيانات. يرجى إنشاء حساب جديد كدارس أولاً.");
      }

      // فحص كلمة المرور
      if (userDoc.password && userDoc.password !== pwd) {
        throw new Error("كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.");
      }

      // إذا كان هو المشرف، نضمن إعطاءه الصلاحية الكاملة والموافقة
      if (userDoc.email && userDoc.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
        userDoc.role = "admin";
        userDoc.status = "approved";
      }

      // فحص حالة الحساب للدارسين
      if (userDoc.status === "pending") {
        throw new Error("طلب انضمامك قيد المراجعة والاعتماد من قِبل مشرف المنصة. ستتمكن من الدخول فور تفعيل حسابك.");
      }

      if (userDoc.status === "rejected") {
        throw new Error("عفواً، تم تعليق أو رفض هذا الحساب من قِبل مشرف المنصة.");
      }

      if (userDoc.status !== "approved") {
        throw new Error("الحساب بانتظار اعتماد المشرف.");
      }

      onLoginSuccess(userDoc);
      if (onClose) onClose();
    } catch (err) {
      setErrorMsg(err.message || "حدث خطأ أثناء تسجيل الدخول.");
    } finally {
      setIsLoading(false);
    }
  };

  return React.createElement(
    "div",
    {
      className: isBlocking
        ? "fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        : "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    },
    React.createElement(
      "div",
      {
        className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200"
      },

      // ترويسة النافذة
      React.createElement(
        "div",
        { className: "flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4" },
        React.createElement(
          "div",
          { className: "flex items-center gap-3" },
          React.createElement("div", { className: "w-11 h-11 rounded-2xl bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md shrink-0" }, "🌿"),
          React.createElement(
            "div",
            null,
            React.createElement("h3", { className: "text-lg font-bold text-slate-900 dark:text-white leading-tight" },
              isLogin ? "تسجيل الدخول للمنصة" : "طلب انضمام دارس جديد"
            ),
            React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5" },
              "منصة دراسة المشورة • الدخول مصرح به للدارسين المعتمدين فقط"
            )
          )
        ),
        // زر الإغلاق يظهر فقط إن لم تكن الشاشة إجبارية حاصرة
        !isBlocking && onClose && React.createElement(
          "button",
          {
            onClick: onClose,
            className: "text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          },
          "✕"
        )
      ),

      // تنبيه الخطأ
      errorMsg && React.createElement(
        "div",
        { className: "p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900/50 flex items-center gap-2" },
        React.createElement("span", { className: "text-base shrink-0" }, "⚠️"),
        React.createElement("span", { className: "leading-relaxed" }, errorMsg)
      ),

      // شاشة الانتظار والمراجعة بعد التسجيل
      pendingNotice ? React.createElement(
        "div",
        { className: "p-6 text-center space-y-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60" },
        React.createElement("div", { className: "w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl shadow-xs" }, "⏳"),
        React.createElement(
          "div",
          { className: "space-y-2" },
          React.createElement("h4", { className: "text-base font-bold text-slate-900 dark:text-white" }, "تم استلام طلب انضمامك بنجاح!"),
          React.createElement("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto" },
            "طلب انضمامك الآن قيد المراجعة والاعتماد من قِبل مشرف المنصة للتأكد من بيانات الدارسين. ستتمكن من تسجيل الدخول وتصفح المحاضرات والكتب فور تفعيل حسابك."
          )
        ),
        React.createElement(
          "button",
          {
            onClick: function() {
              setPendingNotice(false);
              setIsLogin(true);
              setErrorMsg("");
            },
            className: "w-full py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-slate-800 transition-colors"
          },
          "العودة لتسجيل الدخول ⏎"
        )
      ) : isLogin ? React.createElement(
        // ================= نموذج تسجيل الدخول =================
        "form",
        { onSubmit: handleLogin, className: "space-y-3.5" },
        
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "البريد الإلكتروني أو الهاتف"),
          React.createElement("input", {
            type: "text",
            required: true,
            value: loginIdentifier,
            onChange: function(e) { setLoginIdentifier(e.target.value); },
            placeholder: "name@example.com أو 012xxxxxxxx",
            className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
          })
        ),

        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "كلمة المرور"),
          React.createElement(
            "div",
            { className: "relative" },
            React.createElement("input", {
              type: showLoginPassword ? "text" : "password",
              required: true,
              value: loginPassword,
              onChange: function(e) { setLoginPassword(e.target.value); },
              placeholder: "••••••••",
              className: "w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
            }),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setShowLoginPassword(!showLoginPassword); },
                className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm p-1"
              },
              showLoginPassword ? "👁️‍🗨️" : "👁️"
            )
          )
        ),

        React.createElement(
          "button",
          {
            type: "submit",
            disabled: isLoading,
            className: "w-full py-3 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-slate-800 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
          },
          isLoading ? "جاري التحقق والدخول..." : "تسجيل الدخول للمنصة ←"
        ),

        React.createElement(
          "div",
          { className: "text-center pt-2 border-t border-slate-100 dark:border-slate-800" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setIsLogin(false); setErrorMsg(""); },
              className: "text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            },
            "دارس جديد؟ اضغط هنا لإنشاء حساب وطلب الانضمام"
          )
        )
      ) : React.createElement(
        // ================= نموذج إنشاء حساب دارس جديد =================
        "form",
        { onSubmit: handleRegisterRequest, className: "space-y-3" },

        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "الاسم بالكامل (ثلاثي أو رباعي) *"),
          React.createElement("input", {
            type: "text",
            required: true,
            value: fullName,
            onChange: function(e) { setFullName(e.target.value); },
            placeholder: "اسمك كدارس في المعهد...",
            className: "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          })
        ),

        React.createElement(
          "div",
          { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "البريد الإلكتروني *"),
            React.createElement("input", {
              type: "email",
              required: true,
              value: email,
              onChange: function(e) { setEmail(e.target.value); },
              placeholder: "student@example.com",
              className: "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "رقم الموبايل / واتساب *"),
            React.createElement("input", {
              type: "tel",
              required: true,
              value: phone,
              onChange: function(e) { setPhone(e.target.value); },
              placeholder: "012xxxxxxxx",
              className: "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            })
          )
        ),

        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "كلمة المرور للدخول *"),
          React.createElement(
            "div",
            { className: "relative" },
            React.createElement("input", {
              type: showPassword ? "text" : "password",
              required: true,
              value: password,
              onChange: function(e) { setPassword(e.target.value); },
              placeholder: "اختر كلمة مرور خاصة بك (4 خانات فأكثر)...",
              className: "w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            }),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setShowPassword(!showPassword); },
                className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm p-1"
              },
              showPassword ? "👁️‍🗨️" : "👁️"
            )
          )
        ),

        // نوع الدراسة (أكاديمي أو ثقافي)
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" }, "نوع الدراسة *"),
          React.createElement(
            "div",
            { className: "grid grid-cols-2 gap-2" },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setStudyType("أكاديمي"); },
                className: "py-2 px-3 rounded-xl border text-xs font-bold transition-all " +
                  (studyType === "أكاديمي"
                    ? "bg-slate-900 text-white dark:bg-emerald-600 border-transparent shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700")
              },
              "🎓 دراسة أكاديمية"
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() { setStudyType("ثقافي"); },
                className: "py-2 px-3 rounded-xl border text-xs font-bold transition-all " +
                  (studyType === "ثقافي"
                    ? "bg-slate-900 text-white dark:bg-emerald-600 border-transparent shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700")
              },
              "📖 دراسة ثقافية"
            )
          )
        ),

        // السنة الدراسية والكنيسة
        React.createElement(
          "div",
          { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "السنة الدراسية *"),
            React.createElement(
              "select",
              {
                value: studyYear,
                onChange: function(e) { setStudyYear(e.target.value); },
                className: "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              },
              React.createElement("option", { value: "السنة الأولى" }, "السنة الأولى"),
              React.createElement("option", { value: "السنة الثانية" }, "السنة الثانية"),
              React.createElement("option", { value: "السنة الثالثة" }, "السنة الثالثة"),
              React.createElement("option", { value: "السنة الرابعة" }, "السنة الرابعة"),
              React.createElement("option", { value: "خريج / متابع عام" }, "خريج / متابع عام")
            )
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "الكنيسة / الإيبارشية *"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: church,
              onChange: function(e) { setChurch(e.target.value); },
              placeholder: "مثال: كنيسة مارمرقس...",
              className: "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            })
          )
        ),

        // ملاحظة المراجعة والاعتماد
        React.createElement(
          "div",
          { className: "p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px] border border-amber-200/60 leading-relaxed" },
          "📌 سيتم مراجعة الطلب والتأكد من البيانات من قِبل مشرف المنصة قبل تفعيل الحساب."
        ),

        React.createElement(
          "button",
          {
            type: "submit",
            disabled: isLoading,
            className: "w-full py-3 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-slate-800 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
          },
          isLoading ? "جاري إرسال الطلب..." : "إرسال طلب الانضمام للمشرف ✓"
        ),

        React.createElement(
          "div",
          { className: "text-center pt-2 border-t border-slate-100 dark:border-slate-800" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() { setIsLogin(true); setErrorMsg(""); },
              className: "text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
            },
            "لديك حساب بالفعل؟ تسجيل الدخول"
          )
        )
      )
    )
  );
};
