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

  // حقول التسجيل الجديد (بدون موبايل، وتفصيل الكنيسة والأبرشية والمحافظة)
  var [fullName, setFullName] = React.useState("");
  var [email, setEmail] = React.useState("");
  var [password, setPassword] = React.useState("");
  var [showPassword, setShowPassword] = React.useState(false);
  var [studyType, setStudyType] = React.useState("أكاديمي"); // "أكاديمي" أو "ثقافي"
  var [studyYear, setStudyYear] = React.useState("السنة الأولى");
  var [church, setChurch] = React.useState("");
  var [diocese, setDiocese] = React.useState("");
  var [governorate, setGovernorate] = React.useState("القاهرة");
  var [whatsapp, setWhatsapp] = React.useState("");

  var [isLoading, setIsLoading] = React.useState(false);
  var [pendingNotice, setPendingNotice] = React.useState(false);
  var [isForgotPassword, setIsForgotPassword] = React.useState(false);
  var [forgotEmail, setForgotEmail] = React.useState("");
  var [resetSentNotice, setResetSentNotice] = React.useState(false);
  var [errorMsg, setErrorMsg] = React.useState("");

  var governoratesList = [
    "القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "الدقهلية",
    "الشرقية", "المنوفية", "الغربية", "كفر الشيخ", "دمياط",
    "بورسعيد", "الإسماعيلية", "السويس", "البحيرة", "بني سويف",
    "الفيوم", "المنيا", "أسيوط", "سوهاج", "قنا",
    "الأقصر", "أسوان", "البحر الأحمر", "الوادي الجديد", "مطروح",
    "شمال سيناء", "جنوب سيناء", "خارج مصر / مقيم بالخارج"
  ];

  if (!isOpen) return null;

  var handleRegisterRequest = async function(e) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      if (!window.db) throw new Error("قاعدة البيانات غير متصلة بالإنترنت حالياً.");

      var cleanEmail = email.trim().toLowerCase();
      var cleanPassword = password.trim();
      var cleanFullName = fullName.trim();
      var cleanWhatsapp = whatsapp.trim();
      var cleanChurch = church.trim();
      var cleanDiocese = diocese.trim();
      var cleanGov = governorate.trim();

      if (!cleanFullName || !cleanEmail || !cleanPassword || !cleanWhatsapp || !cleanChurch || !cleanDiocese || !cleanGov) {
        throw new Error("يرجى ملء جميع الحقول الإلزامية المطلوبة (بما في ذلك رقم الواتساب).");
      }

      if (cleanPassword.length < 4) {
        throw new Error("كلمة المرور يجب ألا تقل عن 4 خانات.");
      }

      // فحص الحساب الرئيسي للمشرف
      var isMasterAdmin = (cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase());

      var userDocId = "user_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");

      // فحص ما إذا كان الحساب مسجلاً مسبقاً
      var snap = await window.db.collection("users").doc(userDocId).get();
      if (snap.exists && !isMasterAdmin) {
        throw new Error("يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل. يرجى تسجيل الدخول.");
      }

      var userStatus = isMasterAdmin ? "approved" : "pending";
      var userRole = isMasterAdmin ? "admin" : "student";

      var userData = {
        id: userDocId,
        fullName: cleanFullName,
        email: cleanEmail,
        password: cleanPassword,
        phone: cleanWhatsapp,
        whatsapp: cleanWhatsapp,
        studyType: studyType,
        studyYear: studyYear,
        church: cleanChurch,
        diocese: cleanDiocese,
        governorate: cleanGov,
        role: userRole,
        status: userStatus,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await window.db.collection("users").doc(userDocId).set(userData, { merge: true });

      // محاولة إنشاء حساب في Firebase Auth إن أمكن
      if (window.auth && typeof window.auth.createUserWithEmailAndPassword === "function") {
        try {
          await window.auth.createUserWithEmailAndPassword(cleanEmail, cleanPassword);
        } catch (authErr) {}
      }

      if (isMasterAdmin) {
        alert("مرحباً بك يا مشرف المنصة!");
        onLoginSuccess(userData);
        if (onClose) onClose();
        return;
      }

      // إرسال إشعار فوري لموبايل المشرف
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

  var handleResetPassword = async function(e) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      var clean = forgotEmail.trim().toLowerCase();
      if (!clean) throw new Error("يرجى إدخال البريد الإلكتروني.");

      // 1. محاولة إرسال رابط رسمي من فايربيز إن أمكن
      if (window.auth && typeof window.auth.sendPasswordResetEmail === "function") {
        try {
          await window.auth.sendPasswordResetEmail(clean);
        } catch (authErr) {
          console.log("Firebase auth reset notice:", authErr.code);
        }
      }

      // 2. تسجيل طلب استعادة كلمة المرور في قاعدة البيانات لتنبيه المشرف
      if (window.db) {
        await window.db.collection("notifications").add({
          title: "🔑 طلب استعادة كلمة المرور",
          body: "طلب استعادة كلمة مرور لحساب: " + clean,
          type: "password_reset",
          email: clean,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      setResetSentNotice(true);
    } catch (err) {
      setErrorMsg(err.message || "حدث خطأ أثناء إرسال طلب استعادة كلمة المرور.");
    } finally {
      setIsLoading(false);
    }
  };

  var handleLogin = async function(e) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      var ident = loginIdentifier.trim().toLowerCase();
      var pwd = loginPassword.trim();

      if (!ident || !pwd) {
        throw new Error("يرجى كتابة البريد الإلكتروني وكلمة المرور.");
      }

      var userDocId = "user_" + ident.replace(/[^a-zA-Z0-9]/g, "_");
      var isMasterAdmin = (ident === MASTER_ADMIN_EMAIL.toLowerCase());

      // =========================================================
      // 1. الدخول الفوري والمباشر للمشرف الرئيسي (Zero-Latency Guarantee)
      // =========================================================
      if (isMasterAdmin) {
        var masterData = {
          id: userDocId,
          fullName: "مشرف المنصة",
          email: MASTER_ADMIN_EMAIL.toLowerCase(),
          password: pwd,
          phone: "01000000000",
          whatsapp: "01000000000",
          studyType: "أكاديمي",
          studyYear: "المشرف العام",
          church: "الإدارة",
          diocese: "العامة",
          governorate: "القاهرة",
          role: "admin",
          status: "approved",
          createdAt: new Date().toISOString()
        };

        // حفظ في السحابة في الخلفية بدون تعطيل دخول المشرف نهائياً
        if (window.db) {
          window.db.collection("users").doc(userDocId).set({
            id: userDocId,
            fullName: "مشرف المنصة",
            email: MASTER_ADMIN_EMAIL.toLowerCase(),
            password: pwd,
            role: "admin",
            status: "approved",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true }).catch(function(err) {
            console.warn("Background admin sync note:", err);
          });
        }

        onLoginSuccess(masterData);
        if (onClose) onClose();
        return;
      }

      // =========================================================
      // 2. التحقق من حسابات الدارسين مع حماية من بطء الشبكة
      // =========================================================
      if (!window.db) throw new Error("قاعدة البيانات غير متصلة بالإنترنت حالياً.");

      var fetchWithTimeout = function(promise, timeoutMs) {
        return Promise.race([
          promise,
          new Promise(function(_, reject) {
            setTimeout(function() {
              reject(new Error("استغرق التحقق وقتاً طويلاً. يرجى التأكد من اتصال الإنترنت ثم إعادة المحاولة."));
            }, timeoutMs || 7000);
          })
        ]);
      };

      var userDoc = null;
      var directSnap = await fetchWithTimeout(window.db.collection("users").doc(userDocId).get(), 7000);
      if (directSnap.exists) {
        userDoc = directSnap.data();
      } else {
        var emailSnap = await fetchWithTimeout(window.db.collection("users").where("email", "==", ident).limit(1).get(), 7000);
        if (!emailSnap.empty) {
          userDoc = emailSnap.docs[0].data();
        }
      }

      if (!userDoc) {
        throw new Error("لا يوجد حساب مسجل بهذا البريد. يرجى إنشاء حساب جديد كدارس أولاً.");
      }

      if (userDoc.password && userDoc.password !== pwd) {
        throw new Error("كلمة المرور غير صحيحة. يرجى التأكد والمحاولة مرة أخرى.");
      }

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
      console.error("Login error:", err);
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
        { className: "flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3" },
        React.createElement(
          "div",
          { className: "flex items-center gap-3" },
          React.createElement("img", { src: "icon-192.png", alt: "أيقونة التطبيق", className: "w-10 h-10 rounded-2xl shadow-md object-cover border border-slate-200 dark:border-slate-700 shrink-0" }),
          React.createElement(
            "div",
            null,
            React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white leading-tight" },
              isLogin ? "تسجيل الدخول للمنصة" : "طلب انضمام دارس جديد"
            ),
            React.createElement("p", { className: "text-[11px] text-slate-500 dark:text-slate-400 mt-0.5" },
              "منصة دراسة المشورة • الدخول مصرح به للدارسين المعتمدين فقط"
            )
          )
        ),
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
        { className: "p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900/50 flex items-center gap-2" },
        React.createElement("span", { className: "text-base shrink-0" }, "⚠️"),
        React.createElement("span", { className: "leading-relaxed" }, errorMsg)
      ),

      // شاشة الانتظار والمراجعة
      pendingNotice ? React.createElement(
        "div",
        { className: "p-6 text-center space-y-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60" },
        React.createElement("div", { className: "w-14 h-14 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-2xl shadow-xs" }, "⏳"),
        React.createElement(
          "div",
          { className: "space-y-1.5" },
          React.createElement("h4", { className: "text-base font-bold text-slate-900 dark:text-white" }, "تم استلام طلب انضمامك بنجاح!"),
          React.createElement("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto" },
            "طلب انضمامك الآن قيد المراجعة والاعتماد من قِبل مشرف المنصة. ستتمكن من تسجيل الدخول وتصفح المحاضرات والكتب فور تفعيل حسابك."
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
      ) : isForgotPassword ? React.createElement(
        // ================= شاشة استعادة كلمة المرور =================
        "div",
        { className: "space-y-4" },
        resetSentNotice ? React.createElement(
          "div",
          { className: "p-6 text-center space-y-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800" },
          React.createElement("div", { className: "text-3xl" }, "📬"),
          React.createElement("h4", { className: "text-sm font-bold text-emerald-900 dark:text-emerald-200" }, "تم إرسال تعليمات الاستعادة!"),
          React.createElement("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed" },
            "إذا كان بريدك مسجلاً، فستصلك رسالة عبر البريد الإلكتروني لإعادة تعيين كلمة المرور (يرجى مراجعة البريد والـ Spam).\nكما تم إخطار المشرف بطلبك ويمكنه تعديل كلمة المرور لك مباشرة."
          ),
          React.createElement("button", {
            type: "button",
            onClick: function() {
              setIsForgotPassword(false);
              setResetSentNotice(false);
              setErrorMsg("");
            },
            className: "w-full py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs"
          }, "العودة لتسجيل الدخول ⏎")
        ) : React.createElement(
          "form",
          { onSubmit: handleResetPassword, className: "space-y-3.5" },
          React.createElement("div", null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "البريد الإلكتروني المسجل"),
            React.createElement("input", {
              type: "email",
              required: true,
              value: forgotEmail,
              onChange: function(e) { setForgotEmail(e.target.value); },
              placeholder: "name@example.com",
              className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            })
          ),
          React.createElement("p", { className: "text-[11px] text-slate-500 leading-relaxed" },
            "💡 سيتم إرسال رابط لإعادة تعيين كلمة المرور، أو إشعار مشرف المنصة لمساعدتك في تعيين كلمة مرور جديدة لحسابك."
          ),
          React.createElement("button", {
            type: "submit",
            disabled: isLoading,
            className: "w-full py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs shadow-md disabled:opacity-50"
          }, isLoading ? "جاري الإرسال..." : "إرسال طلب الاستعادة ←"),
          React.createElement("div", { className: "text-center pt-2 border-t border-slate-100 dark:border-slate-800" },
            React.createElement("button", {
              type: "button",
              onClick: function() { setIsForgotPassword(false); setErrorMsg(""); },
              className: "text-xs font-semibold text-slate-500 hover:underline"
            }, "العودة لتسجيل الدخول")
          )
        )
      ) : isLogin ? React.createElement(
        // ================= نموذج تسجيل الدخول =================
        "form",
        { onSubmit: handleLogin, className: "space-y-3.5" },
        
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "البريد الإلكتروني"),
          React.createElement("input", {
            type: "email",
            required: true,
            value: loginIdentifier,
            onChange: function(e) { setLoginIdentifier(e.target.value); },
            placeholder: "name@example.com",
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
          ),
          React.createElement(
            "div",
            { className: "flex justify-end pt-1" },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() {
                  setIsForgotPassword(true);
                  setErrorMsg("");
                  setForgotEmail(loginIdentifier);
                },
                className: "text-[11px] text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition-colors"
              },
              "نسيت كلمة المرور؟"
            )
          )
        ),

        React.createElement(
          "button",
          {
            type: "submit",
            disabled: isLoading,
            className: "w-full py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-slate-800 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
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

        // الاسم ورقم الواتساب للتواصل
        React.createElement(
          "div",
          { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "الاسم *"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: fullName,
              onChange: function(e) { setFullName(e.target.value); },
              placeholder: "اسمك...",
              className: "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1" },
              React.createElement("span", { className: "text-emerald-600 dark:text-emerald-400 font-bold" }, "💬"),
              React.createElement("span", null, "رقم الواتساب *")
            ),
            React.createElement("input", {
              type: "tel",
              required: true,
              value: whatsapp,
              onChange: function(e) { setWhatsapp(e.target.value); },
              placeholder: "01xxxxxxxxx (للتواصل عبر واتساب)",
              dir: "ltr",
              className: "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white text-right"
            })
          )
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
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "كلمة المرور *"),
            React.createElement(
              "div",
              { className: "relative" },
              React.createElement("input", {
                type: showPassword ? "text" : "password",
                required: true,
                value: password,
                onChange: function(e) { setPassword(e.target.value); },
                placeholder: "اختر كلمة مرور...",
                className: "w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              }),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function() { setShowPassword(!showPassword); },
                  className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                },
                showPassword ? "👁️‍🗨️" : "👁️"
              )
            )
          )
        ),

        // نوع الدراسة (أكاديمي أو ثقافي)
        React.createElement(
          "div",
          null,
          React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "نوع الدراسة *"),
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

        // السنة الدراسية والمحافظة
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
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "المحافظة *"),
            React.createElement(
              "select",
              {
                value: governorate,
                onChange: function(e) { setGovernorate(e.target.value); },
                className: "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              },
              governoratesList.map(function(gov) {
                return React.createElement("option", { key: gov, value: gov }, gov);
              })
            )
          )
        ),

        // الكنيسة والإيبارشية كحقلين منفصلين وإلزاميين
        React.createElement(
          "div",
          { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "الكنيسة *"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: church,
              onChange: function(e) { setChurch(e.target.value); },
              placeholder: "اسم الكنيسة...",
              className: "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" }, "الإيبارشية *"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: diocese,
              onChange: function(e) { setDiocese(e.target.value); },
              placeholder: "اسم الإيبارشية...",
              className: "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            })
          )
        ),

        // ملاحظة المراجعة والاعتماد
        React.createElement(
          "div",
          { className: "p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px] border border-amber-200/60 leading-relaxed text-center font-medium" },
          "📌 سيتم مراجعة الطلب واعتماده من قِبل مشرف المنصة قبل تفعيل الحساب."
        ),

        React.createElement(
          "button",
          {
            type: "submit",
            disabled: isLoading,
            className: "w-full py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-slate-800 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
          },
          isLoading ? "جاري إرسال الطلب..." : "إرسال طلب الانضمام للمشرف ✓"
        ),

        React.createElement(
          "div",
          { className: "text-center pt-1.5 border-t border-slate-100 dark:border-slate-800" },
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
