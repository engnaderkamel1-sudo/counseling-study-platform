// شاشة إدارة طلبات المستخدمين واعتماد الدارسين (خاصة بالمشرف فقط)
window.UsersManagementPage = function(props) {
  var currentUser = props.currentUser;
  var [users, setUsers] = React.useState([]);
  var [isLoading, setIsLoading] = React.useState(true);
  var [searchQuery, setSearchQuery] = React.useState("");
  var [activeFilter, setActiveFilter] = React.useState("pending"); // "pending", "approved", "rejected", "all"

  var fetchUsers = async function() {
    if (!window.db) return;
    setIsLoading(true);
    try {
      var snap = await window.db.collection("users").get();
      var list = [];
      snap.forEach(function(doc) {
        list.push(Object.assign({ id: doc.id }, doc.data()));
      });
      // ترتيب حسب الأحدث
      list.sort(function(a, b) {
        var tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
        var tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
        return tB - tA;
      });
      setUsers(list);
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
      var matchPhone = (u.phone || "").indexOf(q) !== -1;
      var matchChurch = (u.church || "").toLowerCase().indexOf(q) !== -1;
      return matchName || matchEmail || matchPhone || matchChurch;
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
          "مراجعة بيانات الزملاء الدارسين، نوع دراستهم وكنائسهم قبل منحهم تصريح الدخول للمنصة"
        )
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement("button", {
          onClick: fetchUsers,
          className: "text-xs px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all flex items-center gap-1.5"
        },
          React.createElement("span", null, "🔄"),
          React.createElement("span", null, "تحديث البيانات")
        )
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
        placeholder: "بحث باسم الدارس، الهاتف، الكنيسة، أو الإيميل...",
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
                // شارة نوع الدراسة
                u.studyType && React.createElement("span", { className: "text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md" },
                  u.studyType === "أكاديمي" ? "🎓 أكاديمي" : "📖 ثقافي"
                ),
                // شارة السنة
                u.studyYear && React.createElement("span", { className: "text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-md" },
                  u.studyYear
                )
              ),
              React.createElement("p", { className: "text-xs text-slate-500 dark:text-slate-400" },
                "كنيسة: " + (u.church || "غير محدد") + " • الهاتف: " + (u.phone || "—") + " • البريد: " + (u.email || "—")
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
                  onClick: function() { handleDeleteUser(u.id, u.fullName); },
                  title: "حذف نهائي",
                  className: "text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                },
                "🗑️"
              )
            )
          ),

          // السطر السفلي: تفاصيل إضافية
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
    )
  );
};
