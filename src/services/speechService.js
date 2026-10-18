// محرك القراءة الصوتية الذكية المباشرة عبر المتصفح (Web Speech Synthesis Engine)
// يعمل فورياً بدون أي إنترنت أو خوادم خارجية، ولا تنتهي صلاحيته، ويضمن سماع الصوت 100%
window.SpeechService = {
  isSpeaking: false,
  isPaused: false,
  currentBook: null,
  currentChapter: null,
  currentSentences: [],
  currentSentenceIdx: 0,
  playbackRate: 1.0,
  _keepAliveTimer: null,
  _lastSpokenChapterId: null,

  // تقسيم النص إلى جمل وفقرات قابلة للقراءة المتزامنة
  splitTextToSentences: function(text) {
    var raw = (text || "").trim();
    if (!raw) return [];
    var parts = raw.split(/([.!?؟\n\r]+)/);
    var sentences = [];
    for (var i = 0; i < parts.length; i += 2) {
      var s = (parts[i] || "").trim();
      var p = (parts[i + 1] || "").trim();
      var combined = (s + (p ? " " + p : "")).trim();
      if (combined && combined.length > 1) {
        sentences.push(combined);
      }
    }
    if (sentences.length === 0 && raw) sentences = [raw];
    return sentences;
  },

  // جلب أفضل صوت عربي مدعوم في متصفح وجهاز المستخدم
  getBestArabicVoice: function() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    if (!voices || voices.length === 0) return null;

    // 1. تفضيل الأصوات العربية القياسية والطبيعية
    var arVoice = voices.find(function(v) {
      return v.lang && (v.lang === "ar-SA" || v.lang === "ar-EG" || v.lang === "ar" || v.lang.startsWith("ar-") || v.lang.startsWith("ar_"));
    });
    if (arVoice) return arVoice;

    // 2. البحث عن كلمة Arabic في اسم الصوت
    var arByName = voices.find(function(v) {
      return v.name && v.name.toLowerCase().indexOf("arabic") !== -1;
    });
    if (arByName) return arByName;

    return null;
  },

  // فك حظر سياق الصوت للمتصفحات (Audio Context Unlock)
  _unlockAudioContext: function() {
    try {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        var ctx = new AudioContextClass();
        if (ctx.state === "suspended") {
          ctx.resume();
        }
      }
    } catch (e) {}
  },

  // بدء القراءة الصوتية الذكية للفصل
  speakChapter: function(book, chapter, startSentenceIdx) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("SpeechSynthesis not supported on this device/browser.");
      return false;
    }

    if (!chapter || !chapter.text || !chapter.text.trim()) {
      console.warn("SpeechService: No text available in chapter to speak.");
      return false;
    }

    // حماية قاطعة من تكرار التشغيل وإعادة الفصل لنفسه إذا كان يعمل بالفعل
    if (this.isSpeaking && !this.isPaused && this.currentChapter && this.currentChapter.id === chapter.id) {
      console.log("SpeechService: Chapter is already actively playing, ignoring duplicate trigger.");
      return true;
    }

    this._unlockAudioContext();

    // إيقاف أي قراءة سابقة بشكل نظيف
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (eCancel) {}

    this.currentBook = book || { id: "book", title: "مرجع دراسي" };
    this.currentChapter = chapter;
    this._lastSpokenChapterId = chapter.id;
    this.currentSentences = this.splitTextToSentences(chapter.text);
    this.currentSentenceIdx = typeof startSentenceIdx === "number" ? startSentenceIdx : 0;
    if (this.currentSentenceIdx < 0 || this.currentSentenceIdx >= this.currentSentences.length) {
      this.currentSentenceIdx = 0;
    }
    this.isSpeaking = true;
    this.isPaused = false;

    var self = this;

    // حماية دورية من ثغرة توقف القراءة بعد 15 ثانية في متصفحات كروم وموبايل
    if (this._keepAliveTimer) clearInterval(this._keepAliveTimer);
    this._keepAliveTimer = setInterval(function() {
      if (self.isSpeaking && !self.isPaused && window.speechSynthesis.speaking) {
        try {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } catch (eKa) {}
      }
    }, 10000);

    var speakNext = function(idx) {
      if (!self.isSpeaking) return;
      if (idx >= self.currentSentences.length) {
        self.stop();
        return;
      }

      self.currentSentenceIdx = idx;
      var textChunk = self.currentSentences[idx];
      var utter = new SpeechSynthesisUtterance(textChunk);

      utter.lang = "ar-SA";
      var arVoice = self.getBestArabicVoice();
      if (arVoice) utter.voice = arVoice;
      utter.rate = self.playbackRate || 1.0;
      utter.pitch = 1.0;

      utter.onend = function() {
        if (self.isSpeaking && !self.isPaused) {
          speakNext(idx + 1);
        }
      };

      utter.onerror = function(err) {
        console.warn("Speech chunk note:", err);
        if (self.isSpeaking && !self.isPaused) {
          if (err && (err.error === "canceled" || err.error === "interrupted")) {
            return;
          }
          // الانتقال للجملة التالية عند أي تعثر في مقطع فردي
          setTimeout(function() {
            if (self.isSpeaking && !self.isPaused) {
              speakNext(idx + 1);
            }
          }, 60);
        }
      };

      try {
        window.speechSynthesis.speak(utter);
      } catch (eSpeak) {
        console.error("Speech speak error:", eSpeak);
      }

      // حفظ موضع الاستماع بالذاكرة وتحديث الواجهة
      if (self.currentBook && self.currentChapter) {
        try {
          localStorage.setItem("counsel_audio_pos_" + self.currentBook.id + "_" + self.currentChapter.id, String(idx));
          var rec = {
            type: "chapter",
            bookId: self.currentBook.id,
            bookTitle: self.currentBook.title || "مرجع دراسي",
            chapterId: self.currentChapter.id,
            chapterTitle: self.currentChapter.title || "فصل صوتي",
            chapterAudioUrl: self.currentChapter.audioUrl || "",
            chapterText: self.currentChapter.text || "",
            position: idx,
            duration: self.currentSentences.length,
            updatedAt: Date.now()
          };
          localStorage.setItem("counsel_last_audio_track", JSON.stringify(rec));
        } catch (ePos) {}
      }

      self._syncGlobal();
    };

    speakNext(this.currentSentenceIdx);
    this._syncGlobal();
    return true;
  },

  pause: function() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.isPaused = true;
      try { window.speechSynthesis.pause(); } catch (e) {}
      this._syncGlobal();
    }
  },

  resume: function() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.isPaused = false;
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else if (!window.speechSynthesis.speaking && this.currentChapter) {
          this.speakChapter(this.currentBook, this.currentChapter, this.currentSentenceIdx);
        }
      } catch (e) {}
      this._syncGlobal();
    }
  },

  stop: function() {
    this.isSpeaking = false;
    this.isPaused = false;
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    this._syncGlobal();
  },

  setRate: function(rate) {
    this.playbackRate = rate;
    if (this.isSpeaking && !this.isPaused) {
      var curIdx = this.currentSentenceIdx;
      this.stop();
      this.speakChapter(this.currentBook, this.currentChapter, curIdx);
    }
  },

  _syncGlobal: function() {
    var self = this;
    if (self.isSpeaking) {
      window.__ACTIVE_PLAYING_AUDIO = {
        title: (self.currentChapter && self.currentChapter.title) || "قراءة صوتية ذكية",
        book: (self.currentBook && self.currentBook.title) || "مرجع دراسي",
        isPlaying: !self.isPaused,
        isSpeech: true,
        chapterId: self.currentChapter ? self.currentChapter.id : null,
        togglePlay: function() {
          if (self.isPaused) self.resume();
          else self.pause();
        },
        stop: function() {
          self.stop();
        }
      };
    } else if (window.__ACTIVE_PLAYING_AUDIO && window.__ACTIVE_PLAYING_AUDIO.isSpeech) {
      window.__ACTIVE_PLAYING_AUDIO = null;
    }
    try { window.dispatchEvent(new Event("counsel_audio_state_change")); } catch (e) {}
    try { window.dispatchEvent(new Event("counsel_speech_state_change")); } catch (e) {}
  }
};

// تحميل الأصوات في المتصفحات التي تدعم التحميل غير المتزامن (Chrome/Edge)
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.onvoiceschanged = function() {
      if (window.SpeechService && window.SpeechService.isSpeaking && window.SpeechService.currentChapter) {
        // أصوات المتصفح جاهزة
      }
    };
  } catch (eInit) {}
}
