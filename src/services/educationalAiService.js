// خدمة توليد الحزم التعليمية الشاملة بالذكاء الاصطناعي (Educational AI Engine)
// الإصدار المتسلسل الذكي: يولد كل ركن بمفرده في خطوة مستقلة لضمان أقصى سعة وعمق ومنع أي انقطاع
// مربوط بالمفتاح الموحد والمزامنة السحابية الديناميكية ليعمل فوراً على الموبايل واللابتوب

(function() {
  "use strict";

  window.EducationalAIService = {
    // 1. الحصول على المفتاح المركزي (أولوية التخزين المحلي -> السحابة -> المفتاح الافتراضي للتطبيق)
    getApiKey: async function() {
      // أولوية 1: فحص التخزين المحلي للمتصفح الحالي إن وجد (إذا خصصه المستخدم من الإعدادات)
      if (window.APP_UTILS && typeof window.APP_UTILS.getLocal === "function") {
        var localKey = window.APP_UTILS.getLocal("counsel_ai_api_key", "");
        if (localKey && localKey.trim()) return localKey.trim();
        var legacyKey = window.APP_UTILS.getLocal("apiKey", "");
        if (legacyKey && legacyKey.trim()) return legacyKey.trim();
      }

      // أولوية 2: فحص قاعدة البيانات السحابية (Firestore) من المستند المركزي للإعدادات المشتركة
      try {
        if (window.db) {
          var doc = await window.db.collection("settings").doc("ai_config").get();
          if (doc.exists && doc.data() && doc.data().apiKey && doc.data().apiKey.trim()) {
            return doc.data().apiKey.trim();
          }
        }
      } catch (err) {
        console.warn("EducationalAIService: Firestore key fetch fallback:", err);
      }

      // أولوية 3: المفتاح المركزي الافتراضي للتطبيق (مفكوك التشفير ويعمل فوراً على الموبايل واللابتوب)
      if (window.APP_CONFIG) {
        if (typeof window.APP_CONFIG.getDefaultApiKey === "function") {
          var defK = window.APP_CONFIG.getDefaultApiKey();
          if (defK && defK.trim()) return defK.trim();
        } else if (window.APP_CONFIG.defaultApiKey && window.APP_CONFIG.defaultApiKey.trim()) {
          return window.APP_CONFIG.defaultApiKey.trim();
        }
      }

      // أولوية 4: فحص خدمة جيميني القديمة كاحتياط أخير
      if (window.GeminiAIService && typeof window.GeminiAIService.getApiKey === "function") {
        try {
          var key = await window.GeminiAIService.getApiKey();
          if (key && key.trim()) return key.trim();
        } catch (e) {}
      }

      return "";
    },

    // 2. محرك تنظيف وترميم JSON التلقائي (يصلح أي نصوص مقطوعة أو أقواس ناقصة تلقائياً)
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
        // محاولة استخراج كائن JSON من بين نصوص الشرح
        var firstBrace = cleaned.indexOf("{");
        var lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          var subJson = cleaned.substring(firstBrace, lastBrace + 1);
          try {
            return JSON.parse(subJson);
          } catch (e) {}
        }

        // محرك الترميم الذكي في حالة انقطاع الرد عند حد التوكنز:
        try {
          var repaired = cleaned;
          var quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
          if (quoteCount % 2 !== 0) {
            repaired += '"';
          }
          var openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
          for (var b = 0; b < openBrackets; b++) repaired += "]";
          var openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
          for (var c = 0; c < openBraces; c++) repaired += "}";

          return JSON.parse(repaired);
        } catch (repairErr) {
          console.error("JSON Repair failed:", repairErr);
        }

        throw new Error("تعذر استخراج بيانات بصيغة صالحة: " + firstErr.message);
      }
    },

    // 3. الاستدعاء المباشر للنموذج الأفضل عبر المفتاح مع دعم كامل لـ responseMimeType
    callModel: async function(prompt, systemInstruction, config) {
      var key = await window.EducationalAIService.getApiKey();
      if (!key) {
        throw new Error("يرجى إدخال مفتاح واجهة برمجة التطبيقات في صفحة الإعدادات أو التأكد من إضافته بالمنصة.");
      }

      config = config || {};
      var genConfig = {
        temperature: (typeof config.temperature === "number") ? config.temperature : 0.4,
        maxOutputTokens: config.maxOutputTokens || 8192
      };

      if (config.responseMimeType) {
        genConfig.responseMimeType = config.responseMimeType;
      }

      var defaultInstruction = "أنت مستشار وأكاديمي تعليمي متخصص في علوم المشورة المسيحية الأرثوذكسية. تصيغ المحتوى بلغة عربية فصحى نقية وأسلوب رصين شديد الدقة والعمق.";
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

      var candidateModels = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-flash-latest",
        "gemini-flash-lite-latest"
      ];

      if (window.GeminiAIService && typeof window.GeminiAIService.fetchSupportedModels === "function") {
        try {
          var discovered = await window.GeminiAIService.fetchSupportedModels(key);
          if (Array.isArray(discovered) && discovered.length > 0) {
            candidateModels = discovered;
          }
        } catch (discErr) {}
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
              throw new Error("مفتاح API غير صالح أو انتهت صلاحيته. يرجى تحديثه في صفحة الإعدادات.");
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

    // 4.1 توليد خطوة الملخص الموسع بشكل مستقل
    generateSummaryOnly: async function(lectureTitle, lectureContent, targetPages, customInstructions) {
      var pages = parseInt(targetPages, 10) || 5;
      var prompt = "المطلوب: توليد ملخص موسع وشامل وفائق العمق لمحاضرة المشورة: '" + lectureTitle + "'.\n" +
        "محتوى المحاضرة الأساسي:\n" + lectureContent + "\n\n" +
        "الشروط الأكاديمية:\n" +
        "- يجب أن يغطي الملخص ما يعادل " + pages + " صفحات دراسية كاملة بكل المحاور والأمثلة والشروحات دون اختصار مخل.\n" +
        (customInstructions ? ("- ملاحظات خاصة: " + customInstructions + "\n") : "") +
        "\nيجب الرد الحصري بهيكل JSON نقي مطابق للنموذج التالي:\n" +
        JSON.stringify({
          overview: "مقدمة تمهيدية شاملة عن سياق وأهمية المحاضرة",
          learningObjectives: ["الهدف التعليمي الأول", "الهدف التعليمي الثاني", "الهدف التعليمي الثالث"],
          sections: [
            {
              title: "عنوان المحور التفصيلي",
              content: "شرح تفصيلي موسع ومترابط يشمل كافة المفاهيم والأمثلة العملية والكتابية",
              keyPoints: ["نقطة جوهرية 1", "نقطة جوهرية 2"]
            }
          ],
          keyTakeaways: ["الخلاصة العملية الأولى", "الخلاصة العملية الثانية"],
          reflectionQuestions: ["سؤال تأملي للتطبيق العملي والنمو النفسي"]
        }, null, 2);

      var raw = await window.EducationalAIService.callModel(
        prompt,
        "أنت مصمم مناهج تعليمية ومستشار في دراسات المشورة المسيحية. قم بالرد الحصري بهيكل JSON النقي المطلوب دون أي كود إضافي.",
        { maxOutputTokens: 8192, temperature: 0.3, responseMimeType: "application/json" }
      );

      var parsed = window.EducationalAIService._cleanAndParseJson(raw);
      parsed.isPublished = false;
      parsed.targetPages = pages;
      return parsed;
    },

    // 4.2 توليد خطوة شرائح العرض التقديمي بشكل مستقل
    generateSlidesOnly: async function(lectureTitle, lectureContent, slidesCount, customInstructions) {
      var count = parseInt(slidesCount, 10) || 15;
      var prompt = "المطلوب: تصميم وتوليد بالضبط " + count + " شريحة عرض تقديمي مرقمة ومتسلسلة منطقياً لمحاضرة: '" + lectureTitle + "'.\n" +
        "محتوى المحاضرة المرجعي:\n" + lectureContent + "\n\n" +
        "الشروط:\n" +
        "- يجب توليد بالضبط " + count + " شريحة دون زيادة أو نقصان.\n" +
        "- كل شريحة تحتوي على عنوان رئيسي مكثف، و3 إلى 5 نقاط توضيحية واضحة، وأيقونة تعبيرية مناسبة، وإضاءة للمحاضر (presenterNotes).\n" +
        (customInstructions ? ("- ملاحظات إضافية: " + customInstructions + "\n") : "") +
        "\nيجب الرد الحصري بهيكل JSON نقي:\n" +
        JSON.stringify({
          items: [
            {
              slideNumber: 1,
              title: "عنوان الشريحة",
              icon: "🎯",
              bullets: ["نقطة توضيحية أولى", "نقطة توضيحية ثانية", "نقطة توضيحية ثالثة"],
              presenterNotes: "إضاءة للمحاضر عند الشرح"
            }
          ]
        }, null, 2);

      var raw = await window.EducationalAIService.callModel(
        prompt,
        "أنت خبير في إعداد وتصميم شرائح العروض التقديمية الأكاديمية. أخرج حصراً كائن JSON النقي المطلوب.",
        { maxOutputTokens: 8192, temperature: 0.3, responseMimeType: "application/json" }
      );

      var parsed = window.EducationalAIService._cleanAndParseJson(raw);
      var items = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : []);
      return { items: items, isPublished: false, targetCount: count };
    },

    // 4.3 توليد خطوة الخريطة الذهنية الشجرية بشكل مستقل
    generateMindMapOnly: async function(lectureTitle, lectureContent, customInstructions) {
      var prompt = "المطلوب: بناء خريطة ذهنية شجرية شاملة ومترابطة لمحاضرة المشورة: '" + lectureTitle + "'.\n" +
        "محتوى المحاضرة:\n" + lectureContent + "\n\n" +
        "الشروط:\n" +
        "- هيكل شجري يبدأ من عقدة مركزية (root) تتفرع إلى 4 إلى 6 محاور رئيسية، وكل محور يتفرع إلى 2 إلى 4 مفاهيم فرعية دقيقة.\n" +
        (customInstructions ? ("- ملاحظات خاصة: " + customInstructions + "\n") : "") +
        "\nيجب الرد الحصري بهيكل JSON نقي:\n" +
        JSON.stringify({
          root: {
            id: "root",
            title: "المحور الرئيسي للمحاضرة",
            icon: "🧠",
            children: [
              {
                id: "b-1",
                title: "المفهوم الأساسي الأول",
                icon: "📌",
                children: [
                  { id: "sub-1-1", title: "تفريعة فرعية تطبيقية" }
                ]
              }
            ]
          }
        }, null, 2);

      var raw = await window.EducationalAIService.callModel(
        prompt,
        "أنت مهندس خرائط ذهنية ومعمارية معلومات دراسية. أخرج حصراً كائن JSON النقي المطلوب.",
        { maxOutputTokens: 8192, temperature: 0.3, responseMimeType: "application/json" }
      );

      var parsed = window.EducationalAIService._cleanAndParseJson(raw);
      var root = parsed.root || parsed;
      return { root: root, isPublished: false };
    },

    // 4.4 توليد خطوة أسئلة الكويز التفاعلي بشكل مستقل
    generateQuizOnly: async function(lectureTitle, lectureContent, quizCount, customInstructions) {
      var count = parseInt(quizCount, 10) || 10;
      var prompt = "المطلوب: إعداد وتوليد بالضبط " + count + " سؤال كويز تفاعلي استيعابي وتطبيقي لمحاضرة المشورة: '" + lectureTitle + "'.\n" +
        "محتوى المحاضرة المرجعي:\n" + lectureContent + "\n\n" +
        "الشروط الصارمة:\n" +
        "- يجب توليد بالضبط " + count + " سؤال متعدد الخيارات دون أي نقصان.\n" +
        "- كل سؤال له 4 خيارات حصرية، ورقم الإجابة الصحيحة (0 أو 1 أو 2 أو 3)، وتفسير تعليمي رصين ومختصر في سطرين يوضح سبب صحة الإجابة.\n" +
        (customInstructions ? ("- ملاحظات خاصة: " + customInstructions + "\n") : "") +
        "\nيجب الرد الحصري بهيكل JSON نقي:\n" +
        JSON.stringify({
          questions: [
            {
              id: "q-1",
              question: "نص السؤال الدقيق؟",
              options: ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
              correctAnswerIndex: 0,
              explanation: "تفسير وشرح تعليمي مختصر يوضح سبب صحة هذا الخيار."
            }
          ]
        }, null, 2);

      var raw = await window.EducationalAIService.callModel(
        prompt,
        "أنت واضع اختبارات وأستاذ قياس وتقويم في علوم المشورة المسيحية. أخرج حصراً كائن JSON النقي المطلوب.",
        { maxOutputTokens: 8192, temperature: 0.3, responseMimeType: "application/json" }
      );

      var parsed = window.EducationalAIService._cleanAndParseJson(raw);
      var questions = Array.isArray(parsed.questions) ? parsed.questions : (Array.isArray(parsed) ? parsed : []);
      return { questions: questions, isPublished: false, targetCount: count };
    },

    // 4.5 المحرك المتسلسل الكامل (Sequential Step-by-Step Chained Generation)
    generateCompletePackage: async function(lectureTitle, lectureContent, options, onProgress) {
      options = options || {};

      var summaryPages = parseInt(options.summaryPages, 10) || 5;
      var slidesCount = parseInt(options.slidesCount, 10) || 15;
      var quizCount = parseInt(options.quizCount, 10) || 10;
      var customInstructions = (options.customInstructions || "").trim();
      var selected = options.selectedComponents || { summary: true, slides: true, mindMap: true, quiz: true };

      var output = {};

      // الخطوة 1: الملخص الموسع
      if (selected.summary !== false) {
        if (onProgress) onProgress(15, "جاري إعداد وصياغة الملخص الموسع الشامل (" + summaryPages + " صفحات)... [1/4]");
        try {
          output.summary = await window.EducationalAIService.generateSummaryOnly(
            lectureTitle,
            lectureContent,
            summaryPages,
            customInstructions
          );
        } catch (sumErr) {
          console.error("Summary step error:", sumErr);
          throw new Error("فشل إعداد الملخص: " + sumErr.message);
        }
      }

      // الخطوة 2: شرائح العرض
      if (selected.slides !== false) {
        if (onProgress) onProgress(45, "جاري تصميم وبناء شرائح العرض التقديمي (" + slidesCount + " شريحة)... [2/4]");
        try {
          output.slides = await window.EducationalAIService.generateSlidesOnly(
            lectureTitle,
            lectureContent,
            slidesCount,
            customInstructions
          );
        } catch (slideErr) {
          console.error("Slides step error:", slideErr);
          throw new Error("فشل تصميم الشرائح: " + slideErr.message);
        }
      }

      // الخطوة 3: الخريطة الذهنية
      if (selected.mindMap !== false) {
        if (onProgress) onProgress(70, "جاري بناء وتفريع الخريطة الذهنية الشجرية... [3/4]");
        try {
          output.mindMap = await window.EducationalAIService.generateMindMapOnly(
            lectureTitle,
            lectureContent,
            customInstructions
          );
        } catch (mapErr) {
          console.error("Mind map step error:", mapErr);
          throw new Error("فشل بناء الخريطة الذهنية: " + mapErr.message);
        }
      }

      // الخطوة 4: الكويز التفاعلي
      if (selected.quiz !== false) {
        if (onProgress) onProgress(90, "جاري صياغة أسئلة الكويز التفاعلي والتفسيرات (" + quizCount + " سؤال)... [4/4]");
        try {
          output.quiz = await window.EducationalAIService.generateQuizOnly(
            lectureTitle,
            lectureContent,
            quizCount,
            customInstructions
          );
        } catch (quizErr) {
          console.error("Quiz step error:", quizErr);
          throw new Error("فشل صياغة الكويز: " + quizErr.message);
        }
      }

      if (onProgress) onProgress(100, "تم استكمال الحزمة التعليمية الشاملة بنجاح 100%!");
      return output;
    },

    // 5. تعديل ركن محدد بناءً على تعليمات المستخدم المباشرة
    refineComponent: async function(componentType, currentData, lectureTitle, lectureContent, userInstruction) {
      var prompt = "المطلوب: إعادة صياغة وتعديل ركن '" + componentType + "' في محاضرة: '" + (lectureTitle || "") + "'.\n" +
        "محتوى المحاضرة المرجعي:\n" + (lectureContent || "") + "\n\n" +
        "البيانات الحالية للركن:\n" + JSON.stringify(currentData || {}, null, 2) + "\n\n" +
        "توجيهات التعديل المطلوبة من المسؤول:\n" + (userInstruction || "تحسين الصياغة وزيادة العمق والوضوح") + "\n\n" +
        "المطلوب إخراج الكائن المعدل بصيغة JSON نقي حصرياً لهذا الركن فقط، مع الحفاظ على هيكله الأصلي.";

      var raw = await window.EducationalAIService.callModel(
        prompt,
        "أنت مساعد أكاديمي لتحديث وتنقيح وتعديل المحتوى التعليمي. أخرج حصراً كائن JSON النقي المعدل.",
        { maxOutputTokens: 8192, temperature: 0.3, responseMimeType: "application/json" }
      );

      var refined = window.EducationalAIService._cleanAndParseJson(raw);
      refined.isPublished = false;
      return refined;
    }
  };
})();
