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

  // إرسال إشعار سحابي إلى فايربيز عند نشر مرجع أو كتاب جديد للدارسين
  broadcastNewBookNotification: async function(book) {
    if (!window.db || !book) return;
    try {
      var notifData = {
        title: "📚 مرجع جديد: " + (book.title || "كتاب دراسي"),
        body: "تم نشر مرجع جديد بقلم: " + (book.author || "معهد المشورة") + " • متاح للقراءة والاستماع",
        bookId: book.id,
        type: "book",
        target: "all",
        linkTab: "books",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await window.db.collection("notifications").add(notifData);
    } catch (e) {
      console.warn("Could not broadcast book notification:", e);
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

  // إرسال إشعار تجريبي مخصص لدارس محدد بالاسم والبريد فقط دون إزعاج باقي الدارسين
  sendDirectUserNotification: async function(user, customTitle, customBody) {
    if (!window.db || !user) return false;
    try {
      var notifData = {
        title: customTitle || ("🔔 تنبيه تجريبي خاص: مرحباً " + (user.fullName || "يا دارس")),
        body: customBody || "هذا إشعار تجريبي خاص بحسابك للتأكد من وصول الإشعارات والرنين بنجاح.",
        type: "direct_test",
        target: "user",
        targetUserId: user.id || "",
        targetUserEmail: (user.email || "").toLowerCase().trim(),
        targetUserName: user.fullName || "",
        linkTab: "lectures",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await window.db.collection("notifications").add(notifData);
      return true;
    } catch (e) {
      console.warn("Could not send direct user notification:", e);
      throw e;
    }
  },

  // اختبار فوري لإشعار الجهاز والنظام محلياً على جهاز المشرف فقط دون لمس قاعدة البيانات
  triggerLocalTestNotification: async function() {
    try {
      if (!("Notification" in window)) {
        alert("متصفحك لا يدعم الإشعارات.");
        return false;
      }
      var perm = Notification.permission;
      if (perm !== "granted") {
        perm = await Notification.requestPermission();
      }
      if (perm !== "granted") {
        alert("تنبيه: صلاحية الإشعارات غير مفعلة في المتصفح! يرجى السماح بالإشعارات أولاً.");
        return false;
      }

      // 1. تشغيل الرنين والاهتزاز
      window.NotificationService.playNotificationChime();

      var options = {
        body: "رائع! إشعارات النظام وشاشة القفل والاهتزاز تعمل بكفاءة على جهازك.",
        icon: "icon-192.png",
        badge: "icon-192.png",
        vibrate: [250, 100, 250],
        tag: "test_notif_" + Date.now(),
        renotify: true,
        data: { url: window.location.href }
      };

      // 2. إظهار الإشعار عبر Service Worker (لتظهر في درج الموبايل وشاشة القفل)
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function(reg) {
          if (reg && reg.showNotification) {
            reg.showNotification("🔔 اختبار إشعار ناجح - منصة المشورة", options);
          } else {
            new Notification("🔔 اختبار إشعار ناجح - منصة المشورة", options);
          }
        }).catch(function() {
          new Notification("🔔 اختبار إشعار ناجح - منصة المشورة", options);
        });
      } else {
        new Notification("🔔 اختبار إشعار ناجح - منصة المشورة", options);
      }
      return true;
    } catch(err) {
      console.error("Local test notification error:", err);
      alert("حدث خطأ أثناء إظهار إشعار التجربة: " + err.message);
      return false;
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

  // إرسال إشعار فوري للأدمن عند تسجيل عطل فني جديد أو اقتراح
  notifyAdminNewErrorReport: async function(report) {
    if (!window.db || !report) return;
    try {
      var isSuggestion = report.type === "suggestion";
      var notifData = {
        title: isSuggestion ? ("💡 اقتراح تطوير جديد: " + (report.page || "عام")) : ("🚨 بلاغ عطل فني: " + (report.page || "المنصة")),
        body: (report.senderName ? "من: " + report.senderName + " • " : "") + (report.userDescription || "تم تسجيل تفاصيل العطل في لوحة البلاغات"),
        type: "error_report",
        target: "admin",
        linkTab: "errors",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // فحص سريع لمنع تكرار نفس الإشعار خلال دقائق قصيرة
      var notifKey = "counsel_last_err_notif_" + (report.page || "");
      var lastSent = 0;
      try {
        lastSent = parseInt(sessionStorage.getItem(notifKey) || "0", 10);
      } catch (eStorage) {}
      if (Date.now() - lastSent < 5 * 60 * 1000) {
        console.warn("notifyAdminNewErrorReport: Duplicate skipped within cooldown.");
        return;
      }
      try {
        sessionStorage.setItem(notifKey, String(Date.now()));
      } catch (eSet) {}

      await window.db.collection("notifications").add(notifData);
    } catch (e) {
      console.warn("Could not send admin error report notification:", e);
    }
  },

  // إرسال إشعار فوري للأدمن عند تقديم دارس لاقتراح ميزة جديدة
  notifyAdminNewFeatureRequest: async function(feat) {
    if (!window.db || !feat) return;
    try {
      var notifData = {
        title: "💡 اقتراح ميزة جديدة: " + (feat.featureTitle || feat.category || "فكرة تطوير"),
        body: (feat.senderName ? "من الدارس: " + feat.senderName + " • " : "") + (feat.userDescription || "اضغط للاطلاع على فكرة الميزة والرد عليها"),
        type: "feature_request",
        target: "admin",
        linkTab: "errors",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await window.db.collection("notifications").add(notifData);
    } catch (e) {
      console.warn("Could not send admin feature request notification:", e);
    }
  },

  // إرسال رد المشرف في إشعار شخصي خاص للدارس صاحب الاقتراح
  notifyStudentFeatureReply: async function(studentEmail, studentId, featureTitle, replyText, status) {
    if (!window.db || !studentEmail) return;
    try {
      var statusBadgeText = (status === "implemented") ? "🎉 تم تنفيذ الميزة بنجاح!" : (status === "in_progress" ? "🛠️ معتمد وجاري البرمجة" : "⏳ قيد الدراسة");
      var notifData = {
        title: "💬 رد من مشرف المنصة بخصوص: " + (featureTitle || "اقتراحك"),
        body: statusBadgeText + " • " + (replyText || "تمت مراجعة اقتراحك من قِبل المشرف."),
        type: "feature_reply",
        target: "user",
        targetUserEmail: (studentEmail || "").toLowerCase().trim(),
        targetUserId: studentId || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await window.db.collection("notifications").add(notifData);
    } catch (e) {
      console.warn("Could not dispatch student feature reply notification:", e);
    }
  },

  // إرسال إشعار فوري عند نشر رابط زوم للمحاضرة
  broadcastZoomLinkNotification: async function(lecture) {
    if (!window.db || !lecture) return;
    try {
      var notifData = {
        title: "🎥 تم توفير رابط زوم: " + (lecture.title || "محاضرة المشورة"),
        body: "موعد اللقاء: " + (lecture.zoomTimeStr || (lecture.date + (lecture.startTime ? " - " + lecture.startTime : ""))) + " • اضغط للدخول",
        lectureId: lecture.id,
        type: "zoom_link",
        zoomUrl: lecture.zoomUrl || "",
        meetingId: lecture.meetingId || "",
        passcode: lecture.passcode || "",
        target: "all",
        linkTab: "lectures",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await window.db.collection("notifications").add(notifData);
    } catch (e) {
      console.warn("Could not broadcast zoom link notification:", e);
    }
  },

  // إرسال تذكير زوم مخصص (تذكير قبلها بيوم، تذكير قبلها بوقت قليل، أو تذكير بدء المحاضرة والدخول)
  broadcastZoomReminder: async function(lecture, reminderType, customTimeStr) {
    if (!window.db || !lecture) return;
    try {
      var timeLabel = customTimeStr || lecture.zoomTimeStr || (lecture.date + (lecture.startTime ? " - " + lecture.startTime : ""));
      var title = "";
      var body = "";

      if (reminderType === "1day") {
        title = "📅 تذكير: غداً موعد محاضرة " + (lecture.title || "المشورة");
        body = "غداً بإذن ربنا موعدنا مع محاضرة «" + (lecture.title || "") + "»" + (timeLabel ? " الساعة " + timeLabel : "") + " عبر زووم • جهّز نفسك واستعد!";
      } else if (reminderType === "1hour") {
        title = "⏰ تذكير: محاضرة " + (lecture.title || "") + " تبدأ بعد قليل";
        body = "الموعد: " + (timeLabel || "") + " عبر زووم • القاعة جاهزة، اضغط هنا للدخول المباشر!";
      } else if (reminderType === "opening") {
        title = "🚀 قاعة زووم مفتوحة الآن: " + (lecture.title || "");
        body = "بدأت المحاضرة الآن! اضغط للدخول المباشر فوراً عبر زووم.";
      } else {
        title = "🔔 تذكير بمحاضرة: " + (lecture.title || "");
        body = "المحاضرة ستبدأ قريباً عبر تطبيق زوم.";
      }

      var notifData = {
        title: title,
        body: body,
        lectureId: lecture.id,
        type: "zoom_reminder",
        reminderType: reminderType,
        zoomUrl: lecture.zoomUrl || "",
        meetingId: lecture.meetingId || "",
        passcode: lecture.passcode || "",
        target: "all",
        linkTab: "lectures",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await window.db.collection("notifications").add(notifData);
    } catch (e) {
      console.warn("Could not broadcast zoom reminder:", e);
    }
  },

  // إظهار إشعار نظام حقيقي على الجهاز محلياً مع الرنين والاهتزاز
  showSystemNotification: function(title, options) {
    try {
      if (window.NotificationService && typeof window.NotificationService.playNotificationChime === "function") {
        window.NotificationService.playNotificationChime();
      }
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      var defaultOpts = {
        icon: "icon-192.png",
        badge: "icon-192.png",
        vibrate: [250, 100, 250],
        renotify: true,
        tag: (options && options.tag) ? options.tag : ("counsel_" + Date.now())
      };
      var mergedOpts = Object.assign({}, defaultOpts, options);

      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function(reg) {
          if (reg && reg.showNotification) {
            reg.showNotification(title, mergedOpts);
          } else {
            new Notification(title, mergedOpts);
          }
        }).catch(function() {
          new Notification(title, mergedOpts);
        });
      } else {
        new Notification(title, mergedOpts);
      }
    } catch(e) {}
  },

  // الاستماع للإشعارات الجديدة وعرضها للمستخدمين
  subscribeNotifications: function(onNewNotification) {
    if (!window.db) return function() {};
    try {
      var processSnapshot = function(snapshot) {
        var list = [];
        snapshot.forEach(function(doc) {
          list.push(Object.assign({ id: doc.id }, doc.data()));
        });
        // فرز موثوق في الذاكرة بالمللي ثانية لتفادي أي مشاكل فهرسة سحابية
        list.sort(function(a, b) {
          var tA = 0;
          if (a.createdAt && a.createdAt.toMillis) tA = a.createdAt.toMillis();
          else if (a.createdAt && a.createdAt.seconds) tA = a.createdAt.seconds * 1000;
          else if (a.createdAt) tA = new Date(a.createdAt).getTime() || 0;

          var tB = 0;
          if (b.createdAt && b.createdAt.toMillis) tB = b.createdAt.toMillis();
          else if (b.createdAt && b.createdAt.seconds) tB = b.createdAt.seconds * 1000;
          else if (b.createdAt) tB = new Date(b.createdAt).getTime() || 0;

          return tB - tA;
        });
        onNewNotification(list);
      };

      // محاولة الاستماع الأولي بالترتيب السحابي
      return window.db.collection("notifications")
        .orderBy("createdAt", "desc")
        .limit(50)
        .onSnapshot(processSnapshot, function(orderErr) {
          console.warn("Notifications orderBy listener failed, switching to direct fallback query:", orderErr);
          // في حال فشل الترتيب السحابي (غياب فهرس أو خطأ زمني)، جلب المستندات مباشرة وفرزها محلياً
          window.db.collection("notifications")
            .limit(50)
            .onSnapshot(processSnapshot, async function(fallbackErr) {
              console.warn("Notifications direct onSnapshot failed, attempting direct get:", fallbackErr);
              try {
                var snap = await window.db.collection("notifications").limit(50).get();
                processSnapshot(snap);
              } catch (getErr) {
                console.error("Direct notifications get failed:", getErr);
              }
            });
        });
    } catch (e) {
      console.error("subscribeNotifications error:", e);
      return function() {};
    }
  }
};

