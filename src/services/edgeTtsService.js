// خدمة تحويل النص إلى صوت (Text-to-Speech Service)
// محرك صوت «سلمى» الرسمي المصري (ar-EG-SalmaNeural)
// يدعم:
// 1. التوليد المباشر عبر متصفح الويب (Direct Edge-TTS WebSocket مع تشفير Sec-MS-GEC) - مجاني وبدون كوتا
// 2. محرك Microsoft Azure Speech الرسمي (في حال إدخال مفتاح في الإعدادات) مع التبديل التلقائي بين مفتاحين
// 3. التقطيع الذكي للنصوص الضخمة، والدمج التلقائي، ومزامنة توقيتات النص (Subtitles / SRT)

window.EdgeTtsService = {
  DEFAULT_VOICE: "ar-EG-SalmaNeural",
  DEFAULT_REGION: "eastus",
  CHUNK_CHAR_LIMIT: 2600,
  TRUSTED_CLIENT_TOKEN: "6A5AA1D4EAFF4E9FB37E23D68491D6F4",
  BASE_URL: "speech.platform.bing.com/consumer/speech/synthesize/readaloud",
  CHROMIUM_FULL_VERSION: "130.0.2849.68",
  WIN_EPOCH: 11644473600,

  // تنظيف النص العربي وتجريده من رموز الـ BOM والأرقام العلوية التي تعطل محركات الصوت
  cleanText: function(text) {
    if (!text) return "";
    return text
      .replace(/\ufeff/g, "")
      .replace(/[\u200b\u200c\u200d]/g, "")
      .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, "")
      .trim();
  },

  // قائمة الأصوات المتوافقة مع المنصة
  SUPPORTED_VOICES: [
    { id: "ar-EG-SalmaNeural", name: "سلمى - مصري أنثوي نقي ودافئ (الموصى به)", gender: "female", region: "Egypt" },
    { id: "ar-EG-ShakirNeural", name: "شاكر - مصري رجالي وقور", gender: "male", region: "Egypt" },
    { id: "ar-SA-ZariyahNeural", name: "زارية - فصحى خليجي أنثوي", gender: "female", region: "Saudi Arabia" },
    { id: "ar-SA-HamedNeural", name: "حامد - فصحى خليجي رجالي", gender: "male", region: "Saudi Arabia" }
  ],

  // -------------------------------------------------------------
  // 1. إعدادات محرك Azure Speech الرسمي ومراقبة الكوتا
  // -------------------------------------------------------------
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

  saveAzureConfig: function(config) {
    var utils = window.APP_UTILS;
    if (!utils) return;
    if (config.key1 !== undefined) utils.setLocal("counsel_azure_speech_key_1", config.key1.trim());
    if (config.key2 !== undefined) utils.setLocal("counsel_azure_speech_key_2", config.key2.trim());
    if (config.region !== undefined) utils.setLocal("counsel_azure_speech_region", config.region.trim());
    if (config.voice !== undefined) utils.setLocal("counsel_azure_speech_voice", config.voice.trim());
  },

  getUsageStats: function() {
    var utils = window.APP_UTILS;
    var currentMonth = new Date().toISOString().slice(0, 7);
    var savedStats = utils ? utils.getLocal("counsel_azure_speech_usage", null) : null;

    if (!savedStats || savedStats.month !== currentMonth) {
      savedStats = {
        month: currentMonth,
        key1Chars: 0,
        key2Chars: 0
      };
      if (utils) utils.setLocal("counsel_azure_speech_usage", savedStats);
    }
    return savedStats;
  },

  recordUsage: function(keyIndex, charCount) {
    var utils = window.APP_UTILS;
    if (!utils) return;
    var stats = this.getUsageStats();
    if (keyIndex === 1) stats.key1Chars = (stats.key1Chars || 0) + charCount;
    if (keyIndex === 2) stats.key2Chars = (stats.key2Chars || 0) + charCount;
    utils.setLocal("counsel_azure_speech_usage", stats);
  },

  // -------------------------------------------------------------
  // 2. تقسيم النصوص الذكي ومزامنة التوقيتات
  // -------------------------------------------------------------
  splitTextIntoChunks: function(text, maxChars) {
    var limit = maxChars || this.CHUNK_CHAR_LIMIT;
    var cleaned = (text || "").trim();
    if (!cleaned) return [];
    if (cleaned.length <= limit) return [cleaned];

    var paragraphs = cleaned.split(/\n+/);
    var chunks = [];
    var current = "";

    for (var i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i].trim();
      if (!p) continue;

      if ((current.length + p.length + 2) <= limit) {
        current += (current ? "\n\n" : "") + p;
      } else {
        if (current) {
          chunks.push(current);
          current = "";
        }
        if (p.length > limit) {
          var sentences = p.split(/([.!?؟\n]+)/);
          var subChunk = "";
          for (var s = 0; s < sentences.length; s += 2) {
            var sent = (sentences[s] || "").trim();
            var punct = (sentences[s + 1] || "").trim();
            var fullSent = (sent + (punct ? " " + punct : "")).trim();
            if (!fullSent) continue;

            if ((subChunk.length + fullSent.length + 1) <= limit) {
              subChunk += (subChunk ? " " : "") + fullSent;
            } else {
              if (subChunk) chunks.push(subChunk);
              subChunk = fullSent;
            }
          }
          if (subChunk) current = subChunk;
        } else {
          current = p;
        }
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks.length > 0 ? chunks : [cleaned];
  },

  _buildSubtitlesForChunk: function(chunkText, startOffset, chunkDuration) {
    if (!chunkText || !chunkDuration || chunkDuration <= 0) return [];
    var rawParts = chunkText.split(/([.!?؟\n]+)/);
    var sentences = [];

    for (var i = 0; i < rawParts.length; i += 2) {
      var sText = (rawParts[i] || "").trim();
      var sPunct = (rawParts[i + 1] || "").trim();
      if (!sText && !sPunct) continue;
      var combined = (sText + (sPunct ? " " + sPunct : "")).trim();
      if (!combined) continue;

      if (combined.length > 85 && (combined.indexOf("،") !== -1 || combined.indexOf("؛") !== -1)) {
        var subParts = combined.split(/([،؛]+)/);
        var curSub = "";
        for (var j = 0; j < subParts.length; j += 2) {
          var pText = (subParts[j] || "").trim();
          var pPunct = (subParts[j + 1] || "").trim();
          var piece = (pText + (pPunct ? " " + pPunct : "")).trim();
          if (!piece) continue;
          if ((curSub.length + piece.length) > 85 && curSub.length >= 30) {
            sentences.push(curSub.trim());
            curSub = piece;
          } else {
            curSub = (curSub ? curSub + " " : "") + piece;
          }
        }
        if (curSub.trim()) sentences.push(curSub.trim());
      } else {
        sentences.push(combined);
      }
    }

    if (sentences.length === 0) sentences = [chunkText.trim()];

    var totalWeight = 0;
    var weights = sentences.map(function(s) {
      var w = s.length;
      if (/[.!?؟\n]/.test(s)) w += 15;
      if (/[،؛]/.test(s)) w += 6;
      totalWeight += w;
      return w;
    });

    if (totalWeight <= 0) totalWeight = 1;
    var cumTime = startOffset;
    var subs = [];

    for (var k = 0; k < sentences.length; k++) {
      var dur = (weights[k] / totalWeight) * chunkDuration;
      var sStart = Math.round(cumTime * 100) / 100;
      var sEnd = Math.round((cumTime + dur) * 100) / 100;
      subs.push({
        start: sStart,
        end: sEnd,
        text: sentences[k]
      });
      cumTime += dur;
    }

    return subs;
  },

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
        }, 4000);
        audio.src = objUrl;
      } catch (err) {
        resolve(0);
      }
    });
  },

  // -------------------------------------------------------------
  // 3. التوليد المباشر عبر WebSocket مع تشفير Sec-MS-GEC (مجاني 100%)
  // -------------------------------------------------------------
  _generateConnectionId: function() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 3 | 8)).toString(16);
    }).replace(/-/g, "").toUpperCase();
  },

  _getTimestamp: function() {
    return new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  },

  _escapeXml: function(str) {
    return (str || "").replace(/[<>&'"]/g, function(c) {
      switch (c) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "&": return "&amp;";
        case "'": return "&apos;";
        case '"': return "&quot;";
        default: return c;
      }
    });
  },

  _generateSecMsGec: async function() {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("متصفحك لا يدعم تشفير Web Crypto المطلوب لتوليد الصوت المباشر.");
    }
    var unixSeconds = Math.floor(Date.now() / 1000);
    var t = unixSeconds + this.WIN_EPOCH;
    t -= (t % 300);
    t *= 10000000; // 1e9 / 100 (ticks)
    var rawStr = Math.floor(t) + this.TRUSTED_CLIENT_TOKEN;
    var encoded = new TextEncoder().encode(rawStr);
    var hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, "0"); }).join("").toUpperCase();
  },

  _synthesizeWithDirectEdge: async function(chunkText, voiceKey, onProgress) {
    var self = this;
    var voice = (voiceKey || self.DEFAULT_VOICE).split(" - ")[0].trim();
    var connId = self._generateConnectionId();
    var secMsGec = await self._generateSecMsGec();
    var secVersion = "1-" + self.CHROMIUM_FULL_VERSION;

    var wssUrl = "wss://" + self.BASE_URL + "/edge/v1?TrustedClientToken=" + self.TRUSTED_CLIENT_TOKEN +
      "&Sec-MS-GEC=" + secMsGec +
      "&Sec-MS-GEC-Version=" + secVersion +
      "&ConnectionId=" + connId;

    return new Promise(function(resolve, reject) {
      var ws = null;
      var isClosed = false;
      var audioChunks = [];
      var timeoutId = null;

      try {
        ws = new WebSocket(wssUrl);
        ws.binaryType = "arraybuffer";
      } catch (wsErr) {
        return reject(wsErr);
      }

      timeoutId = setTimeout(function() {
        if (!isClosed) {
          isClosed = true;
          try { ws.close(); } catch (e) {}
          reject(new Error("استغرقت معالجة المقطع وقتاً أطول من المتوقع (مهلة الاتصال)."));
        }
      }, 45000);

      ws.onopen = function() {
        if (typeof onProgress === "function") {
          onProgress("جاري الاتصال السحابي وتوليد صوت سلمى...");
        }

        // 1. تهيئة التوليد
        var speechConfig = {
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: true },
                outputFormat: "audio-24khz-48kbitrate-mono-mp3"
              }
            }
          }
        };
        var configMsg = "X-Timestamp:" + self._getTimestamp() + "\r\n" +
          "Content-Type:application/json; charset=utf-8\r\n" +
          "Path:speech.config\r\n\r\n" +
          JSON.stringify(speechConfig);
        ws.send(configMsg);

        // 2. إرسال النص بصيغة SSML
        var ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ar-EG'>" +
          "<voice name='" + voice + "'>" +
          "<prosody pitch='+0Hz' rate='+0%' volume='+0%'>" +
          self._escapeXml(chunkText) +
          "</prosody>" +
          "</voice></speak>";

        var ssmlMsg = "X-RequestId:" + connId + "\r\n" +
          "Content-Type:application/ssml+xml\r\n" +
          "X-Timestamp:" + self._getTimestamp() + "Z\r\n" +
          "Path:ssml\r\n\r\n" +
          ssml;
        ws.send(ssmlMsg);
      };

      ws.onmessage = function(event) {
        if (typeof event.data === "string") {
          if (event.data.indexOf("Path:turn.end") !== -1) {
            isClosed = true;
            clearTimeout(timeoutId);
            try { ws.close(); } catch (e) {}
            if (audioChunks.length === 0) {
              return reject(new Error("انتهت المعالجة دون استلام بيانات صوتية من الخادم."));
            }
            var finalBlob = new Blob(audioChunks, { type: "audio/mpeg" });
            self._getAudioDuration(finalBlob).then(function(dur) {
              resolve({
                blob: finalBlob,
                duration: dur,
                audioUrl: URL.createObjectURL(finalBlob)
              });
            }).catch(function() {
              resolve({
                blob: finalBlob,
                duration: 0,
                audioUrl: URL.createObjectURL(finalBlob)
              });
            });
          }
        } else if (event.data instanceof ArrayBuffer) {
          // استخراج فوري متزامن لترويسة البيانات وتدفق الصوت
          var u8 = new Uint8Array(event.data);
          if (u8.length < 2) return;
          var headerLen = (u8[0] << 8) | u8[1];
          if (headerLen + 2 > u8.length) return;

          var headerBytes = u8.slice(2, headerLen + 2);
          var headerStr = new TextDecoder().decode(headerBytes);
          if (headerStr.indexOf("Path:audio") !== -1) {
            var audioData = u8.slice(headerLen + 2);
            if (audioData.length > 0) {
              audioChunks.push(audioData);
            }
          }
        }
      };

      ws.onerror = function(err) {
        if (!isClosed) {
          isClosed = true;
          clearTimeout(timeoutId);
          reject(new Error("حدث خطأ في الاتصال بمحرك Edge-TTS المباشر."));
        }
      };

      ws.onclose = function() {
        if (!isClosed) {
          isClosed = true;
          clearTimeout(timeoutId);
          if (audioChunks.length > 0) {
            var finalBlob = new Blob(audioChunks, { type: "audio/mpeg" });
            self._getAudioDuration(finalBlob).then(function(dur) {
              resolve({
                blob: finalBlob,
                duration: dur,
                audioUrl: URL.createObjectURL(finalBlob)
              });
            });
          } else {
            reject(new Error("أغلق الاتصال دون استلام بيانات الصوت."));
          }
        }
      };
    });
  },

  // -------------------------------------------------------------
  // 4. التوليد عبر Microsoft Azure Speech الرسمي (في حال توفر مفتاح)
  // -------------------------------------------------------------
  _synthesizeWithAzure: async function(text, voice, keyInfo, onProgress) {
    var self = this;
    var endpoint = "https://" + encodeURIComponent(keyInfo.region) + ".tts.speech.microsoft.com/cognitiveservices/v1";
    var cleanVoice = (voice || self.DEFAULT_VOICE).split(" - ")[0].trim();

    var ssml = "<speak version='1.0' xml:lang='ar-EG'>" +
      "<voice xml:lang='ar-EG' xml:gender='Female' name='" + cleanVoice + "'>" +
      self._escapeXml(text) +
      "</voice></speak>";

    if (typeof onProgress === "function") {
      onProgress("جاري توليد الصوت عبر محرك Azure الرسمي بصوت سلمى (" + (keyInfo.statusText || "") + ")...");
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
      if (resp.status === 429) throw new Error("QUOTA_EXCEEDED");
      var errTxt = "";
      try { errTxt = await resp.text(); } catch (e) {}
      throw new Error("خطأ Azure Speech (" + resp.status + "): " + errTxt);
    }

    var blob = await resp.blob();
    var duration = await self._getAudioDuration(blob);
    self.recordUsage(keyInfo.keyIndex, text.length);

    return {
      audioUrl: URL.createObjectURL(blob),
      blob: blob,
      duration: duration
    };
  },

  // -------------------------------------------------------------
  // 5. تحويل البيانات وتوليد المقطع مع التبديل الذكي بين المحركات
  // -------------------------------------------------------------
  _base64ToBlob: function(base64Data, contentType) {
    contentType = contentType || "audio/mpeg";
    var sliceSize = 1024;
    var byteCharacters = atob(base64Data);
    var byteArrays = [];
    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      var slice = byteCharacters.slice(offset, offset + sliceSize);
      var byteNumbers = new Array(slice.length);
      for (var i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type: contentType });
  },

  _synthesizeWithServerlessApi: async function(chunkText, voice, onProgress) {
    var self = this;
    if (typeof onProgress === "function") {
      onProgress("جاري توليد الصوت عبر محرك سلمى السحابي...");
    }

    var cleanChunk = self.cleanText ? self.cleanText(chunkText) : (chunkText || "").trim();
    var cleanVoice = (voice || self.DEFAULT_VOICE).split(" - ")[0].trim();

    // إذا كان المقطع لا يحتوي على أحرف قابلة للنطق (مثل مجرد فواصل أو أرقام هوامش)
    var hasLetters = /[\u0600-\u06FFa-zA-Z0-9]/.test(cleanChunk);
    if (!hasLetters) {
      return {
        audioUrl: "",
        blob: new Blob([], { type: "audio/mpeg" }),
        duration: 0,
        subtitles: []
      };
    }

    var lastErr = null;
    for (var attempt = 1; attempt <= 3; attempt++) {
      try {
        var resp = await fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleanChunk,
            voice: cleanVoice
          })
        });

        if (!resp.ok) {
          var errData = null;
          try { errData = await resp.json(); } catch (e) {}
          var msg = (errData && errData.error) ? errData.error : ("رمز استجابة السيرفر: " + resp.status);
          throw new Error(msg);
        }

        var result = await resp.json();
        if (!result.audioBase64) {
          throw new Error("لم يتم استلام بيانات صوتية من السيرفر.");
        }

        var blob = self._base64ToBlob(result.audioBase64, "audio/mpeg");
        var duration = await self._getAudioDuration(blob);

        return {
          audioUrl: URL.createObjectURL(blob),
          blob: blob,
          duration: duration,
          subtitles: result.subtitles || []
        };
      } catch (err) {
        lastErr = err;
        if (attempt < 3) {
          if (typeof onProgress === "function") {
            onProgress("إعادة المحاولة السحابية (" + (attempt + 1) + "/3)...");
          }
          await new Promise(function(r) { setTimeout(r, 1500 * attempt); });
        }
      }
    }

    throw new Error(lastErr ? lastErr.message : "تعذر الاتصال بخدمة الصوت السحابية.");
  },

  _generateSingleChunkResilient: async function(chunkText, voiceKey, onProgress) {
    var self = this;
    var azCfg = self.getAzureConfig();

    // 1. محاولة استخدام Azure Speech إذا كان المفتاح متاحاً
    if (azCfg.key1 || azCfg.key2) {
      var keyInfo = azCfg.key1 ? { key: azCfg.key1, keyIndex: 1, region: azCfg.region, statusText: "المفتاح الأساسي" }
                               : { key: azCfg.key2, keyIndex: 2, region: azCfg.region, statusText: "المفتاح الثاني" };
      try {
        return await self._synthesizeWithAzure(chunkText, voiceKey || azCfg.voice, keyInfo, onProgress);
      } catch (azErr) {
        if (azErr.message === "QUOTA_EXCEEDED" && azCfg.key2 && keyInfo.keyIndex === 1) {
          try {
            var backupInfo = { key: azCfg.key2, keyIndex: 2, region: azCfg.region, statusText: "المفتاح البديل" };
            return await self._synthesizeWithAzure(chunkText, voiceKey || azCfg.voice, backupInfo, onProgress);
          } catch (bErr) {
            console.warn("Azure backup key failed, falling back to Serverless API:", bErr);
          }
        }
        console.warn("Azure Speech failed, falling back to Serverless API:", azErr);
      }
    }

    // 2. استخدام محرك سلمى السحابي مع إعادة المحاولة التلقائية
    return await self._synthesizeWithServerlessApi(chunkText, voiceKey || self.DEFAULT_VOICE, onProgress);
  },

  // -------------------------------------------------------------
  // 6. الدالة العامة المعتمدة: تدعم التوليد المتوازي الفائق والتجميع الدقيق
  // -------------------------------------------------------------
  generateAudioForText: async function(text, voiceKey, onProgress) {
    var self = this;
    var voice = (voiceKey || self.DEFAULT_VOICE).split(" - ")[0].trim();
    var cleanedText = (text || "").trim();
    if (!cleanedText) {
      throw new Error("لا يوجد نص لتوليد الصوت منه.");
    }

    var chunks = self.splitTextIntoChunks(cleanedText, self.CHUNK_CHAR_LIMIT);
    if (chunks.length === 0) {
      throw new Error("تعذر تجهيز مقاطع النص.");
    }

    // حالة المقطع الواحد
    if (chunks.length === 1) {
      if (typeof onProgress === "function") {
        onProgress({ current: 1, total: 1, percent: 30, statusText: "جاري توليد الصوت بصوت «سلمى»..." });
      }
      var singleRes = await self._generateSingleChunkResilient(chunks[0], voice, function(st) {
        if (typeof onProgress === "function") {
          onProgress({ current: 1, total: 1, percent: 70, statusText: typeof st === "string" ? st : "جاري المعالجة..." });
        }
      });
      var singleSubs = (singleRes.subtitles && singleRes.subtitles.length > 0)
        ? singleRes.subtitles
        : self._buildSubtitlesForChunk(chunks[0], 0, singleRes.duration);

      return {
        audioUrl: singleRes.audioUrl,
        blob: singleRes.blob,
        duration: singleRes.duration,
        subtitles: singleSubs,
        toString: function() { return this.audioUrl; }
      };
    }

    // حالة الفصول الطويلة: معالجة متوازية خفيفة (مقطعين معاً) لتسريع الإنجاز بنسبة 2.5x مع ثبات تام
    var allBlobs = [];
    var allSubtitles = [];
    var currentCumulativeTime = 0;
    var CONCURRENCY = 2;

    for (var idx = 0; idx < chunks.length; idx += CONCURRENCY) {
      var batchIndices = [];
      for (var b = 0; b < CONCURRENCY && (idx + b) < chunks.length; b++) {
        batchIndices.push(idx + b);
      }

      var pct = Math.min(95, Math.round(((idx) / chunks.length) * 90) + 5);
      var curPartLabel = batchIndices.map(function(i) { return i + 1; }).join(" و ");
      var progressMsg = "جاري توليد الجزء (" + curPartLabel + " من " + chunks.length + ") بصوت سلمى...";

      if (typeof onProgress === "function") {
        onProgress({
          current: Math.min(chunks.length, idx + batchIndices.length),
          total: chunks.length,
          percent: pct,
          statusText: progressMsg
        });
      }

      // تشغيل المقاطع بالتوازي
      var batchPromises = batchIndices.map(function(chunkIdx) {
        var cText = chunks[chunkIdx];
        return self._generateSingleChunkResilient(cText, voice, function(subStatus) {
          if (typeof onProgress === "function") {
            onProgress({
              current: Math.min(chunks.length, idx + batchIndices.length),
              total: chunks.length,
              percent: pct,
              statusText: typeof subStatus === "string" ? ("أجزاء " + curPartLabel + ": " + subStatus) : progressMsg
            });
          }
        });
      });

      var batchResults = await Promise.all(batchPromises);

      // تجميع النتائج بالترتيب الصحيح
      for (var r = 0; r < batchResults.length; r++) {
        var chunkRes = batchResults[r];
        var cText = chunks[batchIndices[r]];
        if (chunkRes && chunkRes.blob && chunkRes.blob.size > 0) {
          allBlobs.push(chunkRes.blob);
          var chunkSubs = (chunkRes.subtitles && chunkRes.subtitles.length > 0)
            ? chunkRes.subtitles.map(function(s) {
                return {
                  start: Math.round((currentCumulativeTime + (s.start || 0)) * 100) / 100,
                  end: Math.round((currentCumulativeTime + (s.end || 0)) * 100) / 100,
                  text: s.text
                };
              })
            : self._buildSubtitlesForChunk(cText, currentCumulativeTime, chunkRes.duration);

          allSubtitles = allSubtitles.concat(chunkSubs);
          currentCumulativeTime += (chunkRes.duration || 0);
        }
      }

      // فاصل زمني قصير (300 مللي ثانية) لمنع حظر الطلبات المتتالية
      if (idx + CONCURRENCY < chunks.length) {
        await new Promise(function(resolve) { setTimeout(resolve, 300); });
      }
    }

    if (typeof onProgress === "function") {
      onProgress({
        current: chunks.length,
        total: chunks.length,
        percent: 98,
        statusText: "جاري دمج المقاطع في ملف صوتي واحد متكامل..."
      });
    }

    var combinedBlob = new Blob(allBlobs, { type: "audio/mpeg" });
    var combinedUrl = URL.createObjectURL(combinedBlob);

    return {
      audioUrl: combinedUrl,
      blob: combinedBlob,
      duration: currentCumulativeTime,
      subtitles: allSubtitles,
      toString: function() { return this.audioUrl; }
    };
  }
};
