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
