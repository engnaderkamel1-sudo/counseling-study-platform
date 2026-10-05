// خدمة الإشعارات السحابية وإشعارات المتصفح
window.NotificationService = {
  // طلب تفعيل الإشعارات من المستخدم
  requestPermission: async function() {
    if (!("Notification" in window)) {
      alert("متصفحك لا يدعم الإشعارات المباشرة.");
      return false;
    }
    var permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification("منصة دراسة المشورة", {
        body: "تم تفعيل الإشعارات بنجاح! ستصلك تنبيهات فور نزول أي محاضرة جديدة.",
        icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%230f172a'/%3E%3Ctext x='50' y='65' font-size='50' text-anchor='middle'%3E🌿%3C/text%3E%3C/svg%3E"
      });
      return true;
    }
    return false;
  },

  // إرسال إشعار سحابي إلى فايربيز ليظهر لجميع الدارسين
  broadcastNewLectureNotification: async function(lecture) {
    if (!window.db) return;
    try {
      var notifData = {
        title: "🎙️ محاضرة جديدة: " + lecture.title,
        body: "ألقاها: " + lecture.speaker + " (تاريخ: " + lecture.date + ")",
        lectureId: lecture.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await window.db.collection("notifications").add(notifData);
    } catch (e) {
      console.warn("Could not broadcast notification:", e);
    }
  },

  // الاستماع للإشعارات الجديدة وعرضها للمستخدمين
  subscribeNotifications: function(onNewNotification) {
    if (!window.db) return function() {};
    try {
      return window.db.collection("notifications")
        .orderBy("createdAt", "desc")
        .limit(10)
        .onSnapshot(function(snapshot) {
          var list = [];
          snapshot.forEach(function(doc) {
            list.push(Object.assign({ id: doc.id }, doc.data()));
          });
          onNewNotification(list);
        });
    } catch (e) {
      return function() {};
    }
  }
};
