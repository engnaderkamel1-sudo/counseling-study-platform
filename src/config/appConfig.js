// إعدادات التطبيق وتخزين المفاتيح
window.APP_CONFIG = {
  appName: "منصة دراسة المشورة والتعلم الذكي",
  version: "1.2.0",
  buildTime: "2026-10-05T20:10:00",
  // بوابة رفع الملفات التلقائية إلى جوجل درايف
  driveUploadEndpoint: "https://script.google.com/macros/s/AKfycbzVQ7NkIeykIhT8vU61Chphju1nnOjuEp1MvxKGnx2bBQix0MaV5R0z5cELFs5CSiJW/exec",
  // مفاتيح التخزين المحلي الآمن
  storageKeys: {
    apiKey: "counsel_ai_api_key",
    theme: "counsel_theme",
    lectures: "counsel_lectures_data",
    books: "counsel_books_data",
    tasks: "counsel_tasks_data",
    playbackPositions: "counsel_playback_positions",
    bookPages: "counsel_book_pages"
  }
};
