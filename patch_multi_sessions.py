import re

# 1. Patch AddLectureModal.js
path_add = "src/components/lectures/AddLectureModal.js"
with open(path_add, "r", encoding="utf-8") as f:
    code_add = f.read()

target_add = """            React.createElement("select", {
              value: newSessionOrder,
              onChange: function(e) { setNewSessionOrder(e.target.value); },
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
            }, [
              React.createElement("option", { key: 1, value: 1 }, "المحاضرة الأولى"),
              React.createElement("option", { key: 2, value: 2 }, "المحاضرة الثانية"),
              React.createElement("option", { key: 3, value: 3 }, "المحاضرة الثالثة")
            ])
          )
        ),"""

replacement_add = """            React.createElement("select", {
              value: newSessionOrder,
              onChange: function(e) { setNewSessionOrder(parseInt(e.target.value) || 1); },
              className: "w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-bold"
            }, [
              React.createElement("option", { key: 1, value: 1 }, "المحاضرة الأولى (جلسة 1)"),
              React.createElement("option", { key: 2, value: 2 }, "المحاضرة الثانية (جلسة 2)"),
              React.createElement("option", { key: 3, value: 3 }, "المحاضرة الثالثة (جلسة 3)"),
              React.createElement("option", { key: 4, value: 4 }, "المحاضرة الرابعة (جلسة 4)")
            ])
          )
        ),

        (parseInt(newSessionOrder) > 1) && React.createElement(
          "div",
          { className: "p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 font-bold animate-in fade-in duration-150" },
          React.createElement("span", { className: "text-base" }, "✨"),
          React.createElement("span", null, "تسجيل جلسة ثانية/إضافية لنفس اليوم الدراسي (" + (newDate || "") + ")")
        ),"""

# Normalize CRLF for matching
target_add_norm = target_add.replace("\r\n", "\n")
code_add_norm = code_add.replace("\r\n", "\n")

if target_add_norm in code_add_norm:
    code_add_norm = code_add_norm.replace(target_add_norm, replacement_add.replace("\r\n", "\n"), 1)
    with open(path_add, "w", encoding="utf-8", newline="\n") as f:
        f.write(code_add_norm)
    print("AddLectureModal.js patched successfully!")
else:
    print("AddLectureModal.js target not found!")

# 2. Patch LectureRow.js
path_row = "src/components/lectures/LectureRow.js"
with open(path_row, "r", encoding="utf-8") as f:
    code_row = f.read().replace("\r\n", "\n")

target_badge = """(lec.sessionOrder && lec.sessionOrder > 1) && React.createElement("span", { className: "text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md shrink-0" }, "جلسة " + lec.sessionOrder)"""

replacement_badge = """(lec.sessionOrder && (lec.sessionOrder > 1 || props.hasMultipleSessions)) && React.createElement(
            "span",
            { className: "text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 shrink-0" },
            "جلسة " + (lec.sessionOrder || 1)
          )"""

target_admin_btns = """      // أزرار المسؤول (تعديل وحذف)
      currentUser.role === "admin" && React.createElement(
        "div",
        { className: "flex items-center gap-1" },"""

replacement_admin_btns = """      // أزرار المسؤول (تعديل وحذف وإضافة جلسة تالية)
      currentUser.role === "admin" && React.createElement(
        "div",
        { className: "flex items-center gap-1" },
        props.onAddSession && React.createElement(
          "button",
          {
            type: "button",
            onClick: function(e) {
              e.stopPropagation();
              props.onAddSession(lec);
            },
            title: "إضافة جلسة أو محاضرة ثانية لهذا اليوم (" + (lec.date || "") + ")",
            className: "p-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors font-bold flex items-center gap-0.5 shadow-2xs"
          },
          React.createElement("span", null, "➕"),
          React.createElement("span", { className: "hidden xl:inline text-[10px]" }, "جلسة ثانية")
        ),"""

if target_badge in code_row and target_admin_btns in code_row:
    code_row = code_row.replace(target_badge, replacement_badge, 1)
    code_row = code_row.replace(target_admin_btns, replacement_admin_btns, 1)
    with open(path_row, "w", encoding="utf-8", newline="\n") as f:
        f.write(code_row)
    print("LectureRow.js patched successfully!")
