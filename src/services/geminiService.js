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

  // دالة الاستدعاء المباشر لنماذج جيميني مع التبديل التلقائي للنماذج المتاحة
  callGemini: async function(prompt, systemInstruction) {
    var key = await window.GeminiAIService.getApiKey();
    if (!key) {
      throw new Error("يرجى إدخال مفتاح واجهة برمجة التطبيقات في صفحة الإعدادات لحفظه سحابياً.");
    }

    var defaultInstruction = "أنت مساعد دراسي متخصص في دراسة ومناهج المشورة الإنسانية والنفسية. لغتك عربية نقية وواضحة، تقدم تحليلات عميقة وشروحات دقيقة تخدم الدارس وتساعده على الاستيعاب.";
    var instruction = systemInstruction || defaultInstruction;

    var candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-8b",
      "gemini-pro"
    ];

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

    // 1. الاستعلام التلقائي من حساب المستخدم عن النماذج المتاحة والمدعومة
    var availableModels = [];
    try {
      var listResp = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + key);
      if (listResp.ok) {
        var listData = await listResp.json();
        if (listData.models && Array.isArray(listData.models)) {
          availableModels = listData.models
            .filter(function(m) {
              return m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent");
            })
            .map(function(m) {
              return m.name.replace(/^models\//, "");
            });
        }
      }
    } catch (e) {}

    // ترتيب النماذج بحيث يتم تفضيل النماذج السريعة مثل 2.5 أو 2.0 أو flash أو أي نموذج متاح
    var priorityList = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash",
      "gemini-1.5-pro-latest",
      "gemini-1.5-pro"
    ];

    var candidateModels = [];
    // إضافة النماذج ذات الأولوية إذا كانت متاحة أو افتراضياً
    for (var p = 0; p < priorityList.length; p++) {
      if (availableModels.length === 0 || availableModels.includes(priorityList[p])) {
        candidateModels.push(priorityList[p]);
      }
    }
    // إضافة بقية النماذج المتاحة من حساب المستخدم
    for (var a = 0; a < availableModels.length; a++) {
      if (!candidateModels.includes(availableModels[a])) {
        candidateModels.push(availableModels[a]);
      }
    }
    if (candidateModels.length === 0) {
      candidateModels = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash-latest"];
    }

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
      "المطلوب: أخرج الحوار في شكل متبادل بين فادي وسارة بلغة عربية سلسلة وهادئة مناسبة للاستماع في السيارة أثناء القيادة، يطرح فادي الأسئلة وتجيب سارة بشرح أعمق وتطبيقات عملية.";
    
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
  }
};
