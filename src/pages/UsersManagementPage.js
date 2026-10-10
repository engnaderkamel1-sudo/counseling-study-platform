// شاشة إدارة طلبات المستخدمين وقبول/رفض الدارسين (للمسؤول نادر كمال فقط)
window.UsersManagementPage = function(props) {
  var currentUser = props.currentUser || { role: "admin" };
  var [users, setUsers] = React.useState([]);
  var [isLoading, setIsLoading] = React.useState(true);

  var fetchUsers = async function() {
    if (!window.db) return;
    try {
      var snap = await window.db.collection("users").get();
      var list = [];
      snap.forEach(function(doc) {
        list.push(Object.assign({ id: doc.id }, doc.data()));
      });
      setUsers(list);
    } catch (e) {
      console.error(e);
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
      alert("خطأ: " + e.message);
    }
  };

  var pendingUsers = users.filter(function(u) { return u.status === "pending"; });
  var approvedUsers = users.filter(function(u) { return u.status === "approved"; });
  var rejectedUsers = users.filter(function(u) { return u.status === "rejected"; });

  if (!currentUser || currentUser.role !== "admin") {
    return React.createElement("div", { className: "p-8 text-center text-slate-500 text-sm" },
      "عفواً، هذه الشاشة مخصصة للمسؤول (الأدمن) فقط لإدارة طلبات الانضمام."
    );
  }

  return React.createElement(
    "div",
    { className: "space-y-6 pb-12" },

    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" },
      React.createElement(
        "div",
        null,
        React.createElement("h2", { className: "text-xl font-bold text-slate-900 dark:text-white" }, "إدارة طلبات الانضمام والدارسين"),
        React.createElement("p", { className: "text-xs text-slate-500 mt-1" }, "مراجعة رسائل الزملاء الدارسين وتأكيد بياناتهم قبل السماح لهم بالدخول للمنصة")
      ),
      React.createElement("button", {
        onClick: fetchUsers,
        className: "text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 font-semibold"
      }, "تحديث القائمة 🔄")
    ),

    // 1. قسم الطلبات المعلقة (Pending)
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
      React.createElement("div", { className: "flex items-center justify-between border-b pb-3" },
        React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "طلبات بانتظار موافقتك (" + pendingUsers.length + ")"),
        React.createElement("span", { className: "text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-bold" }, "قيد المراجعة")
      ),

      pendingUsers.length > 0 ? React.createElement(
        "div",
        { className: "space-y-3" },
        pendingUsers.map(function(u) {
          return React.createElement(
            "div",
            {
              key: u.id,
              className: "p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2"
            },
            React.createElement(
              "div",
              { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2" },
              React.createElement("div", null,
                React.createElement("h4", { className: "text-sm font-bold text-slate-900 dark:text-white" }, u.fullName),
                React.createElement("p", { className: "text-xs text-slate-500" }, "الهاتف: " + u.phone + " • البريد: " + u.email)
              ),
              React.createElement(
                "div",
                { className: "flex items-center gap-2" },
                React.createElement("button", {
                  onClick: function() { handleUpdateStatus(u.id, "approved"); },
                  className: "px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                }, "قبول وانضمام ✓"),
                React.createElement("button", {
                  onClick: function() { handleUpdateStatus(u.id, "rejected"); },
                  className: "px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs"
                }, "رفض ✕")
              )
            ),
            React.createElement("div", { className: "p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 text-xs text-slate-600 dark:text-slate-300" },
              React.createElement("span", { className: "font-bold text-slate-400 block mb-0.5" }, "رسالة الزميل الدارس:"),
              u.instituteMessage || "لا توجد رسالة مرفقة"
            )
          );
        })
      ) : React.createElement(
        "div",
        { className: "p-6 text-center text-xs text-slate-400" },
        "لا توجد أي طلبات معلقة حالياً."
      )
    ),

    // 2. قائمة الدارسين المقبولين (Approved)
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" },
      React.createElement("div", { className: "flex items-center justify-between border-b pb-3" },
        React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" }, "الدارسون المعتمدون بالمنصة (" + approvedUsers.length + ")"),
        React.createElement("span", { className: "text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold" }, "نشط")
      ),

      approvedUsers.length > 0 ? React.createElement(
        "div",
        { className: "divide-y divide-slate-100 dark:divide-slate-800" },
        approvedUsers.map(function(u) {
          return React.createElement(
            "div",
            {
              key: u.id,
              className: "py-3 flex items-center justify-between gap-3 text-xs"
            },
            React.createElement("div", null,
              React.createElement("span", { className: "font-bold text-slate-900 dark:text-white block" }, u.fullName),
              React.createElement("span", { className: "text-slate-400" }, u.phone + " • " + u.email)
            ),
            React.createElement("button", {
              onClick: function() {
                if (confirm("هل تريد استبعاد هذا المستخدم وتعليق حسابه؟")) {
                  handleUpdateStatus(u.id, "rejected");
                }
              },
              className: "text-rose-600 hover:text-rose-800 font-semibold"
            }, "إلغاء التفعيل / إخراج")
          );
        })
      ) : React.createElement(
        "div",
        { className: "p-6 text-center text-xs text-slate-400" },
        "لم يتم اعتماد أي دارسين بعد."
      )
    )
  );
};
