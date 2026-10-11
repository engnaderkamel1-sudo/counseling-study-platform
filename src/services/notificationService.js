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
        icon: "icon-192.png"
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

  // إرسال إشعار سحابي إلى المشرف عند تسجيل دارس جديد بانتظار الاعتماد
  notifyAdminNewUserRegistration: async function(userData) {
    if (!window.db) return;
    try {
      var notifData = {
        title: "👤 طلب انضمام دارس جديد",
        body: (userData.fullName || "دارس جديد") + " • " + (userData.studyType || "") + " (" + (userData.studyYear || "") + ") • " + (userData.church || "") + " (" + (userData.diocese || "") + " - " + (userData.governorate || "") + ")" + (userData.phone || userData.whatsapp ? " • واتساب: " + (userData.whatsapp || userData.phone) : ""),
        type: "user_registration",
        userId: userData.id || userData.email,
        phone: userData.phone || userData.whatsapp || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await window.db.collection("notifications").add(notifData);
    } catch (e) {
      console.warn("Could not send admin notification:", e);
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
