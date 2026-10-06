// دالة استخراج وتضمين يوتيوب أو جوجل درايف
window.APP_UTILS.getMediaEmbedUrl = function(url) {
  if (!url) return "";
  // فحص يوتيوب
  var ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return "https://www.youtube.com/embed/" + ytMatch[1];
  }
  // فحص جوجل درايف
  var driveId = window.APP_UTILS.extractDriveId(url);
  if (driveId) {
    return "https://drive.google.com/file/d/" + driveId + "/preview";
  }
  return url;
};

// تحويل رابط جوجل درايف أو الملفات لرابط تشغيل صوتي مباشر بمشغل HTML5 Audio
window.APP_UTILS.getAudioStreamUrl = function(url) {
  if (!url) return "";
  var driveId = window.APP_UTILS.extractDriveId(url);
  if (driveId) {
    return "https://docs.google.com/uc?export=download&id=" + driveId;
  }
  return url;
};
