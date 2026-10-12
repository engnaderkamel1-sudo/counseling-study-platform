// خدمة تحويل النص إلى صوت (Text-to-Speech Service - تدعم Gemini AI TTS الرسمي و Azure Speech كخيار احتياطي)
window.EdgeTtsService = {
  // قائمة الأصوات المدعومة رسمياً من Gemini AI مع أسمائها وتوصيفها
  GEMINI_VOICES: [
    { id: "Aoede", name: "Aoede (صوت نسائي دافئ وهادئ - موصى به لكتب المشورة)", gender: "female" },
    { id: "Kore", name: "Kore (صوت نسائي ناعم ومريح)", gender: "female" },
    { id: "Leda", name: "Leda (صوت نسائي متزن وواضح)", gender: "female" },
    { id: "Callirrhoe", name: "Callirrhoe (صوت نسائي خفيف ومشرق)", gender: "female" },
    { id: "Puck", name: "Puck (صوت رجالي طبيعي وحيوي)", gender: "male" },
    { id: "Fenrir", name: "Fenrir (صوت رجالي عميق ووقور)", gender: "male" },
    { id: "Charon", name: "Charon (صوت رجالي هادئ وناضج)", gender: "male" }
  ],

  DEFAULT_GEMINI_VOICE: "Aoede",

  // الحصول على إعدادات الصوت
  getVoiceConfig: function() {
    var utils = window.APP_UTILS;
    var voice = utils ? utils.getLocal("counsel_tts_gemini_voice", this.DEFAULT_GEMINI_VOICE) : this.DEFAULT_GEMINI_VOICE;
    return {
      voice: voice || this.DEFAULT_GEMINI_VOICE
    };
  },

  // حفظ الصوت المختار
  saveVoiceConfig: function(config) {
    var utils = window.APP_UTILS;
    if (!utils) return;
    if (config.voice) utils.setLocal("counsel_tts_gemini_voice", config.voice.trim());
  },

  // بناء توقيتات مبسطة للجمل داخل النص (للمزامنة مع القارئ)
  _buildSubtitlesForText: function(text, duration) {
    if (!text || !duration || duration <= 0) return [];
    var parts = text.split(/([.!?؟\n]+)/);
    var sentences = [];

    for (var i = 0; i < parts.length; i += 2) {
      var s = (parts[i] || "").trim();
      var p = (parts[i + 1] || "").trim();
      var full = (s + (p ? " " + p : "")).trim();
      if (full) sentences.push(full);
    }
    if (sentences.length === 0) sentences = [text.trim()];

    var totalChars = 0;
    sentences.forEach(function(st) { totalChars += st.length; });
    if (totalChars <= 0) totalChars = 1;

    var curTime = 0;
    var subs = [];
    for (var j = 0; j < sentences.length; j++) {
      var segDur = (sentences[j].length / totalChars) * duration;
      var start = Math.round(curTime * 100) / 100;
      var end = Math.round((curTime + segDur) * 100) / 100;
      subs.push({ start: start, end: end, text: sentences[j] });
      curTime += segDur;
    }
    return subs;
  },

  // حساب دقيق لزمن المقطع الصوتي
  _getAudioDuration: async function(blob) {
    return new Promise(function(resolve) {
      try {
        var audio = document.createElement("audio");
        audio.preload = "metadata";
        var objUrl = URL.createObjectURL(blob);
        audio.onloadedmetadata = function() {
          var d = audio.duration;
          URL.revokeObjectURL(objUrl);
          resolve((d && isFinite(d)) ? d : 0);
        };
        audio.onerror = function() {
          URL.revokeObjectURL(objUrl);
          resolve(0);
        };
        setTimeout(function() {
          resolve((audio.duration && isFinite(audio.duration)) ? audio.duration : 0);
        }, 3000);
        audio.src = objUrl;
      } catch (err) {
        resolve(0);
      }
    });
  },

  // تحويل Base64 إلى Blob
  _base64ToBlob: function(base64Data, contentType) {
    contentType = contentType || "audio/wav";
    var sliceSize = 1024;
    var byteCharacters = atob(base64Data);
    var bytesLength = byteCharacters.length;
    var slicesCount = Math.ceil(bytesLength / sliceSize);
    var byteArrays = new Array(slicesCount);

    for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
      var begin = sliceIndex * sliceSize;
      var end = Math.min(begin + sliceSize, bytesLength);
      var bytes = new Array(end - begin);
      for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
        bytes[i] = byteCharacters[offset].charCodeAt(0);
      }
      byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, { type: contentType });
  },

  // توليد الصوت مباشرة عبر محرك Gemini 3.8 Flash TTS الرسمي
  _synthesizeWithGemini: async function(text, voiceName, onProgress) {
    var self = this;
    var utils = window.APP_UTILS;
    var apiKey = "";
    if (window.GeminiAIService && typeof window.GeminiAIService.getApiKey === "function") {
      apiKey = await window.GeminiAIService.getApiKey();
    }
    if (!apiKey && utils) {
      apiKey = utils.getLocal("counsel_ai_api_key", "");
    }

    if (!apiKey) {
      throw new Error("لا يوجد مفتاح ذكاء اصطناعي محفوظ في صفحة «الإعدادات». يرجى حفظ المفتاح أولاً لتفعيل توليد الصوت.");
    }

    var selectedVoice = voiceName || self.getVoiceConfig().voice || self.DEFAULT_GEMINI_VOICE;

    if (typeof onProgress === "function") {
      onProgress("جاري توليد الصوت الذكي بصوت " + selectedVoice + " عبر محرك Google Gemini...");
    }

    var payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: text }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice
            }
          }
        }
      }
    };

    var endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=" + encodeURIComponent(apiKey);

    var resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      var errData = null;
      try { errData = await resp.json(); } catch (e) {}
      var msg = (errData && errData.error && errData.error.message) ? errData.error.message : ("رمز الخطأ: " + resp.status);
      throw new Error("فشل توليد الصوت عبر محرك Gemini: " + msg);
    }

    var result = await resp.json();
    var candidate = result.candidates && result.candidates[0];
    var part = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];

    if (!part || !part.inlineData || !part.inlineData.data) {
      throw new Error("لم يتم استلام محتوى صوتي من محرك Gemini.");
    }

    var mimeType = part.inlineData.mimeType || "audio/wav";
    var blob = self._base64ToBlob(part.inlineData.data, mimeType);
    var audioUrl = URL.createObjectURL(blob);
    var duration = await self._getAudioDuration(blob);

    return {
      audioUrl: audioUrl,
      blob: blob,
      duration: duration
    };
  },

  // الدالة العامة لتوليد الصوت (تدعم استدعاء Gemini AI TTS الرسمي)
  generateAudioForText: async function(text, voiceKey, onProgress) {
    var self = this;
    var cleanedText = (text || "").trim();
    if (!cleanedText) {
      throw new Error("لا يوجد نص لتوليد الصوت منه.");
    }

    var res = await self._synthesizeWithGemini(cleanedText, voiceKey, onProgress);
    var subs = self._buildSubtitlesForText(cleanedText, res.duration);

    return {
      audioUrl: res.audioUrl,
      blob: res.blob,
      duration: res.duration,
      subtitles: subs,
      toString: function() { return this.audioUrl; }
    };
  }
};
