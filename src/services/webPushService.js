// Web Push Client Service (Service Worker & PushManager Subscription)
// Handles device registration for background Web Push and server dispatching

(function() {
  var VAPID_PUBLIC_KEY = "BAtx_VsX7sQqBLrErkVgQhJXjecTxKV0ohn_ICVeQsAjuskf2dAqTKA3982-WlTVeDiPMQ9ubQaBmfnlgW07660";

  function urlBase64ToUint8Array(base64String) {
    var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  window.WebPushService = {
    vapidPublicKey: VAPID_PUBLIC_KEY,

    // التحقق من دعم المتصفح لإشعارات الخلفية
    isSupported: function() {
      return typeof window !== "undefined" &&
             ("serviceWorker" in navigator) &&
             ("PushManager" in window) &&
             ("Notification" in window);
    },

    // تسجيل الـ Service Worker واشتراك الجهاز في خدمة الدفع
    registerServiceWorkerAndSubscribe: async function(currentUser, options) {
      if (!this.isSupported()) {
        console.warn("Web Push is not supported by this browser.");
        return null;
      }

      options = options || {};

      try {
        var registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;

        var subscription = await registration.pushManager.getSubscription();
        var isNewSubscription = false;

        if (!subscription) {
          var convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
          isNewSubscription = true;
        }

        // التحقق من بيانات المستخدم واشتراكه
        if (!currentUser) {
          currentUser = window.currentUser;
          if (!currentUser) {
            try {
              var savedRaw = localStorage.getItem("counsel_current_user");
              if (savedRaw) currentUser = JSON.parse(savedRaw);
            } catch(eSaved) {}
          }
        }

        // حفظ بيانات اشتراك الجهاز في وثيقة المستخدم بقاعدة البيانات
        if (subscription && currentUser && window.db) {
          var subJson = JSON.stringify(subscription);
          var userId = currentUser.id;

          if (!userId && currentUser.email) {
            userId = "user_" + currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
          } else if (userId && !userId.startsWith("user_") && currentUser.email) {
            userId = "user_" + userId;
          }

          if (userId) {
            var arrayUnionVal = (window.firebase && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.arrayUnion)
              ? firebase.firestore.FieldValue.arrayUnion(subJson)
              : [subJson];

            var updatePayload = {
              pushSubscription: subJson,
              pushSubscriptions: arrayUnionVal,
              pushUpdatedAt: (window.firebase && firebase.firestore && firebase.firestore.FieldValue)
                ? firebase.firestore.FieldValue.serverTimestamp()
                : new Date().toISOString()
            };

            window.db.collection("users").doc(userId).set(updatePayload, { merge: true })
              .catch(function(err) {
                console.warn("Could not save push subscription to Firestore:", err);
              });
          }

          // إرسال إشعار ترحيبي لمرة واحدة فقط عند التفعيل اليدوي الصريح
          if (options.sendWelcomePush && isNewSubscription) {
            this.triggerServerPush({
              subscription: subJson,
              title: "🔔 تم تفعيل إشعارات المشورة بنجاح",
              body: "ستصلك الآن تنبيهات المحاضرات وروابط زووم حتى وإن كان التطبيق أو المتصفح مغلقاً تماماً!"
            }).catch(function() {});
          }
        }

        return subscription;
      } catch (err) {
        console.warn("Error subscribing to web push:", err);
        return null;
      }
    },

    // إرسال إشعار سحابي للأجهزة المشتركة في الخلفية عبر /api/send-push
    triggerServerPush: async function(payload) {
      try {
        var res = await fetch("/api/send-push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload || {})
        });
        if (res.ok) {
          return await res.json();
        }
        return null;
      } catch (err) {
        console.warn("Server push dispatch error:", err);
        return null;
      }
    }
  };
})();
