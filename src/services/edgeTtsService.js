<<<<<<< HEAD
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
=======
// خدمة تحويل النص إلى صوت (Text-to-Speech Service - Edge TTS مع التقطيع الذكي والمزامنة)
window.EdgeTtsService = {
  DEFAULT_VOICE: "ar-EG-SalmaNeural - ar-EG (Female)",
  API_ENDPOINT: "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/call/tts_interface",
  CHUNK_CHAR_LIMIT: 2500,

  // تقسيم النص الطويل لأجزاء منطقية عند نهايات الفقرات والجمل التامة
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
          // تقسيم الفقرة الطويلة حسب علامات الترقيم والجمل التامة
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
          if (subChunk) {
            current = subChunk;
          }
        } else {
          current = p;
        }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  },

  // حساب دقيق لمدة المقطع الصوتي بالثواني
  _getAudioDuration: async function(blob) {
    try {
      var arrayBuffer = await blob.arrayBuffer();
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        var ctx = new AudioContextClass();
        var audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        var dur = audioBuffer ? audioBuffer.duration : 0;
        try { ctx.close(); } catch (eC) {}
        if (dur && isFinite(dur) && dur > 0) {
          return dur;
        }
      }
    } catch (e) {
      console.warn("AudioContext decode error, falling back to HTMLAudioElement:", e);
    }

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

  // بناء توقيتات دقيقة للجمل داخل جزء صوتي معين (Anchored Subtitles)
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

  // طلب توليد مقطع صوتي فردي (أقل من الحد الأقصى للحروف)
  _generateSingleChunk: async function(chunkText, voiceKey, onProgress) {
    var self = this;
    var voice = voiceKey || self.DEFAULT_VOICE;
    var payload = {
      data: [
        chunkText,
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

    var sseUrl = self.API_ENDPOINT + "/" + eventId;
    var maxAttempts = 50;
    var chunkAudioUrl = null;

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
            chunkAudioUrl = matchUrl[1];
          } else {
            var matchPath = sseText.match(/"path":\s*"([^"]+)"/);
            if (matchPath && matchPath[1]) {
              chunkAudioUrl = "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/file=" + matchPath[1];
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

    if (!chunkAudioUrl) {
      throw new Error("استغرقت معالجة المقطع الصوتي وقتاً أطول من المتوقع.");
    }

    // جلب ملف الصوت كـ Blob وحساب مدته بدقة
    var audioResp = await fetch(chunkAudioUrl);
    if (!audioResp.ok) {
      throw new Error("تعذر جلب ملف الصوت الناتج من السيرفر.");
    }
    var blob = await audioResp.blob();
    var duration = await self._getAudioDuration(blob);

    return {
      audioUrl: chunkAudioUrl,
      blob: blob,
      duration: duration
    };
  },

  // الدالة العامة: توليد مقطع صوتي لنص معين (تدعم النصوص القصيرة والضخمة عبر التقطيع والدمج التلقائي)
  generateAudioForText: async function(text, voiceKey, onProgress) {
    var self = this;
    var voice = voiceKey || self.DEFAULT_VOICE;
    var cleanedText = (text || "").trim();
    if (!cleanedText) {
      throw new Error("لا يوجد نص لتوليد الصوت منه.");
    }

    var chunks = self.splitTextIntoChunks(cleanedText, self.CHUNK_CHAR_LIMIT);
    if (chunks.length === 0) {
      throw new Error("تعذر تجهيز مقاطع النص.");
    }

    // حالة النص القصير (مقطع واحد فقط)
    if (chunks.length === 1) {
      if (typeof onProgress === "function") {
        onProgress("جاري توليد الصوت بصوت سلمى...");
      }
      var singleRes = await self._generateSingleChunk(chunks[0], voice, onProgress);
      var singleSubs = self._buildSubtitlesForChunk(chunks[0], 0, singleRes.duration);

      return {
        audioUrl: singleRes.audioUrl,
        blob: singleRes.blob,
        duration: singleRes.duration,
        subtitles: singleSubs,
        toString: function() { return this.audioUrl; }
      };
    }

    // حالة النص الطويل (تقطيع متتابع ودمج)
    var allBlobs = [];
    var allSubtitles = [];
    var currentCumulativeTime = 0;

    for (var idx = 0; idx < chunks.length; idx++) {
      var chunkText = chunks[idx];
      var progressMsg = "جاري توليد الجزء (" + (idx + 1) + " من " + chunks.length + ")...";
      if (typeof onProgress === "function") {
        onProgress(progressMsg);
      }

      // محاولة التوليد مع إعادة المحاولة لمرة واحدة في حال حدوث أي خطأ عابر
      var chunkRes = null;
      var lastErr = null;
      for (var retry = 0; retry < 2; retry++) {
        try {
          chunkRes = await self._generateSingleChunk(chunkText, voice, onProgress);
          break;
        } catch (err) {
          lastErr = err;
          await new Promise(function(r) { setTimeout(r, 2000); });
        }
      }

      if (!chunkRes) {
        throw new Error("فشل توليد الجزء رقم " + (idx + 1) + " بعد المحاولة: " + (lastErr ? lastErr.message : ""));
      }

      allBlobs.push(chunkRes.blob);

      // ربط توقيتات هذا الجزء بنقطة الارتكاز الزمنية التراكمية
      var chunkSubs = self._buildSubtitlesForChunk(chunkText, currentCumulativeTime, chunkRes.duration);
      allSubtitles = allSubtitles.concat(chunkSubs);
      currentCumulativeTime += chunkRes.duration;
    }

    // دمج المقاطع في ملف صوتي واحد متكامل
    if (typeof onProgress === "function") {
      onProgress("جاري دمج المقاطع الصوتية وإنهاء الملف...");
    }

    var combinedBlob = new Blob(allBlobs, { type: "audio/mp3" });
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
>>>>>>> 6b8849d (Add safe text chunking, anchored subtitles, and direct blob upload support)
