// دوال مساعدة عامة للتعامل مع التخزين المحلي، روابط جوجل درايف، وتنسيق الوقت
window.APP_UTILS = {
  // استخراج المعرف المباشر من رابط جوجل درايف
  extractDriveId: function(url) {
    if (!url) return "";
    var match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    match = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    return url.trim();
  },

  // تحويل رابط جوجل درايف إلى رابط تشغيل وتضمين مباشر
  getDrivePreviewUrl: function(driveIdOrUrl) {
    var id = window.APP_UTILS.extractDriveId(driveIdOrUrl);
    if (!id) return "";
    return "https://drive.google.com/file/d/" + id + "/preview";
  },

  // تنسيق الثواني إلى دقائق وثوانٍ
  formatDuration: function(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  },

  // حفظ واسترجاع من التخزين المحلي
  getLocal: function(key, defaultValue) {
    try {
      var item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  setLocal: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }
};
