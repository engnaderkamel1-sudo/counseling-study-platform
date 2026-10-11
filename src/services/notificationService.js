// خدمة الإشعارات السحابية وإشعارات المتصفح
window.NotificationService = {
  // تشغيل نغمة تنبيهية لطيفة وهزة بالجهاز عند وصول الإشعار
  playNotificationChime: function() {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([250, 100, 250]);
      }
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      var now = ctx.currentTime;

      var osc1 = ctx.createOscillator();
      var gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(987.77, now + 0.12); // B5
      gain2.gain.setValueAtTime(0.22, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.65);
    } catch(e) {}
  },

  // طلب تفعيل الإشعارات من المستخدم
  requestPermission: async function() {
    if (!("Notification" in window)) {
      alert("متصفحك لا يدعم الإشعارات المباشرة.");
      return false;
    }
    var permission = await Notification.requestPermission();
    if (permission === "granted") {
      window.NotificationService.playNotificationChime();
      new Notification("منصة دراسة المشورة", {
        body: "تم تفعيل الإشعارات بنجاح! ستصلك تنبيهات فور نزول أي محاضرة أو إعلان هام.",
        icon: "icon-192.png",
        badge: "icon-192.png",
        vibrate: [250, 100, 250]
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
        type: "lecture",
        target: "all",
        linkTab: "lectures",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await window.db.collection("notifications").add(notifData);
    } catch (e) {
      console.warn("Could not broadcast notification:", e);
    }
  },

  // إرسال إشعار عند رفع هاند آوت / عرض تقديمي جديد للمحاضرة
  broadcastHandoutNotification: async function(lecture) {
    if (!window.db) return;
    try {
      var notifData = {
        title: "📂 مرفقات جديدة: " + lecture.title,
        body: "تمت إضافة ملفات المرفقات / العرض التقديمي لمادة: " + (lecture.subject || "المشورة"),
        lectureId: lecture.id,
        type: "handout",
        target: "all",
        linkTab: "lectures",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await window.db.collection("notifications").add(notifData);
    } catch (e) {
      console.warn("Could not broadcast handout notification:", e);
    }
  },

  // إرسال تعميم / تنبيه عام من المشرف للدارسين
  broadcastCustomAnnouncement: async function(title, body, target) {
    if (!window.db) return;
    try {
      var notifData = {
        title: "📢 " + title,
        body: body,
        type: "announcement",
        target: target || "all",
        linkTab: "lectures",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await window.db.collection("notifications").add(notifData);
      return true;
    } catch (e) {
      console.warn("Could not broadcast announcement:", e);
      throw e;
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