else:
    print("LectureRow.js target not found!")

# 3. Patch LectureViewerModal.js
path_modal = "src/components/lectures/LectureViewerModal.js"
with open(path_modal, "r", encoding="utf-8") as f:
    code_modal = f.read().replace("\r\n", "\n")

target_modal_badge = """            actSeq.isExam
              ? React.createElement("span", { className: "text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800" }, "📝 امتحان وتقييم نهائي")
              : React.createElement("span", { className: "text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-lg" }, "المحاضرة رقم: " + actSeq.num),"""

replacement_modal_badge = """            actSeq.isExam
              ? React.createElement("span", { className: "text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800" }, "📝 امتحان وتقييم نهائي")
              : React.createElement("span", { className: "text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-lg" }, "المحاضرة رقم: " + actSeq.num),
            (activeLecture.sessionOrder && (activeLecture.sessionOrder > 1 || props.hasMultipleSessions)) && React.createElement(
              "span",
              { className: "text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800" },
              "الجلسة رقم: " + activeLecture.sessionOrder
            ),"""

target_modal_btn = """        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (openEditModal) openEditModal(activeLecture, "all"); },
            className: "px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
          },
          "تعديل البيانات والروابط"
        ),"""

replacement_modal_btn = """        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { if (openEditModal) openEditModal(activeLecture, "all"); },
            className: "px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
          },
          "تعديل البيانات والروابط"
        ),
        props.onAddSession && React.createElement(
          "button",
          {
            type: "button",
            onClick: function() { props.onAddSession(activeLecture); },
            className: "px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs border border-indigo-200 dark:border-indigo-900",
            title: "إضافة محاضرة أو جلسة تالية لنفس تاريخ هذا اليوم"
          },
          React.createElement("span", null, "➕"),
          React.createElement("span", null, "إضافة جلسة ثانية لهذا اليوم")
        ),"""

if target_modal_badge in code_modal and target_modal_btn in code_modal:
    code_modal = code_modal.replace(target_modal_badge, replacement_modal_badge, 1)
    code_modal = code_modal.replace(target_modal_btn, replacement_modal_btn, 1)
    with open(path_modal, "w", encoding="utf-8", newline="\n") as f:
        f.write(code_modal)
    print("LectureViewerModal.js patched successfully!")
else:
    print("LectureViewerModal.js target not found!")

# 4. Patch LecturesPage.js
path_page = "src/pages/LecturesPage.js"
with open(path_page, "r", encoding="utf-8") as f:
    code_page = f.read().replace("\r\n", "\n")

target_page_fn = """  var handleAddLecture = async function(e) {"""

addition_page_fn = """  var handleAddSessionForLecture = function(targetLec) {
    if (!targetLec) return;
    var targetDate = (targetLec.date || "").trim() || new Date().toISOString().split("T")[0];
    var sameDateLectures = lectures.filter(function(l) {
      return (l.date || "").trim() === targetDate;
    });
    var maxSession = 1;
    sameDateLectures.forEach(function(l) {
      var s = parseInt(l.sessionOrder) || 1;
      if (s > maxSession) maxSession = s;
    });
    var nextSession = maxSession + 1;

    setNewDate(targetDate);
    setNewSessionOrder(nextSession);
    setNewSubject(targetLec.subject || "");
    setNewTitle("");
    setNewSpeaker("");
    setNewMediaUrl("");
    setNewHandoutUrl("");
    setNewHandoutName("");
    setNewAudioSummaryUrl("");
    setNewWrittenSummary("");
    setNewQuizText("");
    setNewNotes("");
    setNewZoomUrl("");
    setNewMeetingId("");
    setNewPasscode("");
    setNewZoomTimeStr("");
    setSelectedFile(null);

    if (activeLecture) setActiveLecture(null);
    setShowAddModal(true);
  };

  var handleAddLecture = async function(e) {"""

