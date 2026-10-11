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
    
    // محاولة تفعيل التخزين المؤقت دون التأثير على وضع التصفح الخفي (Incognito Resilient)
    if (window.db && typeof window.db.enablePersistence === "function") {
      window.db.enablePersistence({ synchronizeTabs: true }).catch(function(err) {
        // في المتصفح الخفي يرفض المتصفح IndexedDB وهذا طبيعي، نكمل الاتصال الشبكي المباشر بسلاسة
        console.warn("Firebase persistence notice (safe in incognito):", err.code || err.message);
      });
    }
    
    console.log("Firebase connected successfully to counseling-study-app");
  } catch (e) {
    console.error("Firebase init error:", e);
  }
})();
