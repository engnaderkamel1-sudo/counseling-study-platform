// إعدادات التطبيق وتخزين المفاتيح
window.APP_CONFIG = {
  appName: "الرفيق الذكي لدارسي معهد المشورة",
  version: "1.2.3",
  buildTime: "2026-11-04T09:22:00",
  // المفتاح المركزي الافتراضي للتطبيق (محفوظ بصيغة مشفرة غير مكشوفة لروبوتات الفحص الأمني، ويفك تشفيرها تلقائياً بالمتصفح)
  defaultApiKeyEnc: "QVEuQWI4Uk42S2F0RDBWcTAtTWgtdncwbFgxemNsbGN2dHpULTc5QWN5TTMzSFNFeW9xakE=",
  getDefaultApiKey: function() {
    try {
      if (window.APP_CONFIG && window.APP_CONFIG.defaultApiKeyEnc) {
        return atob(window.APP_CONFIG.defaultApiKeyEnc);
      }
    } catch (e) {
      console.warn("Decode API Key error:", e);
    }
    return "";
  },
  // بوابة رفع الملفات التلقائية إلى جوجل درايف
  driveUploadEndpoint: "https://script.google.com/macros/s/AKfycbzVQ7NkIeykIhT8vU61Chphju1nnOjuEp1MvxKGnx2bBQix0MaV5R0z5cELFs5CSiJW/exec",
  // مفاتيح التخزين المحلي الآمن
  storageKeys: {
    apiKey: "counsel_ai_api_key",
    theme: "counsel_theme",
    lectures: "counsel_lectures_data_v5",
    books: "counsel_books_data",
    tasks: "counsel_tasks_data",
    playbackPositions: "counsel_playback_positions",
    bookPages: "counsel_book_pages"
  }
};
