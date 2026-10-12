// تهيئة وإعداد فايربيز وقاعدة البيانات السحابية لمشروع دراسة المشورة
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8",
  authDomain: "counseling-study-app.firebaseapp.com",
  projectId: "counseling-study-app",
  storageBucket: "counseling-study-app.firebasestorage.app",
  messagingSenderId: "423516287917",
  appId: "1:423516287917:web:8e9067abd3b71f900b2724"
};

(function() {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
    window.db = firebase.firestore();
    if (typeof firebase.auth === "function") {
      try {
        window.auth = firebase.auth();
      } catch (authErr) {
        console.warn("Firebase auth init warning:", authErr);
      }
    }
    if (typeof firebase.storage === "function") {
      try {
        window.storage = firebase.storage();
      } catch (storageErr) {
        console.warn("Firebase storage init warning:", storageErr);
      }
    }
    
    // تم تعطيل enablePersistence لحماية الأجهزة من التخزين المؤقت القديم (IndexedDB Cache Poisoning)
    // التطبيق يعتمد على التخزين المحلي النظيف localStorage مع المزامنة المباشرة
    console.log("Firebase connected successfully to counseling-study-app (direct realtime mode)");
  } catch (e) {
    console.error("Firebase init error:", e);
  }
})();
