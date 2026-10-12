// شاشة دليل الدارس والوثائق واللوائح الرسمية مع دعم تعدد الملفات لكل قسم والرفع التلقائي لـ Google Drive
window.StudentGuidePage = function(props) {
  var currentUser = props.currentUser || {};
  var isAdmin = !!(currentUser && currentUser.role === "admin");
  var utils = window.APP_UTILS || {};
  var cfg = window.APP_CONFIG || {};

  var [documents, setDocuments] = React.useState([]);
  var [isLoading, setIsLoading] = React.useState(true);

  // حالة النافذة (إضافة / تعديل قسم)
  var [isModalOpen, setIsModalOpen] = React.useState(false);
  var [editingDoc, setEditingDoc] = React.useState(null);
  var [titleInput, setTitleInput] = React.useState("");
  var [descInput, setDescInput] = React.useState("");
  var [categoryInput, setCategoryInput] = React.useState("لوائح ومنهج");
  var [iconInput, setIconInput] = React.useState("📜");
  
  // قائمة الملفات داخل القسم الحالي: [{ name, url, size }]
  var [docFiles, setDocFiles] = React.useState([]);
  var [isSaving, setIsSaving] = React.useState(false);

  // حالة السحب والإفلات والرفع
  var [isDragging, setIsDragging] = React.useState(false);
  var [uploadingStatus, setUploadingStatus] = React.useState("");

  // حالة عارض الـ PDF
  var [activeViewingDoc, setActiveViewingDoc] = React.useState(null);
  var [activeFileIndex, setActiveFileIndex] = React.useState(0);

  var defaultDocs = [
    {
      id: "doc_curriculum",
      title: "المنهج الدراسي وخطة المشورة",
      description: "المقرر الشامل لمواد ودراسة المشورة لجميع الفصول الدراسية",
      files: [],
      driveUrl: "",
      category: "لوائح ومنهج",
      icon: "📑",
      order: 1
    },
    {
      id: "doc_bylaws",
      title: "لائحة معهد المشورة ونظام الدراسة",
      description: "القواعد المنظمة للحضور والغياب، التقييم، ونظام الامتحانات والتخرج",
      files: [],
      driveUrl: "",
      category: "لوائح ومنهج",
      icon: "📜",
      order: 2
    }
  ];

  var normalizeDocFiles = function(d) {
    var files = Array.isArray(d.files) ? d.files.slice() : [];
    if (files.length === 0 && d.driveUrl && d.driveUrl.trim()) {
      files.push({
        name: d.title || "الملف الرئيسي",
        url: d.driveUrl.trim(),
        size: "ملف درايف"
      });
    }
    return Object.assign({}, d, { files: files });
  };

  var fetchDocuments = async function() {
    if (!window.db) {
      setDocuments(defaultDocs.map(normalizeDocFiles));
      setIsLoading(false);
      return;
    }

    try {
      var snap = await window.db.collection("student_guide_docs").orderBy("order", "asc").get();
      if (snap.empty) {
        var batch = window.db.batch();
        defaultDocs.forEach(function(d) {
          var ref = window.db.collection("student_guide_docs").doc(d.id);
          batch.set(ref, Object.assign({}, d, {
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }));
        });
        await batch.commit();
        setDocuments(defaultDocs.map(normalizeDocFiles));
      } else {
        var list = [];
        snap.forEach(function(doc) {
          list.push(normalizeDocFiles(Object.assign({ id: doc.id }, doc.data())));
        });
        setDocuments(list);
        if (utils.setLocal) {
          utils.setLocal("counsel_guide_docs_backup", list);
        }
      }
    } catch (e) {
      console.warn("fetch documents error:", e);
      var localCached = utils.getLocal ? utils.getLocal("counsel_guide_docs_backup", defaultDocs) : defaultDocs;
      setDocuments(localCached.map(normalizeDocFiles));
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
    setDescInput("");
    setCategoryInput("لوائح ومنهج");
    setIconInput("📜");
    setDocFiles([]);
    setIsDragging(false);
    setUploadingStatus("");
    setIsModalOpen(true);
  };

  var handleOpenEditModal = function(doc, e) {
    if (e) e.stopPropagation();
    var normalized = normalizeDocFiles(doc);
    setEditingDoc(normalized);
    setTitleInput(normalized.title || "");
    setDescInput(normalized.description || "");
    setCategoryInput(normalized.category || "لوائح ومنهج");
    setIconInput(normalized.icon || "📜");
    setDocFiles(normalized.files || []);
    setIsDragging(false);
    setUploadingStatus("");
    setIsModalOpen(true);
  };

  // رفع ملف إلى Google Drive
  var uploadSingleFileToDrive = async function(file, customName) {
    var endpoint = cfg.driveUploadEndpoint;
    if (!endpoint) throw new Error("بوابة الرفع السحابية غير معرفة");

    var cleanName = (customName || file.name).replace(/\.[^/.]+$/, "");
    var customFileName = "دليل_الدارس_" + cleanName.replace(/\s+/g, "_") + "_" + Date.now() + ".pdf";

    var resData = await utils.uploadToDriveWithProgress(endpoint, file, null, customFileName);
    if (resData && (resData.fileUrl || resData.viewUrl)) {
      return resData.fileUrl || resData.viewUrl;
    } else if (resData && resData.fileId) {
      return "https://drive.google.com/file/d/" + resData.fileId + "/view";
    }
    throw new Error("فشل استخراج رابط الملف بعد الرفع: " + (resData && resData.message ? resData.message : "خطأ غير معروف"));
  };

  // معالجة الملفات المحددة أو المسحوبة
  var handleFilesIncoming = async function(fileList) {
    if (!fileList || fileList.length === 0) return;
    var arr = Array.from(fileList);

    if (!titleInput.trim() && arr[0]) {
      setTitleInput(arr[0].name.replace(/\.[^/.]+$/, ""));
    }

    setUploadingStatus("جاري رفع " + arr.length + " ملف إلى Google Drive...");
    var newFilesList = docFiles.slice();

    for (var i = 0; i < arr.length; i++) {
      var f = arr[i];
      try {
        setUploadingStatus("جاري رفع (" + (i + 1) + " من " + arr.length + "): " + f.name + " ⏳");
        var url = await uploadSingleFileToDrive(f, f.name);
        newFilesList.push({
          name: f.name.replace(/\.[^/.]+$/, ""),
          url: url,
          size: (f.size ? (f.size / (1024 * 1024)).toFixed(2) + " MB" : "")
        });
        setDocFiles(newFilesList.slice());
      } catch (err) {
        alert("خطأ أثناء رفع ملف (" + f.name + "): " + err.message);
      }
    }
    setUploadingStatus("");
  };

  var handleFileSelect = function(e) {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesIncoming(e.target.files);
    }
  };

  var handleFileDrop = function(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesIncoming(e.dataTransfer.files);
    }
  };

  var handleAddManualUrl = function() {
    var name = prompt("اكتب اسم الملف الفرعي (مثال: اللائحة - الجزء الثاني):");
    if (!name || !name.trim()) return;
    var url = prompt("الصق رابط Google Drive للملف:");
    if (!url || !url.trim()) return;

    setDocFiles(docFiles.concat([{
      name: name.trim(),
      url: url.trim(),
      size: "رابط خارجي"
    }]));
  };

  var handleRemoveFile = function(index) {
    setDocFiles(docFiles.filter(function(_, idx) { return idx !== index; }));
  };

  var handleSaveDoc = async function(e) {
    e.preventDefault();
    if (!titleInput.trim()) {
      alert("يرجى إدخال عنوان القسم أو الوثيقة");
      return;
    }

    if (docFiles.length === 0) {
      alert("يرجى اختيار ملف لرفعه أولاً أو إضافة رابط مباشر.");
      return;
    }

    setIsSaving(true);
    try {
      var docId = editingDoc ? editingDoc.id : ("doc_" + Date.now());
      var mainUrl = docFiles[0] ? docFiles[0].url : "";

      var payload = {
        title: titleInput.trim(),
        files: docFiles,
        driveUrl: mainUrl,
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
      if (utils.getLocal && utils.setLocal) {
        var currentLocal = utils.getLocal("counsel_guide_docs_backup", []);
        var updated = currentLocal.filter(function(d) { return d.id !== docId; });
        updated.push(normalizeDocFiles(Object.assign({ id: docId }, payload)));
        utils.setLocal("counsel_guide_docs_backup", updated);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert("خطأ أثناء حفظ البيانات: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  var handleDeleteDoc = async function(doc, e) {
    if (e) e.stopPropagation();
    if (!confirm("هل أنت متأكد من حذف قسم '" + doc.title + "' وجميع ملفاته؟")) return;
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
    var driveId = utils.extractDriveId ? utils.extractDriveId(url) : "";
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
        "إضافة قسم أو مجلد ملفات جديد"
      )
    ),

    // شبكة البطاقات
    React.createElement(
      "div",
      { className: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" },
      documents.map(function(doc) {
        var filesList = (doc.files && doc.files.length > 0) ? doc.files : (doc.driveUrl ? [{ name: doc.title, url: doc.driveUrl }] : []);
        var hasFiles = filesList.length > 0;

        return React.createElement(
          "div",
          {
            key: doc.id,
            className: "group bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
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
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-2 mt-0.5" },
                    React.createElement("span", { className: "text-[11px] font-semibold text-slate-400 dark:text-slate-500" }, doc.category || "وثيقة رسمية"),
                    filesList.length > 1 && React.createElement("span", { className: "text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800" }, filesList.length + " ملفات مجمعة")
                  )
                )
              ),
              isAdmin && React.createElement(
                "div",
                { className: "flex items-center gap-1.5 opacity-90" },
                React.createElement("button", {
                  onClick: function(e) { handleOpenEditModal(doc, e); },
                  title: "إضافة ملفات أو تعديل البيانات",
                  className: "p-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
                }, "✏️"),
                React.createElement("button", {
                  onClick: function(e) { handleDeleteDoc(doc, e); },
                  title: "حذف القسم وملفاته",
                  className: "p-2 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-all"
                }, "🗑️")
              )
            ),

            doc.description ? React.createElement(
              "p",
              { className: "text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed" },
              doc.description
            ) : null,

            // قائمة الملفات المندرجة تحت هذا القسم
            hasFiles ? React.createElement(
              "div",
              { className: "space-y-1.5 pt-1" },
              filesList.map(function(f, idx) {
                return React.createElement(
                  "div",
                  {
                    key: idx,
                    onClick: function() {
                      setActiveViewingDoc(doc);
                      setActiveFileIndex(idx);
                    },
                    className: "p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 cursor-pointer transition-all text-xs"
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-2 truncate" },
                    React.createElement("span", { className: "text-indigo-600 dark:text-indigo-400 font-bold" }, (idx + 1) + "."),
                    React.createElement("span", { className: "font-bold text-slate-800 dark:text-slate-200 truncate" }, f.name || ("الملف رقم " + (idx + 1))),
                    f.size ? React.createElement("span", { className: "text-[10px] text-slate-400" }, "(" + f.size + ")") : null
                  ),
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-1 shrink-0" },
                    React.createElement("a", {
                      href: f.url,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      onClick: function(e) { e.stopPropagation(); },
                      className: "p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition-all",
                      title: "تحميل"
                    }, "📥"),
                    React.createElement("span", { className: "text-[11px] font-bold text-indigo-600 dark:text-indigo-400" }, "عرض 👁️")
                  )
                );
              })
            ) : React.createElement(
              "div",
              { className: "p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-300 text-center" },
              isAdmin ? "لا توجد ملفات مرفوعة بعد، اضغط ✏️ لإضافة ورفع الملفات" : "جاري تجهيز ورفع الملفات من قبل الإدارة ⏳"
            )
          ),

          // شريط الحالة السفلي
          React.createElement(
            "div",
            { className: "pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs" },
            React.createElement(
              "span",
              { className: "font-bold text-slate-400 flex items-center gap-1.5" },
              React.createElement("span", { className: "w-2 h-2 rounded-full " + (hasFiles ? "bg-emerald-500" : "bg-amber-500") }),
              hasFiles ? (filesList.length + " ملف متوفر للقراءة") : "في انتظار الرفع"
            ),
            hasFiles && React.createElement(
              "button",
              {
                type: "button",
                onClick: function() {
                  setActiveViewingDoc(doc);
                  setActiveFileIndex(0);
                },
                className: "px-3 py-1.5 rounded-xl font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
              },
              "فتح واستعراض 📖"
            )
          )
        );
      })
    ),

    // نافذة إضافة / تعديل قسم (للأدمن) مع دعم رفع عدة ملفات
    isModalOpen && React.createElement(
      "div",
      { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4", dir: "rtl" },
      React.createElement(
        "div",
        { className: "bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3" },
          React.createElement("h3", { className: "text-base font-bold text-slate-900 dark:text-white" },
            editingDoc ? "تعديل وإضافة ملفات للقسم" : "إضافة قسم ووثائق جديدة لدليل الدارس"
          ),
          React.createElement("button", { onClick: function() { if (!isSaving && !uploadingStatus) setIsModalOpen(false); }, className: "text-slate-400 hover:text-slate-600" }, "✕")
        ),

        React.createElement(
          "form",
          { onSubmit: handleSaveDoc, className: "space-y-4" },

          React.createElement("div", null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300" }, "عنوان القسم (مثلاً: اللائحة أو المنهج الدراسي) *"),
            React.createElement("input", {
              type: "text",
              required: true,
              value: titleInput,
              onChange: function(e) { setTitleInput(e.target.value); },
              placeholder: "اكتب العنوان الرئيسي...",
              className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
            })
          ),

          // منطقة سحب وإفلات لعدة ملفات
          React.createElement(
            "div",
            {
              onDragOver: function(e) { e.preventDefault(); setIsDragging(true); },
              onDragLeave: function(e) { e.preventDefault(); setIsDragging(false); },
              onDrop: handleFileDrop,
              className: "p-4 sm:p-5 rounded-2xl border-2 border-dashed transition-all text-center space-y-2 " +
                (isDragging ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]" : "border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 hover:border-indigo-400")
            },
            React.createElement("label", { className: "cursor-pointer block space-y-2 select-none" },
              React.createElement("div", { className: "text-3xl" }, isDragging ? "📥" : "☁️"),
              React.createElement("div", { className: "text-xs font-bold text-slate-700 dark:text-slate-200" },
                isDragging ? "أفلت الملفات هنا للرفع التلقائي..." : "اسحب وأفلت ملف أو عدة ملفات (PDF) هنا"
              ),
              React.createElement("span", { className: "inline-block text-[11px] text-indigo-600 dark:text-indigo-400 underline font-semibold" }, "أو اضغط لتصفح واختيار ملفات من جهازك (يمكن اختيار أكثر من ملف دفعة واحدة)"),
              React.createElement("input", {
                type: "file",
                multiple: true,
                accept: "application/pdf,image/*",
                onChange: handleFileSelect,
                disabled: isSaving || !!uploadingStatus,
                className: "hidden"
              })
            )
          ),

          // حالة الرفع السحابي المتتابع
          uploadingStatus ? React.createElement(
            "div",
            { className: "p-3 bg-slate-900 text-white rounded-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-pulse" },
            React.createElement("span", { className: "animate-spin" }, "⏳"),
            React.createElement("span", null, uploadingStatus)
          ) : null,

          // قائمة الملفات المرفوعة تحت هذا القسم
          React.createElement(
            "div",
            { className: "space-y-2" },
            React.createElement(
              "div",
              { className: "flex items-center justify-between" },
              React.createElement("label", { className: "text-xs font-bold text-slate-700 dark:text-slate-300" }, "الملفات المرفقة في هذا القسم (" + docFiles.length + ")"),
              React.createElement("button", {
                type: "button",
                onClick: handleAddManualUrl,
                className: "text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              }, "+ إضافة رابط خارجي 🔗")
            ),

            docFiles.length > 0 ? React.createElement(
              "div",
              { className: "space-y-1.5 max-h-44 overflow-y-auto" },
              docFiles.map(function(fileItem, idx) {
                return React.createElement(
                  "div",
                  {
                    key: idx,
                    className: "p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-2 truncate" },
                    React.createElement("span", { className: "font-bold text-indigo-600 dark:text-indigo-400" }, (idx + 1) + "."),
                    React.createElement("input", {
                      type: "text",
                      value: fileItem.name,
                      onChange: function(e) {
                        var val = e.target.value;
                        setDocFiles(docFiles.map(function(item, i) {
                          if (i === idx) return Object.assign({}, item, { name: val });
                          return item;
                        }));
                      },
                      placeholder: "اسم الملف...",
                      className: "bg-transparent font-bold text-slate-800 dark:text-slate-200 border-b border-transparent hover:border-slate-400 focus:border-indigo-500 outline-none px-1 py-0.5"
                    })
                  ),
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-2 shrink-0" },
                    fileItem.size ? React.createElement("span", { className: "text-[10px] text-slate-400" }, fileItem.size) : null,
                    React.createElement("button", {
                      type: "button",
                      onClick: function() { handleRemoveFile(idx); },
                      className: "text-rose-500 hover:text-rose-700 font-bold text-xs p-1"
                    }, "✕")
                  )
                );
              })
            ) : React.createElement(
              "div",
              { className: "p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400" },
              "لم تقم بإضافة ملفات بعد. اختر ملفاً أو عدة ملفات من جهازك لرفعها."
            )
          ),

          React.createElement("div", null,
            React.createElement("label", { className: "block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300" }, "وصف مختصر للقسم"),
            React.createElement("textarea", {
              rows: 2,
              value: descInput,
              onChange: function(e) { setDescInput(e.target.value); },
              placeholder: "نبذة عن محتوى الملفات وأهميتها للدارس...",
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
              disabled: isSaving || !!uploadingStatus,
              onClick: function() { setIsModalOpen(false); },
              className: "px-4 py-2 text-xs rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }, "إلغاء"),
            React.createElement("button", {
              type: "submit",
              disabled: isSaving || !!uploadingStatus,
              className: "px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            }, isSaving ? "جاري الحفظ..." : "حفظ القسم وملفاته ✓")
          )
        )
      )
    ),

    // عارض الـ PDF المدمج
    activeViewingDoc && (function() {
      var filesList = (activeViewingDoc.files && activeViewingDoc.files.length > 0)
        ? activeViewingDoc.files
        : (activeViewingDoc.driveUrl ? [{ name: activeViewingDoc.title, url: activeViewingDoc.driveUrl }] : []);
      
      var currentFile = filesList[activeFileIndex] || filesList[0];
      if (!currentFile) return null;

      return React.createElement(
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
            { className: "px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50" },
            React.createElement(
              "div",
              { className: "flex items-center gap-2.5 truncate" },
              React.createElement("span", { className: "text-2xl" }, activeViewingDoc.icon || "📄"),
              React.createElement(
                "div",
                { className: "truncate" },
                React.createElement("h3", { className: "text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate" }, 
                  activeViewingDoc.title + (filesList.length > 1 ? (" - " + currentFile.name) : "")
                ),
                React.createElement("p", { className: "text-[11px] text-slate-400 truncate" }, activeViewingDoc.category || "دليل الدارس")
              )
            ),
            React.createElement(
              "div",
              { className: "flex items-center gap-2 shrink-0" },
              React.createElement("a", {
                href: currentFile.url,
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

          // شريط التبديل بين الملفات المتعددة
          filesList.length > 1 && React.createElement(
            "div",
            { className: "px-4 py-2 bg-indigo-50/60 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto" },
            React.createElement("span", { className: "text-xs font-bold text-slate-500 shrink-0" }, "أجزاء الملف:"),
            filesList.map(function(f, idx) {
              var isSel = idx === activeFileIndex;
              return React.createElement(
                "button",
                {
                  key: idx,
                  onClick: function() { setActiveFileIndex(idx); },
                  className: "px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1 " +
                    (isSel ? "bg-indigo-600 text-white shadow-xs" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200")
                },
                React.createElement("span", null, (idx + 1) + "."),
                React.createElement("span", null, f.name || ("الملف " + (idx + 1)))
              );
            })
          ),

          // إطار عرض الـ PDF المباشر
          React.createElement(
            "div",
            { className: "flex-1 bg-slate-950 relative" },
            React.createElement("iframe", {
              src: getEmbedUrl(currentFile.url),
              className: "w-full h-full border-0",
              allow: "autoplay",
              title: currentFile.name || activeViewingDoc.title
            })
          )
        )
      );
    })()
  );
};
