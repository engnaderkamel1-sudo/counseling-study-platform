// خدمة توليد الحزم التعليمية الشاملة بالذكاء الاصطناعي (Educational AI Engine)
// تدعم الأركان الأربعة: الملخص الموسع، شرائح العرض، الخريطة الذهنية، والكويز التفاعلي
// مرتبطة بالمفتاح المركزي الموحد للتطبيق (Single Source of Truth) مع دعم المسودة والنشر المستقل

(function() {
  "use strict";

  window.EducationalAIService = {
    // 1. الحصول على المفتاح المركزي الموحد من قلب التطبيق
    getApiKey: async function() {
      // الاعتماد على الدالة المركزية لخدمة جيميني الحالية إن وجدت
      if (window.GeminiAIService && typeof window.GeminiAIService.getApiKey === "function") {
        var key = await window.GeminiAIService.getApiKey();
        if (key && key.trim()) return key.trim();
      }

      // فحص قاعدة البيانات السحابية (Firestore) من المستند المركزي للإعدادات
      try {
        if (window.db) {
          var doc = await window.db.collection("settings").doc("ai_config").get();
          if (doc.exists && doc.data() && doc.data().apiKey) {
            return doc.data().apiKey.trim();
          }
        }
      } catch (err) {
        console.warn("EducationalAIService: Firestore key fetch fallback:", err);
      }

      // فحص التخزين المحلي الموحد للتطبيق
      if (window.APP_UTILS && typeof window.APP_UTILS.getLocal === "function") {
        var localKey = window.APP_UTILS.getLocal("counsel_ai_api_key", "");
        if (localKey && localKey.trim()) return localKey.trim();
      }

      return "";
    },

    // 2. تنظيف وتحليل كود JSON الصادر من النموذج بدقة وأمان
    _cleanAndParseJson: function(rawText) {
      if (!rawText || typeof rawText !== "string") {
        throw new Error("لم يتم استلام أي نص من النموذج لتحليله.");
      }

      var cleaned = rawText.trim();

      // إزالة وسوم markdown البرمجية إذا كانت موجودة
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      cleaned = cleaned.trim();

      // محاولة التحليل المباشر
      try {
        return JSON.parse(cleaned);
      } catch (firstErr) {
        // محاولة استخراج كائن JSON من بين نصوص الشرح إن وجدت
        var firstBrace = cleaned.indexOf("{");
        var lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          var subJson = cleaned.substring(firstBrace, lastBrace + 1);
          try {
            return JSON.parse(subJson);
          } catch (secondErr) {
            console.error("EducationalAIService: Substring JSON parse failed:", secondErr);
          }
        }
        throw new Error("تعذر استخراج بيانات بصيغة صالحة: " + firstErr.message);
      }
    },

    // 3. الاستدعاء المباشر للنموذج الأفضل عبر المفتاح المركزي مع دعم كامل للأحجام الكبيرة
    callModel: async function(prompt, systemInstruction, config) {
      var key = await window.EducationalAIService.getApiKey();
      if (!key) {
        throw new Error("يرجى إدخال مفتاح واجهة برمجة التطبيقات (API Key) في إعدادات المنصة أولاً ليتم استخدامه مركزياً.");
      }

      config = config || {};
      var genConfig = {
        temperature: (typeof config.temperature === "number") ? config.temperature : 0.4,
        maxOutputTokens: config.maxOutputTokens || 8192
      };

      if (config.responseMimeType) {
        genConfig.responseMimeType = config.responseMimeType;
      }

      var defaultInstruction = "أنت خبير أكاديمي وتربوي رفيع المستوى في علوم المشورة الأرثوذكسية والعلوم النفسية والإنسانية. تصيغ المحتوى بلغة عربية فصحى نقية، بأسلوب تعليمي ثري وشديد العمق والدقة.";
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
        generationConfig: genConfig
      };

      // اكتشاف النماذج المدعومة من حساب المستخدم أو قائمة النماذج الفائقة
      var candidateModels = [
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-pro"
      ];

      if (window.GeminiAIService && typeof window.GeminiAIService.fetchSupportedModels === "function") {
        try {
          var discovered = await window.GeminiAIService.fetchSupportedModels(key);
          if (Array.isArray(discovered) && discovered.length > 0) {
            candidateModels = discovered;
          }
        } catch (discErr) {
          console.warn("EducationalAIService: Model discovery fallback:", discErr);
        }
      }

      var lastError = "";

      for (var i = 0; i < candidateModels.length; i++) {
        var modelName = candidateModels[i];
        var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + key;

        try {
          var response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key
            },
            body: JSON.stringify(body)
          });

          if (response.ok) {
            var data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
              return data.candidates[0].content.parts[0].text;
            }
          } else {
            var errJson = await response.json().catch(function() { return {}; });
            var errMsg = (errJson.error && errJson.error.message) || "";
            var reason = (errJson.error && errJson.error.details && errJson.error.details[0] && errJson.error.details[0].reason) || "";

            if (response.status === 401 || response.status === 403 || reason === "API_KEY_SERVICE_BLOCKED" || errMsg.includes("API key not valid")) {
              throw new Error("مفتاح API المستخدم غير صالح أو منتهي الصلاحية. يرجى مراجعته في صفحة الإعدادات.");
            }
            lastError = errMsg || ("خطأ في النموذج: " + modelName);
          }
        } catch (netErr) {
          if (netErr.message && netErr.message.includes("مفتاح API")) throw netErr;
          lastError = netErr.message;
        }
      }

      throw new Error(lastError || "تعذر إتمام طلب التوليد بنماذج الذكاء الاصطناعي المتاحة.");
    },

    // 4. توليد الحزمة التعليمية الشاملة بالأرقام المرنة المحددة من المستخدم
    generateCompletePackage: async function(lectureTitle, lectureContent, options) {
      options = options || {};

      var summaryPages = parseInt(options.summaryPages, 10) || 5;
      var slidesCount = parseInt(options.slidesCount, 10) || 15;
      var quizCount = parseInt(options.quizCount, 10) || 10;
      var customInstructions = (options.customInstructions || "").trim();
      var selected = options.selectedComponents || { summary: true, slides: true, mindMap: true, quiz: true };

      var promptParts = [];
      promptParts.push("المطلوب: توليد حزمة دراسية شاملة فائقة العمق والتفصيل لمحاضرة المشورة التالية:");
      promptParts.push("عنوان المحاضرة: '" + (lectureTitle || "محاضرة غير معنونة") + "'");
      promptParts.push("\nمحتوى وتفريغ المحاضرة الأساسي:\n" + (lectureContent || "مفاهيم المشورة الأرثوذكسية والتأهيل النفسي"));

      promptParts.push("\n--- المعايير الرقمية والشروط الصارمة للتوليد ---");

      if (selected.summary !== false) {
        promptParts.push("1. الملخص الموسع الشامل:");
        promptParts.push("   - يجب أن يكون عميقاً وتفصيلياً يغطي ما يقارب " + summaryPages + " صفحات دراسية مكتوبة.");
        promptParts.push("   - يجب تغطية جميع المحاور، الأمثلة الكتابية والواقعية، الفروق الاصطلاحية، ونماذج الشرح دون أي اختصار مخل.");
      }

      if (selected.slides !== false) {
        promptParts.push("2. شرائح العرض التقديمي (PowerPoint Deck):");
        promptParts.push("   - قم بتوليد بالضبط " + slidesCount + " شريحة عرض مرقمة ومتسلسلة منطقياً.");
        promptParts.push("   - كل شريحة تحتوي على عنوان رئيسي، و3 إلى 5 نقاط مكثفة وشديدة الوضوح، مع أيقونة مناسبة وملاحظات للمحاضر.");
      }

      if (selected.mindMap !== false) {
        promptParts.push("3. الخريطة الذهنية الشجرية:");
        promptParts.push("   - هيكل شجري مرئي يربط الفكرة المركزية بالمحاور الرئيسية، مع تفريعات فرعية دقيقة لكل محور.");
      }

      if (selected.quiz !== false) {
        promptParts.push("4. الاختبار التفاعلي (الكويز):");
        promptParts.push("   - قم بتوليد بالضبط " + quizCount + " سؤال استيعابي وتحليلي متعدد الخيارات.");
        promptParts.push("   - كل سؤال يحتوي على 4 خيارات، ورقم الخيار الصحيح (0 إلى 3)، وتفسير تعليمي مفصل لسبب صحة الخيار.");
      }

      if (customInstructions) {
        promptParts.push("\nملاحظات وتوجيهات خاصة من المسؤول:\n" + customInstructions);
      }

      promptParts.push("\n--- هيكل المخرجات المطلوب (JSON الحصري) ---");
      promptParts.push("يجب أن تكون المخرجات عبارة عن كائن JSON خالص باللغة العربية مطابق تماماً للنموذج التالي دون أي كلام إضافي خارجه:");
      promptParts.push(JSON.stringify({
        summary: selected.summary !== false ? {
          overview: "مقدمة تمهيدية شاملة عن سياق وأهمية المحاضرة",
          learningObjectives: ["الهدف 1", "الهدف 2", "الهدف 3"],
          sections: [
            {
              title: "عنوان المحور التفصيلي",
              content: "شرح تفصيلي موسع جداً يشمل كافة المفاهيم والأمثلة",
              keyPoints: ["نقطة جوهرية 1", "نقطة جوهرية 2"]
            }
          ],
          keyTakeaways: ["الخلاصة العملية 1", "الخلاصة العملية 2"],
          reflectionQuestions: ["سؤال تأملي للتطبيق العملي"]
        } : null,
        slides: selected.slides !== false ? {
          items: [
            {
              slideNumber: 1,
              title: "عنوان الشريحة",
              icon: "🎯",
              bullets: ["نقطة توضيحية أولى", "نقطة توضيحية ثانية", "نقطة توضيحية ثالثة"],
              presenterNotes: "إضاءة للمحاضر أو الخادم عند الشرح"
            }
          ]
        } : null,
        mindMap: selected.mindMap !== false ? {
          root: {
            id: "root",
            title: "المحور الرئيسي للمحاضرة",
            icon: "🧠",
            children: [
              {
                id: "branch-1",
                title: "المفهوم الأساسي الأول",
                children: [
                  { id: "sub-1-1", title: "تفريع فرعي دقيق" }
                ]
              }
            ]
          }
        } : null,
        quiz: selected.quiz !== false ? {
          questions: [
            {
              id: "q-1",
              question: "نص السؤال الواضح والدقيق؟",
              options: ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
              correctAnswerIndex: 0,
              explanation: "توضيح تعليمي مسيحي ونفسي لسبب صحة هذا الجواب"
            }
          ]
        } : null
      }, null, 2));

      var rawResult = await window.EducationalAIService.callModel(
        promptParts.join("\n"),
        "أنت مصمم محتوى تعليمي ومستشار في دراسات المشورة المسيحية. قم بالرد الحصري بهيكل JSON النقي المطلوب دون أي كود غير صالح.",
        { maxOutputTokens: 8192, temperature: 0.3 }
      );

      var parsed = window.EducationalAIService._cleanAndParseJson(rawResult);

      // تطبيق حالة المسودة التلقائية (غير منشورة) لحماية المحتوى حتى مراجعته
      var output = {};

      if (parsed.summary) {
        output.summary = Object.assign({}, parsed.summary, { isPublished: false, targetPages: summaryPages });
      }
      if (parsed.slides && Array.isArray(parsed.slides.items)) {
        output.slides = { items: parsed.slides.items, isPublished: false, targetCount: slidesCount };
      }
      if (parsed.mindMap && parsed.mindMap.root) {
        output.mindMap = { root: parsed.mindMap.root, isPublished: false };
      }
      if (parsed.quiz && Array.isArray(parsed.quiz.questions)) {
        output.quiz = { questions: parsed.quiz.questions, isPublished: false, targetCount: quizCount };
      }

      return output;
    },

    // 5. تعديل أو إعادة توليد ركن محدد بناءً على تعليمات المستخدم المباشرة
    refineComponent: async function(componentType, currentData, lectureTitle, lectureContent, userInstruction) {
      var prompt = "المطلوب: إعادة صياغة وتعديل ركن '" + componentType + "' في محاضرة: '" + (lectureTitle || "") + "'.\n" +
        "محتوى المحاضرة المرجعي:\n" + (lectureContent || "") + "\n\n" +
        "البيانات الحالية للركن:\n" + JSON.stringify(currentData || {}, null, 2) + "\n\n" +
        "توجيهات التعديل المطلوبة من المسؤول:\n" + (userInstruction || "تحسين الصياغة وزيادة العمق والوضوح") + "\n\n" +
        "المطلوب إخراج الكائن المعدل بصيغة JSON نقي حصرياً لهذا الركن فقط، مع الحفاظ على هيكله الأصلي.";

      var raw = await window.EducationalAIService.callModel(
        prompt,
        "أنت مساعد أكاديمي لتحديث وتنقيح وتعديل المحتوى التعليمي. أخرج حصراً كائن JSON النقي المعدل.",
        { maxOutputTokens: 8192, temperature: 0.3 }
      );

      var refined = window.EducationalAIService._cleanAndParseJson(raw);
      // الاحتفاظ بحالة النشر أو إعادتها كمسودة للمراجعة
      refined.isPublished = false;
      return refined;
    }
  };
})();
