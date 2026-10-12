// خدمة تحويل النص إلى صوت المتزامنة مع التوقيتات (Text-to-Speech with Subtitles Service)
window.EdgeTtsService = {
  DEFAULT_VOICE: "ar-EG-SalmaNeural - ar-EG (Female)",
  API_ENDPOINT: "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/call/tts_interface",
  SERVERLESS_ENDPOINT: "/api/tts-with-subtitles",

  // توليد مقطع صوتي لنص معين مع استخراج ملف التوقيتات (SRT/VTT) تلقائياً
  generateAudioForText: async function(text, voiceKey, onProgress) {
    var self = this;
    var voice = voiceKey || self.DEFAULT_VOICE;
    var cleanedText = (text || "").trim();
    if (!cleanedText) {
      throw new Error("لا يوجد نص لتوليد الصوت منه.");
    }

    if (typeof onProgress === "function") {
      onProgress("جاري معالجة النص واستخراج الصوت والتوقيتات...");
    }

    // 1. المحاولة الأولى: استخدام نقطة النهاية المتزامنة مع التوقيتات (/api/tts-with-subtitles)
    try {
      var serverlessResp = await fetch(self.SERVERLESS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanedText,
          voice: voice
        })
      });

      if (serverlessResp.ok) {
        var sData = await serverlessResp.json();
        if (sData && sData.audioBase64) {
          if (typeof onProgress === "function") {
            onProgress("✓ تم توليد الصوت واستخراج ملف التوقيتات بنجاح!");
          }
          var byteChars = atob(sData.audioBase64);
          var byteNumbers = new Array(byteChars.length);
          for (var b = 0; b < byteChars.length; b++) {
            byteNumbers[b] = byteChars.charCodeAt(b);
          }
          var byteArray = new Uint8Array(byteNumbers);
          var audioBlob = new Blob([byteArray], { type: "audio/mp3" });
          var blobUrl = URL.createObjectURL(audioBlob);

          return {
            audioUrl: blobUrl,
            subtitles: sData.srt || sData.vtt || null,
            blob: audioBlob,
            isBlob: true
          };
        }
      }
    } catch (sErr) {
      console.warn("Serverless subtitle TTS attempt failed, falling back to Gradio:", sErr);
    }

    // 2. المحاولة البديلة: استدعاء سيرفر Gradio المباشر (Hugging Face)
    if (typeof onProgress === "function") {
      onProgress("جاري توليد الملف الصوتي عبر السيرفر الاحتياطي...");
    }

    var payload = {
      data: [
        cleanedText,
        voice,
        0, // Rate
        0  // Pitch
      ]
    };

    var postResp = await fetch(self.API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    var sseUrl = self.API_ENDPOINT + "/" + eventId;
    var maxAttempts = 45;
    var audioUrl = null;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(function(resolve) { setTimeout(resolve, 1000); });
      try {
        var sseResp = await fetch(sseUrl);
        if (!sseResp.ok) continue;
        var sseText = await sseResp.text();

        if (sseText.indexOf("event: complete") !== -1 || sseText.indexOf("event: error") !== -1) {
          if (sseText.indexOf("event: error") !== -1) {
            throw new Error("حدث خطأ أثناء معالجة الصوت في السيرفر.");
          }

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

    return {
      audioUrl: audioUrl,
      subtitles: null,
      blob: null,
      isBlob: false
    };
  }
};
