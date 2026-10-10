// خدمة تحويل النص إلى صوت (Text-to-Speech Service)
window.EdgeTtsService = {
  DEFAULT_VOICE: "ar-EG-SalmaNeural - ar-EG (Female)",
  API_ENDPOINT: "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/call/tts_interface",

  // توليد مقطع صوتي لنص معين
  generateAudioForText: async function(text, voiceKey, onProgress) {
    var self = this;
    var voice = voiceKey || self.DEFAULT_VOICE;
    var cleanedText = (text || "").trim();
    if (!cleanedText) {
      throw new Error("لا يوجد نص لتوليد الصوت منه.");
    }

    if (typeof onProgress === "function") {
      onProgress("جاري معالجة النص...");
    }

    // 1. استدعاء نقطة النهاية (Gradio Call Endpoint)
    var payload = {
      data: [
        cleanedText,
        voice,
        0, // Rate (السرعة الطبيعية)
        0  // Pitch (النبرة الطبيعية)
      ]
    };

    var postResp = await fetch(self.API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!postResp.ok) {
      throw new Error("فشل الاتصال بخدمة تحويل الصوت (" + postResp.status + ")");
    }

    var callData = await postResp.json();
    var eventId = callData.event_id;
    if (!eventId) {
      throw new Error("لم يتم استلام معرف العملية من السيرفر.");
    }

    if (typeof onProgress === "function") {
      onProgress("جاري إنشاء الملف الصوتي...");
    }

    // 2. الاستماع للنتيجة عبر مسار الحدث
    var sseUrl = self.API_ENDPOINT + "/" + eventId;
    var maxAttempts = 45; // أقصى مهلة 45 ثانية
    var audioUrl = null;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(function(resolve) {
        setTimeout(resolve, 1000);
      });

      try {
        var sseResp = await fetch(sseUrl);
        if (!sseResp.ok) continue;
        var sseText = await sseResp.text();

        // فحص حدث الاكتمال
        if (sseText.indexOf("event: complete") !== -1 || sseText.indexOf("event: error") !== -1) {
          if (sseText.indexOf("event: error") !== -1) {
            throw new Error("حدث خطأ أثناء معالجة الصوت في السيرفر.");
          }

          // استخراج رابط الملف
          var matchUrl = sseText.match(/"url":\s*"([^"]+)"/);
          if (matchUrl && matchUrl[1]) {
            audioUrl = matchUrl[1];
          } else {
            var matchPath = sseText.match(/"path":\s*"([^"]+)"/);
            if (matchPath && matchPath[1]) {
              audioUrl = "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/file=" + matchPath[1];
            }
          }
          break;
        }
      } catch (pollErr) {
        if (pollErr.message && pollErr.message.indexOf("خطأ أثناء معالجة") !== -1) {
          throw pollErr;
        }
      }
    }

    if (!audioUrl) {
      throw new Error("استغرقت معالجة الصوت وقتاً أطول من المتوقع، يرجى المحاولة ثانية.");
    }

    return audioUrl;
  }
};
