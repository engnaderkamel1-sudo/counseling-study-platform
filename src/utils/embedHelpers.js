// دالة استخراج معرف فيديو يوتيوب المكون من 11 حرفاً
window.APP_UTILS.getYouTubeVideoId = function(url) {
  if (!url) return "";
  var m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return (m && m[1]) ? m[1] : "";
};

// دالة تحويل أي نص توقيت (سواء بأرقام عربية مشرقية أو إنجليزية أو بصيغة ساعات ودقائق) إلى ثوانٍ بدقة
window.APP_UTILS.parseTimeToSeconds = function(timeStr) {
  if (!timeStr) return 0;
  var str = String(timeStr).trim();
  var arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  for (var i = 0; i < 10; i++) {
    str = str.replace(new RegExp(arabicDigits[i], "g"), i.toString());
  }
  var clean = str.replace(/[^0-9:]/g, "");
  if (!clean) return 0;
  var parts = clean.split(":").map(function(n) { return parseInt(n, 10) || 0; });
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0] || 0;
  }
  return 0;
};

// دالة استخراج وتضمين يوتيوب أو جوجل درايف
window.APP_UTILS.getMediaEmbedUrl = function(url) {
  if (!url) return "";
  // فحص يوتيوب
  var ytId = window.APP_UTILS.getYouTubeVideoId(url);
  if (ytId) {
    return "https://www.youtube.com/embed/" + ytId;
  }
  // فحص جوجل درايف
  var driveId = window.APP_UTILS.extractDriveId(url);
  if (driveId) {
    return "https://drive.google.com/file/d/" + driveId + "/preview";
  }
  return url;
};

// فحص ما إذا كان الرابط مؤقتاً ومنتهياً من خوادم خارجية مثل HuggingFace Gradio
window.APP_UTILS.isExpiredAudioUrl = function(url) {
  if (!url || typeof url !== "string") return true;
  var trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.indexOf("/tmp/gradio/") !== -1 || trimmed.indexOf("gradio_api/file") !== -1) return true;
  return false;
};

// تحويل رابط جوجل درايف أو الملفات لرابط تشغيل صوتي مباشر بمشغل HTML5 Audio
window.APP_UTILS.getAudioStreamUrl = function(url) {
  if (!url) return "";
  var driveId = window.APP_UTILS.extractDriveId(url);
  if (driveId) {
    // استخدام بروكسي البث الصوتي المباشر النقي لتجاوز قيود CORP و CORS الصارمة في المتصفحات
    return "/api/audio-proxy?id=" + driveId;
  }
  if (window.APP_UTILS.isExpiredAudioUrl(url)) return "";
  return url;
};

// روابط بديلة للبث الصوتي من درايف في حال قيود المتصفحات
window.APP_UTILS.getAudioStreamCandidates = function(url) {
  if (!url) return [];
  var driveId = window.APP_UTILS.extractDriveId(url);
  if (driveId) {
    return [
      "https://drive.usercontent.google.com/download?id=" + driveId + "&export=download&confirm=t",
      "https://docs.google.com/uc?export=download&id=" + driveId,
      "https://drive.google.com/uc?export=download&id=" + driveId,
      "https://lh3.googleusercontent.com/d/" + driveId
    ];
  }
  return [url];
};

// عنصر صوتي دائم وغير قابل للتلف لضمان التشغيل الفوري والاحتفاظ بتصريح المتصفح للصوت
window.APP_UTILS.getPersistentAudioElement = function() {
  if (typeof window === "undefined") return null;
  if (window.__COUNSEL_PERSISTENT_AUDIO && document.getElementById("counsel-global-audio-element")) {
    return window.__COUNSEL_PERSISTENT_AUDIO;
  }
  var existing = document.getElementById("counsel-global-audio-element");
  if (existing) {
    window.__COUNSEL_PERSISTENT_AUDIO = existing;
    return existing;
  }
  try {
    var audio = document.createElement("audio");
    audio.id = "counsel-global-audio-element";
    audio.preload = "auto";
    audio.style.display = "none";
    if (document.body) {
      document.body.appendChild(audio);
    }
    window.__COUNSEL_PERSISTENT_AUDIO = audio;
    return audio;
  } catch (e) {
    var a = new Audio();
    a.preload = "auto";
    window.__COUNSEL_PERSISTENT_AUDIO = a;
    return a;
  }
};

