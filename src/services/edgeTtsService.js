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

  // الحد الأقصى الآمن لحجم المقطع الواحد (أقل من 6500 حرف لضمان عدم تجاوز حد 10000 توكن للدقيقة في باقة Gemini المجانية)
  CHUNK_CHAR_LIMIT: 6000,

  // تقسيم النص بذكاء بناءً على علامات الترقيم العربية ونهايات الفقرات والجمل
  splitTextIntoChunks: function(text, maxChars) {
    var limit = maxChars || this.CHUNK_CHAR_LIMIT;
    if (!text || text.length <= limit) return [text.trim()];

    // تقسيم النص أولاً حسب الفقرات والأسطر
    var paragraphs = text.split(/\n+/);
    var chunks = [];
    var currentChunk = "";

    for (var i = 0; i < paragraphs.length; i++) {
      var para = paragraphs[i].trim();
      if (!para) continue;

      if ((currentChunk.length + para.length + 1) <= limit) {
        currentChunk = (currentChunk ? currentChunk + "\n\n" : "") + para;
      } else {
        // إذا كانت الفقرة بمفردها أكبر من الحد المسموح، نقسمها بالجمل وعلامات الترقيم
        if (para.length > limit) {
          var rawSentences = para.split(/([.!?؟\n]+)/);
          for (var s = 0; s < rawSentences.length; s += 2) {
            var sent = ((rawSentences[s] || "") + (rawSentences[s + 1] || "")).trim();
            if (!sent) continue;

            if ((currentChunk.length + sent.length + 1) <= limit) {
              currentChunk = (currentChunk ? currentChunk + " " : "") + sent;
            } else {
              if (currentChunk.trim()) chunks.push(currentChunk.trim());
              currentChunk = sent;
            }
          }
        } else {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = para;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text.trim()];
  },

  // بناء توقيتات محاذاة النص للمقطع مع نقطة بداية تراكمية
  _buildSubtitlesForChunk: function(chunkText, startOffset, chunkDuration) {
    if (!chunkText || !chunkDuration || chunkDuration <= 0) return [];
    var rawParts = chunkText.split(/([.!?؟\n]+)/);
    var sentences = [];

    for (var i = 0; i < rawParts.length; i += 2) {
      var sText = (rawParts[i] || "").trim();
      var sPunct = (rawParts[i + 1] || "").trim();
      var combined = (sText + (sPunct ? " " + sPunct : "")).trim();
      if (combined) sentences.push(combined);
    }
    if (sentences.length === 0) sentences = [chunkText.trim()];

    var totalChars = 0;
    sentences.forEach(function(st) { totalChars += st.length; });
    if (totalChars <= 0) totalChars = 1;

    var curTime = startOffset;
    var subs = [];
    for (var j = 0; j < sentences.length; j++) {
      var segDur = (sentences[j].length / totalChars) * chunkDuration;
      var start = Math.round(curTime * 100) / 100;
      var end = Math.round((curTime + segDur) * 100) / 100;
      subs.push({ start: start, end: end, text: sentences[j] });
      curTime += segDur;
    }
    return subs;
  },

  // بناء توقيتات مبسطة للجمل داخل النص (للمزامنة مع القارئ)
  _buildSubtitlesForText: function(text, duration) {
    return this._buildSubtitlesForChunk(text, 0, duration);
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

  // دمج مصفوفة من ملفات WAV الصوتية في ملف WAV واحد سليم بدون تلف الهيدر (PCM Concatenation)
  _concatenateWavBlobs: async function(wavBlobs) {
    if (!wavBlobs || wavBlobs.length === 0) return null;
    if (wavBlobs.length === 1) return wavBlobs[0];

    var buffers = [];
    for (var b = 0; b < wavBlobs.length; b++) {
      var arrayBuf = await wavBlobs[b].arrayBuffer();
      buffers.push(arrayBuf);
    }

    // استخراج معلومات الهيدر من أول ملف
    var firstBuf = buffers[0];
    var firstView = new DataView(firstBuf);

    // التحقق من صيغة RIFF WAV
    var isRiff = (firstView.getUint32(0, false) === 0x52494646); // 'RIFF'
    var isWav = (firstView.getUint32(8, false) === 0x57415645);  // 'WAVE'

    if (!isRiff || !isWav) {
      // إذا لم تكن صيغة WAV قياسية، ندمجها كـ Blobs عادية
      return new Blob(wavBlobs, { type: wavBlobs[0].type || "audio/wav" });
    }

    // البحث عن مقطع 'data' في الملف الأول
    var pcmChunks = [];
    var totalPcmLength = 0;
    var numChannels = 1;
    var sampleRate = 24000;
    var bitsPerSample = 16;

    for (var i = 0; i < buffers.length; i++) {
      var buf = buffers[i];
      var view = new DataView(buf);
      var offset = 12; // بعد 'RIFF' و 'WAVE'
      var dataFound = false;

      while (offset < buf.byteLength - 8) {
        var chunkId = view.getUint32(offset, false);
        var chunkSize = view.getUint32(offset + 4, true);

        if (chunkId === 0x666d7420) { // 'fmt '
          numChannels = view.getUint16(offset + 8, true);
          sampleRate = view.getUint32(offset + 10, true);
          bitsPerSample = view.getUint16(offset + 22, true);
        } else if (chunkId === 0x64617461) { // 'data'
          var pcmData = new Uint8Array(buf, offset + 8, Math.min(chunkSize, buf.byteLength - (offset + 8)));
          pcmChunks.push(pcmData);
          totalPcmLength += pcmData.byteLength;
          dataFound = true;
          break;
        }
        offset += 8 + chunkSize;
      }

      if (!dataFound) {
        // احتياطي إذا تعذر قراءة الشنك بدقة: تخطي أول 44 بايت (الهيدر القياسي)
        var fallbackHeaderSize = Math.min(44, buf.byteLength);
        var fallbackData = new Uint8Array(buf, fallbackHeaderSize);
        pcmChunks.push(fallbackData);
        totalPcmLength += fallbackData.byteLength;
      }
    }

    // بناء هيدر WAV جديد بطول 44 بايت يغطي كامل الداتا المدمجة
    var header = new ArrayBuffer(44);
    var hv = new DataView(header);
    var byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    var blockAlign = numChannels * (bitsPerSample / 8);

    // RIFF identifier
    hv.setUint32(0, 0x52494646, false); // 'RIFF'
    hv.setUint32(4, 36 + totalPcmLength, true); // File length - 8
    hv.setUint32(8, 0x57415645, false); // 'WAVE'

    // fmt subchunk
    hv.setUint32(12, 0x666d7420, false); // 'fmt '
    hv.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    hv.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    hv.setUint16(22, numChannels, true);
    hv.setUint32(24, sampleRate, true);
    hv.setUint32(28, byteRate, true);
    hv.setUint16(32, blockAlign, true);
    hv.setUint16(34, bitsPerSample, true);

    // data subchunk
    hv.setUint32(36, 0x64617461, false); // 'data'
    hv.setUint32(40, totalPcmLength, true);

    var finalParts = [new Uint8Array(header)].concat(pcmChunks);
    return new Blob(finalParts, { type: "audio/wav" });
  },

  // طلب توليد مقطع صوتي فردي عبر Gemini
  _synthesizeSingleChunk: async function(chunkText, voiceName, onProgress, apiKey) {
    var self = this;
    var selectedVoice = voiceName || self.getVoiceConfig().voice || self.DEFAULT_GEMINI_VOICE;

    var payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: chunkText }]
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      var errData = null;
      try { errData = await resp.json(); } catch (e) {}
      var msg = (errData && errData.error && errData.error.message) ? errData.error.message : ("رمز الخطأ: " + resp.status);
      throw new Error(msg);
    }

    var result = await resp.json();
    var candidate = result.candidates && result.candidates[0];
    var part = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];

    if (!part || !part.inlineData || !part.inlineData.data) {
      throw new Error("لم يتم استلام محتوى صوتي من محرك Gemini.");
    }

    var mimeType = part.inlineData.mimeType || "audio/wav";
    var blob = self._base64ToBlob(part.inlineData.data, mimeType);
    var duration = await self._getAudioDuration(blob);

    return {
      blob: blob,
      duration: duration
    };
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

    // 1. فحص طول النص وتقطيعه إلى أجزاء آمنة لتفادي تجاوز حد الدقيقة (10000 توكن)
    var chunks = self.splitTextIntoChunks(text, self.CHUNK_CHAR_LIMIT);

    // حالة النص القصير (مقطع واحد فقط)
    if (chunks.length <= 1) {
      if (typeof onProgress === "function") {
        onProgress("جاري توليد الصوت الذكي بصوت " + selectedVoice + " عبر محرك Google Gemini...");
      }
      var singleRes = await self._synthesizeSingleChunk(chunks[0] || text, selectedVoice, onProgress, apiKey);
      var singleUrl = URL.createObjectURL(singleRes.blob);
      return {
        audioUrl: singleUrl,
        blob: singleRes.blob,
        duration: singleRes.duration
      };
    }

    // حالة النص الطويل (تقطيع متتابع ودمج سليم بدون كسر الكوتا)
    var allBlobs = [];
    var totalDuration = 0;

    for (var idx = 0; idx < chunks.length; idx++) {
      var chunkText = chunks[idx];
      var progressMsg = "جاري توليد الجزء الصوتي (" + (idx + 1) + " من " + chunks.length + ") بصوت " + selectedVoice + "...";
      if (typeof onProgress === "function") {
        onProgress(progressMsg);
      }

      var chunkRes = null;
      var lastErr = null;

      // محاولة التوليد مع معالجة ذكية إذا طلب جوجل الانتظار
      for (var attempt = 0; attempt < 3; attempt++) {
        try {
          chunkRes = await self._synthesizeSingleChunk(chunkText, selectedVoice, onProgress, apiKey);
          break;
        } catch (err) {
          lastErr = err;
          // إذا كان الخطأ متعلقاً بالكوتا ومعدل الطلبات في الدقيقة
          if (err.message && (err.message.includes("quota") || err.message.includes("Quota") || err.message.includes("429") || err.message.includes("retry in"))) {
            var waitSec = 25;
            var matchSec = err.message.match(/retry in\s*([\d\.]+)\s*s/i);
            if (matchSec && matchSec[1]) {
              waitSec = Math.ceil(parseFloat(matchSec[1])) + 2;
            }
            if (typeof onProgress === "function") {
              onProgress("⏳ انتظار أمان للكوتا (" + waitSec + " ثانية) قبل الجزء " + (idx + 1) + "...");
            }
            await new Promise(function(r) { setTimeout(r, waitSec * 1000); });
          } else {
            // خطأ شبكة عابر: انتظار ثانيتين والمحاولة مجدداً
            await new Promise(function(r) { setTimeout(r, 2500); });
          }
        }
      }

      if (!chunkRes) {
        throw new Error("فشل توليد الجزء الصوتي رقم " + (idx + 1) + ": " + (lastErr ? lastErr.message : "خطأ غير معروف"));
      }

      allBlobs.push(chunkRes.blob);
      totalDuration += chunkRes.duration;

      // إذا كان هناك مقطع قادم، ننتظر ثانيتين فاصل أمان بسيط
      if (idx < chunks.length - 1) {
        await new Promise(function(r) { setTimeout(r, 2000); });
      }
    }

    if (typeof onProgress === "function") {
      onProgress("جاري دمج الأجزاء الصوتية في ملف متكامل سليم...");
    }

    var mergedBlob = await self._concatenateWavBlobs(allBlobs);
    var mergedUrl = URL.createObjectURL(mergedBlob);
    var finalDuration = await self._getAudioDuration(mergedBlob);
    if (!finalDuration || finalDuration <= 0) {
      finalDuration = totalDuration;
    }

    return {
      audioUrl: mergedUrl,
      blob: mergedBlob,
      duration: finalDuration
    };
  },

  // الدالة العامة لتوليد الصوت (تدعم استدعاء Gemini AI TTS الرسمي مع التقطيع والدمج الكامل)
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

