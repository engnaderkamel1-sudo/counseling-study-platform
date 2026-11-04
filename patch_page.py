# Patch LecturesPage.js
path_page = "src/pages/LecturesPage.js"
with open(path_page, "r", encoding="utf-8") as f:
    code_page = f.read().replace("\r\n", "\n")

target_counts = "  // خريطة الترقيم التسلسلي الزمني التلقائي\n  var chronoList = lectures.slice().sort(function(a, b) {"

addition_counts = """  // خريطة لتحديد تواريخ الأيام التي تضم أكثر من جلسة واحدة
  var dateSessionsCount = {};
  lectures.forEach(function(l) {
    var d = (l.date || "").trim();
    if (d) {
      dateSessionsCount[d] = (dateSessionsCount[d] || 0) + 1;
    }
  });

  // خريطة الترقيم التسلسلي الزمني التلقائي
  var chronoList = lectures.slice().sort(function(a, b) {"""

target_page_fn = "  var handleAddLecture = async function(e) {"

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
    print("target_page_fn:", target_page_fn in code_page)
    print("target_counts:", target_counts in code_page)
    print("target_page_rows:", target_page_rows in code_page)
    print("target_page_viewer:", target_page_viewer in code_page)
