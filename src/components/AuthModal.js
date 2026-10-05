// نافذة تسجيل الدخول وطلب الانضمام للمنصة
window.AuthModal = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var onLoginSuccess = props.onLoginSuccess;

  var [isLogin, setIsLogin] = React.useState(true);
  var [email, setEmail] = React.useState("");
  var [phone, setPhone] = React.useState("");
  var [fullName, setFullName] = React.useState("");
  var [instituteMessage, setInstituteMessage] = React.useState("");
  var [isLoading, setIsLoading] = React.useState(false);
  var [pendingNotice, setPendingNotice] = React.useState(false);
  var [errorMsg, setErrorMsg] = React.useState("");

  if (!isOpen) return null;

  var handleRegisterRequest = async function(e) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      if (!window.db) throw new Error("قاعدة البيانات غير متصلة");

      // فحص الحساب المسؤول الافتراضي
      if (email.trim().toLowerCase().includes("admin") || email.trim().toLowerCase().includes("nader") || phone.trim() === "01275571569") {
        onLoginSuccess({
          fullName: "الأدمن المسؤول",
          email: email.trim(),
          phone: phone.trim(),
          role: "admin",
          status: "approved"
        });
        onClose();
        return;
      }

      var userDocId = "user_" + phone.trim().replace(/\D/g, "");
      var userData = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        instituteMessage: instituteMessage.trim(),
        role: "student",
        status: "pending", // قيد انتظار موافقة الأدمن
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await window.db.collection("users").doc(userDocId).set(userData, { merge: true });
      setPendingNotice(true);
    } catch (err) {
      setErrorMsg(err.message || "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setIsLoading(false);
    }
  };

  var handleLogin = async function(e) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      // فحص إذا كان حساب الأدمن
      if (email.trim().toLowerCase().includes("admin") || email.trim().toLowerCase().includes("nader") || phone.trim() === "01275571569") {
        onLoginSuccess({
          fullName: "الأدمن المسؤول",
          email: email.trim(),
          phone: phone.trim(),
          role: "admin",
          status: "approved"
        });
        onClose();
        return;
      }

      if (!window.db) throw new Error("قاعدة البيانات غير متصلة");

      // البحث عن المستخدم بالهاتف أو البريد
      var snap = await window.db.collection("users").where("email", "==", email.trim().toLowerCase()).get();
      if (snap.empty) {
        snap = await window.db.collection("users").where("phone", "==", phone.trim()).get();
      }

      if (snap.empty) {
        throw new Error("لا يوجد حساب مسجل بهذه البيانات. يرجى تقديم طلب انضمام أولاً.");
      }

      var user = snap.docs[0].data();
      if (user.status !== "approved") {
        throw new Error("طلب انضمامك قيد المراجعة لدى الأدمن. ستتمكن من الدخول فور الموافقة عليك.");
      }

      onLoginSuccess(user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" },
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4" },

      React.createElement(
        "div",
        { className: "flex items-center justify-between border-b pb-3" },
        React.createElement("div", null,
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" },
            isLogin ? "تسجيل الدخول للمنصة" : "طلب انضمام دارس جديد"
          ),
          React.createElement("p", { className: "text-xs text-slate-400" }, "منصة دراسة المشورة • حساب خاص بالدارسين")
        ),
        React.createElement("button", { onClick: onClose, className: "text-slate-400" }, "✕")
      ),

      errorMsg && React.createElement(
        "div",
        { className: "p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200" },
        errorMsg
      ),

      pendingNotice ? React.createElement(
        "div",
        { className: "p-6 text-center space-y-3" },
        React.createElement("div", { className: "text-3xl" }, "⏳"),
        React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, "تم استلام طلب انضمامك بنجاح"),
        React.createElement("p", { className: "text-xs text-slate-500 leading-relaxed" },
          "الطلب الآن في انتظار مراجعة الأدمن للتأكد من بيانات الدارسين. ستتمكن من تصفح المحاضرات والمراجع فور تفعيل حسابك."
        ),
        React.createElement("button", {
          onClick: function() { setPendingNotice(false); setIsLogin(true); },
          className: "mt-2 bg-slate-900 dark:bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold"
        }, "العودة لتسجيل الدخول")
      ) : isLogin ? React.createElement(
        // نموذج تسجيل الدخول
        "form",
        { onSubmit: handleLogin, className: "space-y-3" },
        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "البريد الإلكتروني"),
          React.createElement("input", {
            type: "email",
            required: true,
            value: email,
            onChange: function(e) { setEmail(e.target.value); },
            placeholder: "بريدك الإلكتروني...",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
          })
        ),
        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "أو رقم الهاتف المسجل"),
          React.createElement("input", {
            type: "tel",
            value: phone,
            onChange: function(e) { setPhone(e.target.value); },
            placeholder: "012xxxxxxxx",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
          })
        ),
        React.createElement("button", {
          type: "submit",
          disabled: isLoading,
          className: "w-full py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs shadow-sm disabled:opacity-50"
        }, isLoading ? "جاري التحقق..." : "دخول إلى المنصة"),
        React.createElement("div", { className: "text-center pt-2" },
          React.createElement("button", {
            type: "button",
            onClick: function() { setIsLogin(false); setErrorMsg(""); },
            className: "text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
          }, "دارس جديد؟ اضغط هنا لتقديم طلب انضمام")
        )
      ) : React.createElement(
        // نموذج طلب الانضمام
        "form",
        { onSubmit: handleRegisterRequest, className: "space-y-3" },
        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "الاسم الثلاثي أو بالكامل"),
          React.createElement("input", {
            type: "text",
            required: true,
            value: fullName,
            onChange: function(e) { setFullName(e.target.value); },
            placeholder: "اسمك كدارس في المشورة...",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
          })
        ),
        React.createElement("div", { className: "grid grid-cols-2 gap-2" },
          React.createElement("div", null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "البريد الإلكتروني"),
            React.createElement("input", {
              type: "email",
              required: true,
              value: email,
              onChange: function(e) { setEmail(e.target.value); },
              placeholder: "example@mail.com",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          ),
          React.createElement("div", null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "رقم الموبايل / واتساب"),
            React.createElement("input", {
              type: "tel",
              required: true,
              value: phone,
              onChange: function(e) { setPhone(e.target.value); },
              placeholder: "012xxxxxxxx",
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            })
          )
        ),
        React.createElement("div", null,
          React.createElement("label", { className: "block text-xs font-semibold mb-1" }, "رسالة تعريفية بالدراسة والفرقة"),
          React.createElement("textarea", {
            rows: 2,
            required: true,
            value: instituteMessage,
            onChange: function(e) { setInstituteMessage(e.target.value); },
            placeholder: "مثال: أنا دارس بالدفعة الحالية لدراسة المشورة...",
            className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
          })
        ),
        React.createElement("button", {
          type: "submit",
          disabled: isLoading,
          className: "w-full py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs shadow-sm disabled:opacity-50"
        }, isLoading ? "جاري الإرسال..." : "إرسال طلب الانضمام للمراجعة"),
        React.createElement("div", { className: "text-center pt-2" },
          React.createElement("button", {
            type: "button",
            onClick: function() { setIsLogin(true); setErrorMsg(""); },
            className: "text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
          }, "لديك حساب بالفعل؟ تسجيل الدخول")
        )
      )
    )
  );
};
