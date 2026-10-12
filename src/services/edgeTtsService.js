// خدمة تحويل النص إلى صوت (Text-to-Speech Service - Microsoft Azure Speech الرسمية مع إدارة الكوتا والمفتاح الاحتياطي)
window.EdgeTtsService = {
  DEFAULT_VOICE: "ar-EG-SalmaNeural",
  DEFAULT_REGION: "eastus",
  MONTHLY_QUOTA_LIMIT: 500000, // 500 ألف حرف لكل مفتاح
  SAFETY_MARGIN: 20000,        // هامش أمان: إيقاف المفتاح والتحويل عند تبقي 20 ألف حرف

  // الحصول على مفاتيح Azure وإعدادات الحساب من التخزين المحلي
  getAzureConfig: function() {
    var utils = window.APP_UTILS;
    var key1 = utils ? utils.getLocal("counsel_azure_speech_key_1", "") : "";
    var key2 = utils ? utils.getLocal("counsel_azure_speech_key_2", "") : "";
    var region = utils ? utils.getLocal("counsel_azure_speech_region", this.DEFAULT_REGION) : this.DEFAULT_REGION;
    var voice = utils ? utils.getLocal("counsel_azure_speech_voice", this.DEFAULT_VOICE) : this.DEFAULT_VOICE;

    return {
      key1: (key1 || "").trim(),
      key2: (key2 || "").trim(),
      region: (region || this.DEFAULT_REGION).trim(),
      voice: (voice || this.DEFAULT_VOICE).trim()
    };
  },

  // حفظ مفاتيح وإعدادات Azure
  saveAzureConfig: function(config) {
    var utils = window.APP_UTILS;
    if (!utils) return;
    if (config.key1 !== undefined) utils.setLocal("counsel_azure_speech_key_1", config.key1.trim());
    if (config.key2 !== undefined) utils.setLocal("counsel_azure_speech_key_2", config.key2.trim());
    if (config.region !== undefined) utils.setLocal("counsel_azure_speech_region", config.region.trim());
    if (config.voice !== undefined) utils.setLocal("counsel_azure_speech_voice", config.voice.trim());
  },

  // استرجاع سجل استهلاك الحروف للشهر الحالي لكل مفتاح
  getUsageStats: function() {
    var utils = window.APP_UTILS;
    var currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
    var savedStats = utils ? utils.getLocal("counsel_azure_speech_usage", null) : null;

    if (!savedStats || savedStats.month !== currentMonth) {
      // تجديد العداد تلقائياً مع بداية كل شهر جديد
      savedStats = {
        month: currentMonth,
        key1Chars: 0,
        key2Chars: 0
      };
      if (utils) utils.setLocal("counsel_azure_speech_usage", savedStats);
    }

    return savedStats;
  },

  // تسجيل الأحرف المستهلكة في المفتاح النشط
  recordUsage: function(keyIndex, charCount) {
    var utils = window.APP_UTILS;
    if (!utils || !charCount || charCount <= 0) return;
    var stats = this.getUsageStats();
    if (keyIndex === 1) {
      stats.key1Chars = (stats.key1Chars || 0) + charCount;
    } else if (keyIndex === 2) {
      stats.key2Chars = (stats.key2Chars || 0) + charCount;
    }
    utils.setLocal("counsel_azure_speech_usage", stats);
  },

  // تحديد المفتاح النشط مع الفحص التلقائي الوقائي للكوتا
  getActiveKeyInfo: function() {
    var cfg = this.getAzureConfig();
    var stats = this.getUsageStats();

    var key1Remaining = Math.max(0, this.MONTHLY_QUOTA_LIMIT - (stats.key1Chars || 0));
    var key2Remaining = Math.max(0, this.MONTHLY_QUOTA_LIMIT - (stats.key2Chars || 0));

    // فحص المفتاح الأول: إذا كان موجوداً ومتبقياً به أكثر من هامش الأمان
    if (cfg.key1 && key1Remaining > this.SAFETY_MARGIN) {
      return {
        key: cfg.key1,
        keyIndex: 1,
        remaining: key1Remaining,
        region: cfg.region,
        voice: cfg.voice,
        statusText: "المفتاح الأساسي (1) نشط"
      };
    }

    // التحويل التلقائي الآمن إلى المفتاح الثاني
    if (cfg.key2 && key2Remaining > this.SAFETY_MARGIN) {
      return {
        key: cfg.key2,
        keyIndex: 2,
        remaining: key2Remaining,
        region: cfg.region,
        voice: cfg.voice,
        statusText: (cfg.key1 ? "⚠️ كوتا المفتاح (1) شارفت على الانتهاء. تم الانتقال تلقائياً للمفتاح الاحتياطي (2)" : "المفتاح (2) نشط")
      };
    }

    // إذا شارف كلاهما على النفاد لكن أحدهما ما زال يملك حروفاً
    if (cfg.key1 && key1Remaining > 0) {
      return { key: cfg.key1, keyIndex: 1, remaining: key1Remaining, region: cfg.region, voice: cfg.voice, statusText: "المفتاح (1) يستهلك آخر حروفه" };
    }
    if (cfg.key2 && key2Remaining > 0) {
      return { key: cfg.key2, keyIndex: 2, remaining: key2Remaining, region: cfg.region, voice: cfg.voice, statusText: "المفتاح (2) يستهلك آخر حروفه" };
    }

    return null;
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

  // توليد الصوت مباشرة عبر Microsoft Azure Speech الرسمية
  _synthesizeWithAzure: async function(text, voice, keyInfo, onProgress) {
    var self = this;
    var endpoint = "https://" + encodeURIComponent(keyInfo.region) + ".tts.speech.microsoft.com/cognitiveservices/v1";

    var escText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    var ssml = "<speak version='1.0' xml:lang='ar-EG'>" +
      "<voice xml:lang='ar-EG' xml:gender='Female' name='" + (voice || self.DEFAULT_VOICE) + "'>" +
      escText +
      "</voice></speak>";

    if (typeof onProgress === "function") {
      onProgress("جاري توليد الصوت الرسمي بصوت سلمى (" + keyInfo.statusText + ")...");
    }

    var resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": keyInfo.key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        "User-Agent": "CounselingStudyPlatform"
      },
      body: ssml
    });

    if (!resp.ok) {
      var errTxt = "";
      try { errTxt = await resp.text(); } catch (e) {}
      if (resp.status === 401 || resp.status === 403) {
        throw new Error("مفتاح Azure Speech غير صالح أو المنطقة غير صحيحة (" + resp.status + "). يرجى التأكد من المفتاح والمنطقة في الإعدادات.");
      }
      if (resp.status === 429) {
        throw new Error("QUOTA_EXCEEDED");
      }
      throw new Error("خطأ في خدمة Azure Speech (" + resp.status + "): " + errTxt);
    }

    var blob = await resp.blob();
    var duration = await self._getAudioDuration(blob);
    var audioUrl = URL.createObjectURL(blob);

    // تسجيل استهلاك الحروف بنجاح
    self.recordUsage(keyInfo.keyIndex, text.length);

    return {
      audioUrl: audioUrl,
      blob: blob,
      duration: duration
    };
  },

  // الدالة العامة لتوليد الصوت (تدعم Azure Speech الرسمي كخيار أساسي فائق الاستقرار)
  generateAudioForText: async function(text, voiceKey, onProgress) {
    var self = this;
    var cleanedText = (text || "").trim();
    if (!cleanedText) {
      throw new Error("لا يوجد نص لتوليد الصوت منه.");
    }

    var activeKeyInfo = self.getActiveKeyInfo();

    // 1. إذا كان مفتاح Azure موجوداً، نعتمد عليه كلياً وبشكل رسمي
    if (activeKeyInfo) {
      var voice = voiceKey || activeKeyInfo.voice || self.DEFAULT_VOICE;
      try {
        var res = await self._synthesizeWithAzure(cleanedText, voice, activeKeyInfo, onProgress);
        var subs = self._buildSubtitlesForText(cleanedText, res.duration);

        return {
          audioUrl: res.audioUrl,
          blob: res.blob,
          duration: res.duration,
          subtitles: subs,
          toString: function() { return this.audioUrl; }
        };
      } catch (err) {
        // في حال نفاد الكوتا أثناء الطلب (429)، نحول فوراً للمفتاح الآخر
        if (err.message === "QUOTA_EXCEEDED" && activeKeyInfo.keyIndex === 1) {
          var cfg = self.getAzureConfig();
          if (cfg.key2) {
            if (typeof onProgress === "function") {
              onProgress("⚠️ نفدت كوتا المفتاح الأول، جاري التحويل الفوري للمفتاح الثاني...");
            }
            var backupKeyInfo = {
              key: cfg.key2,
              keyIndex: 2,
              region: cfg.region,
              voice: cfg.voice,
              statusText: "المفتاح الثاني البديل"
            };
            var backupRes = await self._synthesizeWithAzure(cleanedText, voice, backupKeyInfo, onProgress);
            var backupSubs = self._buildSubtitlesForText(cleanedText, backupRes.duration);

            return {
              audioUrl: backupRes.audioUrl,
              blob: backupRes.blob,
              duration: backupRes.duration,
              subtitles: backupSubs,
              toString: function() { return this.audioUrl; }
            };
          }
        }
        throw err;
      }
    }

    // 2. إذا لم يكن المفتاح مضافاً بعد في الإعدادات، نوجه المستخدم بوضوح تام
    throw new Error(
      "يرجى إدخال مفتاح Azure Speech في صفحة «الإعدادات» لتفعيل توليد الصوت بصوت سلمى الرسمي مجاناً.\n" +
      "الباقة المجانية تمنحك 500,000 حرف شهرياً لكل حساب مجاناً."
    );
  }
};
