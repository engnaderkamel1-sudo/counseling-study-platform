// خدمة استدعاء الذكاء الاصطناعي للتلخيص والبودكاست والمساعد الدراسي
window.GeminiAIService = {
  // مفتاح تخزين السحابة
  storageKey: "counsel_ai_api_key",

  // استخراج المفتاح من فايربيز أولاً أو التخزين المحلي الآمن
  getApiKey: async function() {
    try {
      if (window.db) {
        var doc = await window.db.collection("settings").doc("ai_config").get();
        if (doc.exists && doc.data().apiKey) {
          return doc.data().apiKey.trim();
        }
      }
    } catch (e) {}
    return window.APP_UTILS.getLocal(window.GeminiAIService.storageKey, "");
  },

  // حفظ المفتاح في السحابة ومحلياً
  saveApiKey: async function(key) {
    if (window.db) {
      await window.db.collection("settings").doc("ai_config").set({
        apiKey: key.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    window.APP_UTILS.setLocal(window.GeminiAIService.storageKey, key.trim());
  },

  // جلب النماذج المدعومة تلقائياً ومباشرة من حساب المستخدم (Auto Model Discovery)
  fetchSupportedModels: async function(key) {
    try {
      var listResp = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + key);
      if (listResp.ok) {
        var listData = await listResp.json();
        if (listData.models && Array.isArray(listData.models)) {
          var models = listData.models
            .filter(function(m) {
              return m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent");
            })
            .map(function(m) {
              return m.name.replace(/^models\//, "");
            });
          
          if (models.length > 0) {
            // تفضيل نماذج flash الخفيفة والسريعة أولاً
            models.sort(function(a, b) {
              var aScore = (a.includes("2.0") ? 10 : 0) + (a.includes("flash") ? 5 : 0);
              var bScore = (b.includes("2.0") ? 10 : 0) + (b.includes("flash") ? 5 : 0);
              return bScore - aScore;
            });
            return models;
          }
        }
      }
    } catch (e) {
      console.warn("fetchSupportedModels error:", e);
    }
    return [];
  },

  // دالة الاستدعاء المباشر لنماذج جيميني مع الاكتشاف التلقائي الكامل (Auto)
  callGemini: async function(prompt, systemInstruction) {
    var key = await window.GeminiAIService.getApiKey();
    if (!key) {
      throw new Error("يرجى إدخال مفتاح واجهة برمجة التطبيقات في صفحة الإعدادات لحفظه سحابياً.");
    }

    var defaultInstruction = "أنت مساعد دراسي متخصص في دراسة ومناهج المشورة الإنسانية والنفسية. لغتك عربية نقية وواضحة، تقدم تحليلات عميقة وشروحات دقيقة تخدم الدارس وتساعده على الاستيعاب.";
    var instruction = systemInstruction || defaultInstruction;

    var body = {
      systemInstruction: {
        parts: [{ text: instruction }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    };

    // اكتشاف النماذج المتاحة من حساب المستخدم تلقائياً
    var autoModels = await window.GeminiAIService.fetchSupportedModels(key);
    var candidateModels = autoModels.length > 0 ? autoModels : [
      "gemini-2.0-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
      "gemini-pro"
    ];

    var lastErrorMessage = "";

    for (var m = 0; m < candidateModels.length; m++) {
      var modelName = candidateModels[m];
      var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + key;

      try {
        var response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          var data = await response.json();
          if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text;
          }
        } else {
          var errData = await response.json().catch(function() { return {}; });
          lastErrorMessage = (errData.error && errData.error.message) || ("فشل الاستدعاء للنموذج " + modelName);
        }
      } catch (networkErr) {
        lastErrorMessage = networkErr.message;
      }
    }

    throw new Error(lastErrorMessage || "تعذر العثور على نموذج متوافق مع هذا المفتاح");
  },

  // توليد حوار البودكاست التفاعلي بين شخصين
  generatePodcastDialogue: async function(lectureTitle, notesOrContent) {
    var prompt = "قم بإنشاء سيناريو حواري بودكاست تفاعلي ممتع بين شخصين (المحاور الأول: فادي، والمحاورة الثانية: سارة) لمناقشة وشرح موضوع: '" + lectureTitle + "'.\n" +
      "المحتوى والنقاط الأساسية:\n" + (notesOrContent || "أسس الفهم الإنساني والمشورة") + "\n\n" +
      "المطلوب: أخرج الحوار في شكل متبادل بين فادي وسارة بلغة عربية سلسلة وهادئة مناسبة للاستماع المباشر في أي وقت بأسلوب بودكاست طبيعي وإنساني بدون أي مقدمات نمطية أو روبوتية، يطرح فادي التساؤلات الواقعية وتجيب سارة بشرح أعمق وتطبيقات عملية ملموسة.";
    
    return await window.GeminiAIService.callGemini(prompt);
  },

  // توليد كبسولة مراجعة الامتحان
  generateExamSummary: async function(title, content) {
    var prompt = "استخرج كبسولة مراجعة سريعة ومركزة ليلة الامتحان للموضوع التالي: '" + title + "'.\n" +
      "المحتوى:\n" + (content || "") + "\n\n" +
      "المطلوب:\n" +
      "1. المفاهيم والتعريفات الجوهرية.\n" +
      "2. الفروق الدقيقة والمصطلحات الأساسية.\n" +
      "3. أسئلة متوقعة وأجوبتها النموذجية المختصرة.";
    
    return await window.GeminiAIService.callGemini(prompt);
  },

  // استخراج النص من صورة (لتحليل الـ PDF)
  extractTextFromImage: async function(base64Image) {
    var key = await window.GeminiAIService.getApiKey();
    if (!key) {
      throw new Error("يرجى إدخال مفتاح واجهة برمجة التطبيقات في الإعدادات لتفعيل القارئ الذكي.");
    }
    
    // إزالة البادئة إذا وجدت (data:image/jpeg;base64,)
    var cleanBase64 = base64Image;
    if (cleanBase64.indexOf("base64,") !== -1) {
      cleanBase64 = cleanBase64.split("base64,")[1];
    }
    
    var body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: "قم باستخراج جميع النصوص العربية من هذه الصورة بدقة شديدة كما هي مكتوبة تماماً. قم بإرجاع النص المكتوب فقط بدون أي مقدمات أو تعليقات خارجية." },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1, // نحتاج لدقة الاستخراج وليس الإبداع
        maxOutputTokens: 2048
      }
    };
    
    // اكتشاف النماذج المتاحة من حساب المستخدم تلقائياً
    var autoModels = await window.GeminiAIService.fetchSupportedModels(key);
    var candidateModels = autoModels.length > 0 ? autoModels : [
      "gemini-2.0-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
      "gemini-pro"
    ];
    
    var lastError = "";
    for (var i = 0; i < candidateModels.length; i++) {
      var modelName = candidateModels[i];
      var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + key;
      try {
        var response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        
        if (response.ok) {
          var data = await response.json();
          if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text.trim();
          }
        } else {
          var errData = await response.json().catch(function() { return {}; });
          lastError = (errData.error && errData.error.message) || ("خطأ في نموذج " + modelName);
        }
      } catch (e) {
        lastError = e.message;
      }
    }
    
    throw new Error(lastError || "فشل قراءة الصورة بجميع نماذج الذكاء الاصطناعي");
  }
};
