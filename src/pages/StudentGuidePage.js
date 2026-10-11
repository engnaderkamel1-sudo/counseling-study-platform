// شاشة دليل الدارس والوثائق واللوائح الرسمية
window.StudentGuidePage = function(props) {
  var currentUser = props.currentUser || {};
  var isAdmin = !!(currentUser && currentUser.role === "admin");

  var [documents, setDocuments] = React.useState([]);
  var [isLoading, setIsLoading] = React.useState(true);

  // حالة النافذة (إضافة / تعديل)
  var [isModalOpen, setIsModalOpen] = React.useState(false);
  var [editingDoc, setEditingDoc] = React.useState(null);
  var [titleInput, setTitleInput] = React.useState("");
  var [driveUrlInput, setDriveUrlInput] = React.useState("");
  var [descInput, setDescInput] = React.useState("");
  var [categoryInput, setCategoryInput] = React.useState("لوائح ومنهج");
  var [iconInput, setIconInput] = React.useState("📜");
  var [isSaving, setIsSaving] = React.useState(false);

  // حالة عارض الـ PDF
  var [activeViewingDoc, setActiveViewingDoc] = React.useState(null);

  var defaultDocs = [
    {
      id: "doc_curriculum",
      title: "المنهج الدراسي وخطة المشورة",
      description: "المقرر الشامل لمواد ودراسة المشورة لجميع الفصول الدراسية",
      driveUrl: "",
      category: "لوائح ومنهج",
      icon: "📑",
      order: 1
    },
    {
      id: "doc_bylaws",
      title: "لائحة معهد المشورة ونظام الدراسة",
      description: "القواعد المنظمة للحضور والغياب، التقييم، ونظام الامتحانات والتخرج",
      driveUrl: "",
      category: "لوائح ومنهج",
      icon: "📜",
      order: 2
    }
  ];

  var fetchDocuments = async function() {
    if (!window.db) {
      setDocuments(defaultDocs);
      setIsLoading(false);
      return;
    }

    try {
      var snap = await window.db.collection("student_guide_docs").orderBy("order", "asc").get();
      if (snap.empty) {
        // إذا كانت فارغة لأول مرة، نضيف القوالب الافتراضية في قاعدة البيانات
        var batch = window.db.batch();
        defaultDocs.forEach(function(d) {
          var ref = window.db.collection("student_guide_docs").doc(d.id);
          batch.set(ref, Object.assign({}, d, {
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }));
        });
        await batch.commit();
        setDocuments(defaultDocs);
      } else {
        var list = [];
        snap.forEach(function(doc) {
          list.push(Object.assign({ id: doc.id }, doc.data()));
        });
        setDocuments(list);
      }
    } catch (e) {
      console.warn("fetch documents error:", e);
      var localCached = window.APP_UTILS.getLocal("counsel_guide_docs_backup", defaultDocs);
      setDocuments(localCached);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(function() {
    fetchDocuments();
  }, []);

  var handleOpenAddModal = function() {
    setEditingDoc(null);
    setTitleInput("");
    setDriveUrlInput("");
    setDescInput("");
    setCategoryInput("لوائح ومنهج");
    setIconInput("📜");
    setIsModalOpen(true);
  };

  var handleOpenEditModal = function(doc, e) {
    if (e) e.stopPropagation();
    setEditingDoc(doc);
    setTitleInput(doc.title || "");
    setDriveUrlInput(doc.driveUrl || "");
    setDescInput(doc.description || "");
    setCategoryInput(doc.category || "لوائح ومنهج");
    setIconInput(doc.icon || "📜");
    setIsModalOpen(true);
  };

  var handleSaveDoc = async function(e) {
    e.preventDefault();
    if (!titleInput.trim()) {
      alert("يرجى إدخال عنوان الملف");
      return;
    }
    setIsSaving(true);
    try {
      var docId = editingDoc ? editingDoc.id : ("doc_" + Date.now());
      var payload = {
        title: titleInput.trim(),
        driveUrl: driveUrlInput.trim(),
        description: descInput.trim(),
        category: categoryInput.trim(),
        icon: iconInput.trim() || "📄",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (!editingDoc) {
        payload.order = documents.length + 1;
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      }

      if (window.db) {
        await window.db.collection("student_guide_docs").doc(docId).set(payload, { merge: true });
      }

      await fetchDocuments();
      setIsModalOpen(false);
    } catch (err) {
      alert("خطأ أثناء الحفظ: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  var handleDeleteDoc = async function(doc, e) {
    if (e) e.stopPropagation();
    if (!confirm("هل أنت متأكد من حذف ملف '" + doc.title + "'؟")) return;
    try {
      if (window.db) {
        await window.db.collection("student_guide_docs").doc(doc.id).delete();
      }
      setDocuments(documents.filter(function(d) { return d.id !== doc.id; }));
    } catch (err) {
      alert("خطأ أثناء الحذف: " + err.message);
    }
  };

  var getEmbedUrl = function(url) {
    if (!url) return "";
    var driveId = window.APP_UTILS.extractDriveId(url);
    if (driveId) {
      return "https://drive.google.com/file/d/" + driveId + "/preview";
    }
    return url;
  };

  return React.createElement(
    "div",
    { className: "space-y-6 pb-16" },

    // ترويسة الصفحة
    React.createElement(
      "div",
      { className: "bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" },
      React.createElement(
        "div",
        null,
        React.createElement("h2", { className: "text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5" },
          React.createElement("span", null, "📋"),
          "دليل الدارس واللوائح الرسمية"
        ),
        React.createElement("p", { className: "text-xs sm:text-sm text-slate-500 mt-1" }, "المرجع الإداري والأكاديمي الشامل: المنهج الدراسي، اللوائح، الجداول، والمرفقات الرسمية")
      ),
      isAdmin && React.createElement(
        "button",
        {
          onClick: handleOpenAddModal,
          className: "px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
        },
        React.createElement("span", null, "➕"),
        "إضافة ملف جديد"
      )
    ),

    // شبكة الملفات
    React.createElement(
      "div",
      { className: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" },
      documents.map(function(doc) {
        var hasUrl = !!(doc.driveUrl && doc.driveUrl.trim());
        return React.createElement(
          "div",
          {
            key: doc.id,
            onClick: function() {
              if (hasUrl) setActiveViewingDoc(doc);
              else if (isAdmin) handleOpenEditModal(doc);
              else alert("جاري تجهيز ورفع هذا الملف قريباً من قبل إدارة المعهد.");
            },
            className: "group bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
          },

          React.createElement(
            "div",
            { className: "space-y-3" },
            React.createElement(
              "div",
              { className: "flex items-start justify-between gap-3" },
              React.createElement(
                "div",
                { className: "flex items-center gap-3" },
                React.createElement("div", { className: "w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-2xs" }, doc.icon || "📄"),
                React.createElement(
                  "div",
                  null,
                  React.createElement("h3", { className: "text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" }, doc.title),
                  React.createElement("span", { className: "text-[11px] font-semibold text-slate-400 dark:text-slate-500" }, doc.category || "وثيقة رسمية")
                )
              ),
              isAdmin && React.createElement(
                "div",
                { className: "flex items-center gap-1.5 opacity-90", onClick: function(e) { e.stopPropagation(); } },
                React.createElement("button", {
                  onClick: function(e) { handleOpenEditModal(doc, e); },
                  title: "تعديل الملف أو الرابط",
                  className: "p-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
                }, "✏️"),
                React.createElement("button", {
                  onClick: function(e) { handleDeleteDoc(doc, e); },
                  title: "حذف الملف",
                  className: "p-2 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-all"
                }, "🗑️")
              )
            ),

            doc.description ? React.createElement(
              "p",
              { className: "text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed" },
              doc.description
            ) : null
          ),

          // شريط الأزرار والحالة
          React.createElement(
            "div",
            { className: "pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between" },
            hasUrl ? React.createElement(
              "span",
              { className: "text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5" },
              React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }),
              "جاهز للقراءة والاطلاع"
            ) : React.createElement(
              "span",
              { className: "text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5" },
              React.createElement("span", { className: "w-2 h-2 rounded-full bg-amber-500" }),
              isAdmin ? "اضغط لربط رابط درايف 🔗" : "قيد التجهيز من الإدارة ⏳"
            ),

            React.createElement(
              "div",
              { className: "flex items-center gap-2" },
              hasUrl && React.createElement("a", {
                href: doc.driveUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                onClick: function(e) { e.stopPropagation(); },
                title: "تحميل الملف من جوجل درايف",
                className: "p-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all"
              }, "📥 تحميل"),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "px-4 py-2 rounded-xl text-xs font-bold " + (hasUrl ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400") + " transition-all flex items-center gap-1"
                },
                "عرض الملف 👁️"
              )
            )
          )
        );
      })
    ),

    // نافذة إضافة / تعديل ملف (للأدمن)
    isModalOpen && React.createElement(
      "div",
      { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4", dir: "rtl" },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" },
            editingDoc ? "تعديل بيانات الملف" : "إضافة ملف جديد لدليل الدارس"
          ),
          React.createElement("button", { onClick: function() { setIsModalOpen(false); }, className: "text-slate-400 hover:text-slate-600" }, "✕")
        ),

        React.createElement(
          "form",
          { onSubmit: handleSaveDoc, className: "space-y-4" },
          React.createElement("div", null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300" }, "عنوان الملف (مثلاً: اللائحة أو جدول الامتحانات) *"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: titleInput,
              onChange: function(e) { setTitleInput(e.target.value); },
              placeholder: "اكتب اسم الملف...",
              className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
            })
          ),

          React.createElement("div", null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300" }, "رابط ملف الـ PDF من Google Drive *"),
            React.createElement("input", {
              type: "url",
              required: true,
              value: driveUrlInput,
              onChange: function(e) { setDriveUrlInput(e.target.value); },
              placeholder: "https://drive.google.com/file/d/.../view",
              className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 ltr",
              dir: "ltr"
            }),
            React.createElement("span", { className: "text-[11px] text-slate-400 mt-1 block" }, "تأكد من ضبط مشاركة الملف في جوجل درايف على (Anyone with the link can view)")
          ),

          React.createElement("div", null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300" }, "وصف مختصر للملف"),
            React.createElement("textarea", {
              rows: 2,
              value: descInput,
              onChange: function(e) { setDescInput(e.target.value); },
              placeholder: "نبذة عن محتوى الملف وأهميته للدارس...",
              className: "w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
            })
          ),

          React.createElement(
            "div",
            { className: "grid grid-cols-2 gap-3" },
            React.createElement("div", null,
              React.createElement("label", { className: "block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300" }, "التصنيف"),
              React.createElement("select", {
                value: categoryInput,
                onChange: function(e) { setCategoryInput(e.target.value); },
                className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              },
                React.createElement("option", { value: "لوائح ومنهج" }, "لوائح ومنهج"),
                React.createElement("option", { value: "جداول ومواعيد" }, "جداول ومواعيد"),
                React.createElement("option", { value: "نماذج واستمارات" }, "نماذج واستمارات"),
                React.createElement("option", { value: "مرفقات عامة" }, "مرفقات عامة")
              )
            ),
            React.createElement("div", null,
              React.createElement("label", { className: "block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300" }, "الأيقونة التعبيرية"),
              React.createElement("select", {
                value: iconInput,
                onChange: function(e) { setIconInput(e.target.value); },
                className: "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              },
                React.createElement("option", { value: "📜" }, "📜 وثيقة ولائحة"),
                React.createElement("option", { value: "📑" }, "📑 منهج وخطة"),
                React.createElement("option", { value: "🗓️" }, "🗓️ جدول تقويم"),
                React.createElement("option", { value: "🎯" }, "🎯 امتحانات"),
                React.createElement("option", { value: "📝" }, "📝 استمارة"),
                React.createElement("option", { value: "📎" }, "📎 مرفق عام")
              )
            )
          ),

          React.createElement(
            "div",
            { className: "flex justify-end gap-2 pt-3" },
            React.createElement("button", {
              type: "button",
              onClick: function() { setIsModalOpen(false); },
              className: "px-4 py-2 text-xs rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }, "إلغاء"),
            React.createElement("button", {
              type: "submit",
              disabled: isSaving,
              className: "px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
            }, isSaving ? "جاري الحفظ..." : "حفظ الملف ✓")
          )
        )
      )
    ),

    // نافذة عارض الـ PDF المدمج
    activeViewingDoc && React.createElement(
      "div",
      {
        className: "fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-fadeIn",
        dir: "rtl"
      },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 rounded-3xl flex-1 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl" },
        // ترويسة العارض
        React.createElement(
          "div",
          { className: "px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2.5 truncate" },
            React.createElement("span", { className: "text-2xl" }, activeViewingDoc.icon || "📄"),
            React.createElement(
              "div",
              { className: "truncate" },
              React.createElement("h3", { className: "text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate" }, activeViewingDoc.title),
              React.createElement("p", { className: "text-[11px] text-slate-400 truncate" }, activeViewingDoc.category || "دليل الدارس")
            )
          ),
          React.createElement(
            "div",
            { className: "flex items-center gap-2 shrink-0" },
            React.createElement("a", {
              href: activeViewingDoc.driveUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all"
            }, "📥 تحميل"),
            React.createElement("button", {
              onClick: function() { setActiveViewingDoc(null); },
              className: "w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center transition-all"
            }, "✕")
          )
        ),

        // إطار عرض الـ PDF المباشر من جوجل درايف
        React.createElement(
          "div",
          { className: "flex-1 bg-slate-950 relative" },
          React.createElement("iframe", {
            src: getEmbedUrl(activeViewingDoc.driveUrl),
            className: "w-full h-full border-0",
            allow: "autoplay",
            title: activeViewingDoc.title
          })
        )
      )
    )
  );
};