target_page_rows = """        return React.createElement(window.LectureRow, {
          key: lec.id,
          lec: lec,
          seq: seq,
          st: st,
          isCurrent: isCurrent,
          isCompleted: isDone,
          onToggleCompleted: handleToggleCompleted,
          currentUser: currentUser,
          utils: utils,
          onSelect: function(item) { setActiveLecture(item); },
          onEdit: function(item) { openEditModal(item); },
          onDelete: function(item) { handleDeleteLecture(item); },
          onClearZoom: function(item) { handleClearZoomLink(item); }
        });"""

replacement_page_rows = """        var hasMultiSessions = (dateSessionsCount[(lec.date || "").trim()] || 0) > 1;

        return React.createElement(window.LectureRow, {
          key: lec.id,
          lec: lec,
          seq: seq,
          st: st,
          isCurrent: isCurrent,
          isCompleted: isDone,
          hasMultipleSessions: hasMultiSessions,
          onToggleCompleted: handleToggleCompleted,
          currentUser: currentUser,
          utils: utils,
          onSelect: function(item) { setActiveLecture(item); },
          onEdit: function(item) { openEditModal(item); },
          onDelete: function(item) { handleDeleteLecture(item); },
          onClearZoom: function(item) { handleClearZoomLink(item); },
          onAddSession: handleAddSessionForLecture
        });"""

target_page_viewer = """    // مشغل المحاضرة ومحتواها التفاعلي في نافذة منبثقة مستقلة
    activeLecture && React.createElement(window.LectureViewerModal, {
      activeLecture: activeLecture,
      onClose: function() { setActiveLecture(null); },
      currentUser: currentUser,
      utils: utils,
      cloud: cloud,
      ai: ai,
      itemSeqInfo: itemSeqInfo,
      isItemExam: isItemExam,
      getLectureStatus: getLectureStatus,
      openEditModal: openEditModal,
      handleDeleteLecture: handleDeleteLecture,
      handleClearZoom: handleClearZoomLink,
      handleSavePosition: handleSavePosition,
      filteredLectures: filteredLectures,
      onSelectLecture: function(item) { setActiveLecture(item); }
    }),"""

replacement_page_viewer = """    // مشغل المحاضرة ومحتواها التفاعلي في نافذة منبثقة مستقلة
    activeLecture && React.createElement(window.LectureViewerModal, {
      activeLecture: activeLecture,
      onClose: function() { setActiveLecture(null); },
      currentUser: currentUser,
      utils: utils,
      cloud: cloud,
      ai: ai,
      itemSeqInfo: itemSeqInfo,
      isItemExam: isItemExam,
      getLectureStatus: getLectureStatus,
      openEditModal: openEditModal,
      handleDeleteLecture: handleDeleteLecture,
      handleClearZoom: handleClearZoomLink,
      handleSavePosition: handleSavePosition,
      filteredLectures: filteredLectures,
      onSelectLecture: function(item) { setActiveLecture(item); },
      hasMultipleSessions: activeLecture && ((dateSessionsCount[(activeLecture.date || "").trim()] || 0) > 1),
      onAddSession: handleAddSessionForLecture
    }),"""

# Also ensure dateSessionsCount is computed right before render:
target_counts = """  var sortedAll = lectures.slice().sort(function(a, b) {"""

addition_counts = """  var dateSessionsCount = {};
  lectures.forEach(function(l) {
    var d = (l.date || "").trim();
    if (d) {
      dateSessionsCount[d] = (dateSessionsCount[d] || 0) + 1;
    }
  });

  var sortedAll = lectures.slice().sort(function(a, b) {"""

if (target_page_fn in code_page and 
    target_page_rows in code_page and 
    target_page_viewer in code_page and 
    target_counts in code_page):
    code_page = code_page.replace(target_page_fn, addition_page_fn, 1)
    code_page = code_page.replace(target_counts, addition_counts, 1)
    code_page = code_page.replace(target_page_rows, replacement_page_rows, 1)
    code_page = code_page.replace(target_page_viewer, replacement_page_viewer, 1)
    with open(path_page, "w", encoding="utf-8", newline="\n") as f:
        f.write(code_page)
    print("LecturesPage.js patched successfully!")
else:
    print("LecturesPage.js target not found!")
