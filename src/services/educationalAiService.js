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

    // 2. محرك تنظيف وترميم JSON التلقائي فائق الصلابة والمتعدد الطبقات
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

      // المحاولة 1 الإلزامية: التحليل المباشر للنص الأصلي دون أي تعديل إطلاقاً (لحماية البيانات السليمة)
      try {
        return JSON.parse(cleaned);
      } catch (firstErr) {
        // المحاولة 2: استخراج كائن JSON من بين نصوص الشرح في حال وجود هوامش
        var firstBrace = cleaned.indexOf("{");
        var lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          var subJson = cleaned.substring(firstBrace, lastBrace + 1);
          try {
            return JSON.parse(subJson);
          } catch (eSub) {}
        }

        // المحاولة 3: مرشح تعريب علامات التنصيص الداخلية الذكي والآمن مع حماية أسماء الخصائص
        var sanitizeQuotesSafely = function(str) {
          var lines = str.split("\n");
          var kvPattern = /^(\s*"[a-zA-Z0-9_\-]+"\s*:\s*")(.*)("[,]?\s*)$/;
          var arrPattern = /^(\s*")(.*)("[,]?\s*)$/;
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var m = line.match(kvPattern);
            if (m) {
              var startPart = m[1];
              var content = m[2];
              var endPart = m[3];
              if (content.indexOf('":') === -1) {
                var fixed = "";
                var qOpen = true;
                for (var j = 0; j < content.length; j++) {
                  var ch = content[j];
                  if (ch === '"') {
                    fixed += qOpen ? "«" : "»";
                    qOpen = !qOpen;
                  } else {
                    fixed += ch;
                  }
                }
                lines[i] = startPart + fixed + endPart;
              }
            } else if (!/^\s*"[a-zA-Z0-9_\-]+"\s*:/.test(line)) {
              var mArr = line.match(arrPattern);
              if (mArr) {
                var aStart = mArr[1];
                var aContent = mArr[2];
                var aEnd = mArr[3];
                var aFixed = "";
                var aOpen = true;
                for (var k = 0; k < aContent.length; k++) {
                  var ach = aContent[k];
                  if (ach === '"') {
                    aFixed += aOpen ? "«" : "»";
                    aOpen = !aOpen;
                  } else {
                    aFixed += ach;
                  }
                }
                lines[i] = aStart + aFixed + aEnd;
              }
            }
          }
          return lines.join("\n");
        };

        var sanitized = sanitizeQuotesSafely(cleaned);
        sanitized = sanitized.replace(/,(\s*[\]}])/g, "$1");
        try {
          return JSON.parse(sanitized);
        } catch (eSanitized) {}

        // المحاولة 4: تعقيم القفزات السطرية غير المشفرة داخل قيم النصوص في JSON
        var escapeNewlinesInsideStrings = function(str) {
          var inStr = false;
          var escape = false;
          var out = "";
          for (var i = 0; i < str.length; i++) {
            var c = str[i];
            if (c === '"' && !escape) {
              inStr = !inStr;
              out += c;
            } else if (c === '\\' && !escape) {
              escape = true;
              out += c;
            } else if (c === '\n' && inStr) {
              out += '\\n';
              escape = false;
            } else if (c === '\r' && inStr) {
              escape = false;
            } else {
              escape = false;
              out += c;
            }
          }
          return out;
        };

        var safeNewlinesText = escapeNewlinesInsideStrings(sanitized);
        try {
          return JSON.parse(safeNewlinesText);
        } catch (eNewlines) {}

        // المحاولة 5: دالة إنقاذ وترميم JSON المقطوع عند حد التوكنز
        var repairTruncatedJson = function(str) {
          var lastB = str.lastIndexOf("}");
          if (lastB === -1) return null;
          var trimmed = str.substring(0, lastB + 1).trim();
          trimmed = trimmed.replace(/,\s*$/, "");
          var openBrackets = (trimmed.match(/\[/g) || []).length - (trimmed.match(/\]/g) || []).length;
          for (var b = 0; b < openBrackets; b++) trimmed += "]";
          var openBraces = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
          for (var c = 0; c < openBraces; c++) trimmed += "}";
          return trimmed;
        };

        try {
          var repaired = repairTruncatedJson(safeNewlinesText);
          if (repaired) {
            return JSON.parse(repaired);
          }
        } catch (repairErr) {}

        console.error("All JSON parsing tiers failed:", firstErr);
        throw new Error("تعذر استخراج بيانات بصيغة صالحة: " + firstErr.message);
      }
    },

    // 2.5 دالة تنقية واستبعاد أي مخططات أو بطاقات إدارية وتنظيمية (زووم، أرقام الساعات، منصة البث)
    _sanitizeDiagram: function(diagram) {
      if (!diagram || typeof diagram !== "object" || !diagram.type) return null;
      try {
        var str = JSON.stringify(diagram);
        var adminKeywords = [
          "زووم", "zoom", "ساعات التدريس", "ساعات التسجيل", "مدة اللقاء", 
          "مدة المحاضرة", "مدة الفيديو", "منصة البث", "وقت الاستراحة", 
          "المحاضرة الأولى", "المحاضرة الثانية", "المحاضرة الثالثة",
          "الجزء الأول", "الجزء الثاني", "الجزء الثالث", "الجزء الرابع",
          "مؤشرات وأرقام المحاضرة", "حقائق وأرقام المحاضرة", "ملخص زمني وتفاعلي"
        ];
        for (var i = 0; i < adminKeywords.length; i++) {
          if (str.indexOf(adminKeywords[i]) !== -1) {
            return null; // استبعاد المخطط الإداري كلياً
          }
        }

        // إذا كان نوع المخطط metric_card، التحقق الصارم من أنه معادلة مشورية وليس مجرد أرقام
        if (diagram.type === "metric_card") {
          if (!Array.isArray(diagram.metrics) || diagram.metrics.length === 0) return null;
          var hasValidCounselingMetric = diagram.metrics.some(function(m) {
            var mStr = (m.label || "") + " " + (m.note || "");
            return !mStr.includes("ساعة") && !mStr.includes("دقيقة") && !mStr.includes("محاضرة") && !mStr.includes("لقاء") && !mStr.includes("زووم");
          });
          if (!hasValidCounselingMetric) return null;
        }

        return diagram;
      } catch (e) {
        return diagram;
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
      var strictFactualRule = "\n\n⚠️ قاعدة إلزامية وشرط قطعي لا تهاون فيه (Strict Factual Grounding & Zero Hallucination):\n" +
        "- مُحرّم تماماً وممنوع منعاً باتاً تحت أي ظرف أن تتوقع، أو تخمن، أو تفترض، أو تؤلف، أو تذكر أي رأي شخصي أو معلومة أو نظرية أو استنتاج خارجي من عندك غير موجود صراحة في نص وكلام المحاضر.\n" +
        "- التزم حصرياً بنسبة 100% بما قاله المحاضر في هذا التسجيل تحديداً دون زيادة أو استطراد أو تحريف أو إقحام أي مراجع أو آراء أخرى من خارج المحاضرة.\n" +
        "- الأمانة العلمية التامة لكلام المحاضر هي المرجع الأوحد والمطلق لكافة المخرجات.";
      var instruction = (systemInstruction || defaultInstruction) + strictFactualRule;

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
      if (typeof lectureContent === "string") {
        lectureContent = lectureContent
          .replace(/محاضرة\s+أونلاين\s+عبر\s+زووم\s*\([^)]*\)\s*[-–—]?/gi, "")
          .replace(/عبر\s+زووم/gi, "")
          .replace(/\(من\s+\d+\s+إلى\s+\d+\s+(مساءً|صباحاً|ظهراً)\)/gi, "");
      }
      var prompt = "أنت كبير معماريي ومصممي المعرفة الأكاديمية والبصرية (Chief Educational & Visual Architect) في معهد المشورة المسيحية الأرثوذكسية.\n" +
        "المطلوب: صياغة دليل دراسي مصور فائق الجودة والعمق بأسلوب Google NotebookLM المعمق لمحاضرة: '" + lectureTitle + "'.\n\n" +
        "المحتوى المرجعي الكامل للمحاضرة:\n" + lectureContent + "\n\n" +
        "الشروط الأكاديمية الصارمة (قواعد قطعية لا تهاون فيها):\n" +
        "1. قاعدة الأمانة العلمية الإلزامية (مُحرّم التوقع أو التأليف نهائياً): يُمنع منعاً باتاً ذكر أي رأي شخصي أو معلومة أو نظرية غير واردة صراحة في كلام المحاضر في هذا التسجيل.\n" +
        "2. حظر قطعي مطلق للبيانات الإدارية والتنظيمية: يُمنع منعاً باتاً ذكر أو تلخيص أو تحويل أي بيانات شكلية أو إدارية إلى نقاط أو بطاقات (مثل: تطبيق زووم، مدة الفيديو، عدد ساعات التسجيل والتدريس، رقم المحاضرة، الجزء الأول أو الثاني، تاريخ اللقاء، منصة البث، وقت الاستراحة، الحضور والغياب). التلخيص والمخططات مخصصة حصراً بنسبة 100% للمحتوى اللاهوتي والنفسي والمشوري الصافي.\n" +
        "3. دمج المخططات البصرية سياقياً بذكاء وعمق: لكل محور تفصيلي في 'sections'، فكّر كمصمم تعليمي ومستشار نفسي خبير؛ إذا كان المحور نظرياً بحتاً لا يحتاج رسماً ضع visualDiagram: null دون أي افتعال، أما إذا كان المحور يحتوي على مفاهيم مشورية أو نفسية أو تشريحية غنية، قم بتصميم مخطط نوعي تفاعلي يخدم الفكرة بأعلى بلاغة في حقل 'visualDiagram'.\n" +
        "   - أنواع المخططات المتاحة لحقل visualDiagram:\n" +
        "     • dual_system: نظام ثنائي متقابل ومتكامل (تشريح نصفي المخ، الفص الأيمن مقابل الأيسر، الجهاز السمبثاوي والباراسمبثاوي، العقل العاطفي مقابل المنطقي) { id, type='dual_system', title, subtitle, badge, leftWing: { title, icon, color, traits: ['نقطة 1', 'نقطة 2'], counselingRole }, rightWing: { title, icon, color, traits: ['نقطة 1', 'نقطة 2'], counselingRole }, integration }\n" +
        "     • cycle: حلقة أو دورة مغلقة أو مثلث علاقات ديناميكي (دورة الصدمة، حلقة الإدمان، مثلث كاربمان: الضحية والجلاد والمنقذ) { id, type='cycle', title, subtitle, badge, stages: [{ step: 1, title, desc, icon }], breakthrough }\n" +
        "     • comparison: مصفوفة مقارنة بصرية عميقة { id, type='comparison', title, subtitle, badge, left: { title, icon, items: [{ aspect, value }] }, right: { title, icon, items: [{ aspect, value }] } }\n" +
        "     • process: مسار تسلسلي ومراحل ديناميكية { id, type='process', title, subtitle, badge, steps: [{ step: 1, title, desc, icon, outcome }] }\n" +
        "     • pillars: أركان وأبعاد تشريحية { id, type='pillars', title, subtitle, badge, pillars: [{ title, icon, desc, keyInsights: ['نقطة 1', 'نقطة 2'] }] }\n" +
        "     • pyramid: هرم متدرج هندسياً [قاعدة إلزامية: المستوى 1 دائماً يمثل القاعدة العريضة التأسيسية في الأسفل كالاحتياجات الفسيولوجية، والمستوى الأخير يمثل قمة الهرم الضيقة في الأعلى كالاتصال بالله أو النضج مع وسم isPeak: true حصراً على القمة. شرط التناسق البصري: عنوان كل مستوى 'title' يجب أن يكون عبارة عربية نقية وموجزة جداً من كلمتين إلى 4 كلمات كحد أقصى دون أي أقواس أو ترجمات إنجليزية، وتوضع الشروحات والمصطلحات الإنجليزية بالكامل داخل حقل الوصف 'desc'] { id, type='pyramid', title, subtitle, badge, levels: [{ level: 1, title, color, desc, isPeak: true/false }] }\n" +
        "     • metric_card: [تحذير صارم وحظر قطعي: يُمنع نهائياً وباتاً استخدام هذا النمط لأي أرقام إدارية أو تنظيمية مثل عدد ساعات المحاضرة، مدة اللقاء، منصة زووم، رقم المحاضرة، أو ترتيب الأجزاء]. هذا النمط مخصص حصراً وفقط إذا ذكر المحاضر في شرحه العلمي معادلة مشورية أو نفسية أو تربوية حقيقية (مثل قاعدة 1 إلى 9 في التشجيع لمحو أثر النقد، أو نسب الحضور المشوري 70-20-10). إذا لم تكن هناك معادلة مشورية رقمية صريحة في المحاضرة، يُحظر تماماً توليد metric_card ويُستبدل بمخطط آخر (مثل pillars أو comparison أو process) أو يُترك visualDiagram: null.\n" +
        "4. المرجعية الأكاديمية الشاملة ومعيار صفر فقدان للمعلومات الجوهرية (Comprehensive Textbook Standard):\n" +
        "   - الهدف الأساسي ليس التلخيص السطحي أو الاختزال المخل، بل إعادة صياغة المحاضرة كـ 'مرجع دراسي وفصل كتاب أكاديمي وافٍ' يغطي 100% من الأفكار والشروحات والنظريات والأمثلة والشواهد التي طرحها المحاضر.\n" +
        "   - قارئ الدليل يجب أن يشعر بأنه قرأ المحاضرة بالكامل؛ حيث يُحذف فقط الحشو اللفظي العابر والتكرار الشفهي والوقفات، مع الإبقاء على كل تفصيلة علمية، ولغوية، وكتابية، وإرشادية.\n" +
        "   - قسّم المحاضرة إلى محاور متسلسلة وافية (من 8 إلى 12 محوراً تفصيلياً) تغطي خط سير المحاضرة من بدايتها وحتى ختامها دون القفز فوق أي فكرة.\n" +
        "   - في كل محور في 'sections'، يجب أن يكون الشرح في 'content' وافياً وغنياً ودسماً يسرد الفكرة وأبعادها النفسية والشاهد الكتابي والمثال الإرشادي والتحليل الإكلينيكي دون استعجال.\n" +
        "   - الرصد الإلزامي للكنوز والأدوات الإرشادية: احرص على تفصيل النظريات بأسماء واضعيها ونقدها (مثل فرويد واعترافه الصادم حول مدة السبع سنوات، ونظرية جبل الثلج وتشريح الأثمان السبعة الغاطسة ودور المشير فيها، وهرم ماسلو وتعديله الأرثوذكسي بالاحتياج السادس لله، وهرمون الأوكسيتوسين وبناء الأمان، والتأصيل اللغوي للفظ هابتو في لمس الأبرص، ومقارنة أبيجايل وميكال، وقاعدة 1 إلى 9 في التشجيع التربوي ومحو النقد).\n" +
        (customInstructions ? ("5. توجيهات إضافية خاصة: " + customInstructions + "\n") : "") +
        "\nيجب الرد الحصري بهيكل JSON نقي مطابق تماماً للنموذج التالي:\n" +
        JSON.stringify({
          overview: "ملخص تنفيذي وسياق عام للمحاضرة يوضح الإطار العام والهدف من اللقاء وأهميته للدارس والمشير",
          learningObjectives: ["هدف تعليمي أساسي 1", "هدف تعليمي أساسي 2", "هدف تعليمي أساسي 3", "هدف تعليمي أساسي 4"],
          sections: [
            {
              title: "عنوان المحور التفصيلي",
              content: "شرح تفصيلي موسع ومترابط يغطي كافة النقاط والأمثلة والشروحات التي ذكرها المحاضر في هذا الجزء من التسجيل",
              keyPoints: ["نقطة جوهرية 1", "نقطة جوهرية 2", "نقطة جوهرية 3"],
              visualDiagram: {
                id: "sec_visual_1",
                type: "comparison",
                title: "عنوان المخطط البصري المركز الخاص بهذا المحور",
                subtitle: "شرح موجز للهدف من المخطط",
                badge: "المحور الأكاديمي",
                left: { title: "المسار الأول", icon: "✝️", items: [{ aspect: "المنظور", value: "القيمة" }] },
                right: { title: "المسار الثاني", icon: "🧠", items: [{ aspect: "المنظور", value: "القيمة" }] }
              }
            }
          ],
          keyTakeaways: ["خلاصة عملية وتطبيقية للمشير في الخدمة والحياة 1", "خلاصة عملية وتطبيقية للمشير في الخدمة والحياة 2"],
          glossary: [
            {
              term: "المصطلح أو المفهوم المشوري",
              definition: "تعريفه وشرحه كما ورد في سياق المحاضرة"
            }
          ],
          reflectionQuestions: ["سؤال تأملي عميق للتقييم الذاتي والنمو الشخصي للمشير", "سؤال نقاشي لدراسة الحالات والتطبيق العملي"]
        }, null, 2);

      var raw = await window.EducationalAIService.callModel(
        prompt,
        "أنت مصمم مناهج تعليمية ومستشار في دراسات المشورة المسيحية. قم بالرد الحصري بهيكل JSON النقي المطلوب دون أي كود إضافي.",
        { maxOutputTokens: 8192, temperature: 0.3, responseMimeType: "application/json" }
      );

      var parsed = window.EducationalAIService._cleanAndParseJson(raw);
      if (parsed && Array.isArray(parsed.sections)) {
        parsed.sections.forEach(function(sec) {
          if (sec.visualDiagram) {
            sec.visualDiagram = window.EducationalAIService._sanitizeDiagram(sec.visualDiagram);
          }
        });
      }
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

    // 4.4 توليد خطوة أسئلة الكويز التفاعلي بشكل مستقل مع القطعة المرجعية وزر المساعدة
    generateQuizOnly: async function(lectureTitle, lectureContent, quizCount, customInstructions) {
      var count = parseInt(quizCount, 10) || 10;
      var prompt = "المطلوب: إعداد وتوليد بالضبط " + count + " سؤال كويز تفاعلي استيعابي وتطبيقي لمحاضرة المشورة: '" + lectureTitle + "'.\n" +
        "محتوى المحاضرة المرجعي الكامل:\n" + lectureContent + "\n\n" +
        "الشروط والمعايير الأكاديمية الصارمة:\n" +
        "1. شرط الاقتباس المرجعي الدقيق والموجز (sourceQuote & timestamp): لكل سؤال يُصاغ، استخرج واقتبس العبارة أو الجملة الجوهرية الصريحة من كلام المحاضر في سطر واحد مركز ومختصر (جملة واحدة فقط دون أي فواصل أسطر Enter حقيقية) في حقل 'sourceQuote'، مع تحديد التوقيت الزمني الدقيق بالدقيقة والثانية من الفيديو (مثل: '14:25' أو '01:05:30') في حقل 'timestamp'. إذا كانت الفكرة غير مشروحة بنص وتوقيت صريح، يُحظر صياغة سؤال عنها نهائياً.\n" +
        "2. حظر أسئلة المجاملات والشكليات البحتة: يُمنع منعاً باتاً صياغة أي سؤال عن التحيات الشكلية، الترحيب الودي العابر، الواجبات، أو الترتيبات التنظيمية. يجب أن يختبر كل سؤال فكرة أو مفهوماً أو تمييزاً أو مهارة مشورية حقيقية شرحها المحاضر.\n" +
        "3. التغطية الشاملة والمتوازنة: وزع الأسئلة بتسلسل طبيعي يغطي كافة محاور ومفاصل المحاضرة من بدايتها وحتى ختامها دون تكدسها في أول ربع ساعة فقط.\n" +
        "4. جودة الخيارات والتفسير: 4 خيارات حصرية وذكية، ورقم الإجابة الصحيحة (0 أو 1 أو 2 أو 3)، مع تلميح توجيهي (hint) يوجه ذهن الدارس، وتفسير تعليمي رصين (explanation).\n" +
        "5. إكمال العدد المطلوب بدقة (" + count + " سؤال): صغ بالضبط " + count + " سؤالاً دون أي نقصان، مع الحفاظ على إيجاز بليغ ومحكم ومركز في نصوص التلميح والتفسير (جملة أو جملتان مفيدتان لكل حقل) لضمان اكتمال كافة الأسئلة الـ " + count + " بالكامل وتجنب انقطاع النص عند سقف الإخراج.\n" +
        "6. شرط قطعي لسلامة صيغة JSON: يُحظر استخدام علامات التنصيص المزدوجة (\") نهائياً داخل نصوص الاقتباسات أو الشرح لتجنب تلف بنية البيانات، واستبدلها دائماً بالأقواس العربية « » عند الاقتباس الداخلي.\n" +
        (customInstructions ? ("7. ملاحظات خاصة: " + customInstructions + "\n") : "") +
        "\nيجب الرد الحصري بهيكل JSON نقي مطابق للنموذج التالي:\n" +
        JSON.stringify({
          questions: [
            {
              id: "q-1",
              question: "نص السؤال الدقيق المركز على صلب فكرة المحاضر؟",
              options: ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
              correctAnswerIndex: 0,
              sourceQuote: "الفقرة النصية المقتبسة نصاً من كلام المحاضر التي تشرح وتثبت صحة هذه الإجابة وموضعها",
              timestamp: "14:25",
              hint: "تلميح توجيهي مشوري يساعد الدارس في توجيه تفكيره للسياق المطلوب دون كشف الإجابة مباشرة",
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

    // 4.4 توليد المخططات والرسوم البيانية البصرية التفاعلية بأسلوب NotebookLM المعمق
    generateVisualsOnly: async function(lectureTitle, lectureContent, customInstructions) {
      if (typeof lectureContent === "string") {
        lectureContent = lectureContent
          .replace(/محاضرة\s+أونلاين\s+عبر\s+زووم\s*\([^)]*\)\s*[-–—]?/gi, "")
          .replace(/عبر\s+زووم/gi, "")
          .replace(/\(من\s+\d+\s+إلى\s+\d+\s+(مساءً|صباحاً|ظهراً)\)/gi, "");
      }
      var prompt = "أنت كبير معماريي ومصممي المعرفة البصرية (Chief Visual Knowledge Architect) في معهد المشورة المسيحية الأرثوذكسية.\n" +
        "المهمة: تحليل النص المرجعي للمحاضرة بدقة متناهية وبناء منظومة بصرية تعليمية شاملة ومترابطة تحاكي أعلى معايير Google NotebookLM لتغطية كافة أبعاد المحاضرة بصرياً ومفاهيمياً.\n\n" +
        "عنوان المحاضرة: " + (lectureTitle || "") + "\n\n" +
        "المحتوى المرجعي الكامل للمحاضرة:\n" + (lectureContent || "") + "\n\n" +
        (customInstructions ? ("توجيهات إضافية خاصة: " + customInstructions + "\n\n") : "") +
        "═══════════════════════════════════════════════════════════\n" +
        "الشروط والمعايير الأكاديمية الصارمة (قواعد حاسمة):\n" +
        "1. التوليد البصري الذكي المتناسب مع المحتوى: فكّر كمعماري معرفة مشورية خبير؛ نوع وكثف المخططات (من 3 إلى 6 مخططات) متى كانت المحاضرة غنية بالمفاهيم النفسية والديناميكيات السلوكية، ولا تفتعل رسومات شكلية إذا كانت المحاضرة مجرد سرد نظري.\n" +
        "2. حظر قطعي مطلق للبيانات الإدارية أو الشكلية: يُمنع منعاً باتاً ذكر أو رسم أي بيانات شكلية (مثل تطبيق زووم، مدة الفيديو، عدد ساعات التسجيل والتدريس، رقم المحاضرة، تاريخ اللقاء، وقت الاستراحة، منصة البث، جودة الصوت، أرقام الأجزاء). كل المخططات والبطاقات يجب أن تتمحور 100% حول صلب المادة العلمية التخصصية.\n" +
        "3. قاعدة الأمانة العلمية الإلزامية (مُحرّم التوقع أو إبداء أي رأي خاص نهائياً): يُمنع منعاً باتاً وحاسماً أن تتوقع أو تخمن أو تؤلف أي فكرة أو تذكر أي رأي خاص غير موجود صراحة بنص المحاضرة. كل رسم ومقارنة ومرحلة يجب أن تكون مستخرجة حصرياً وأميناً بنسبة 100% من كلام المحاضر في هذا التسجيل فقط.\n" +
        "4. التركيز الحصري على المعرفة المشورية التخصصية: كل عنصر أو مقارنة أو خطوة يجب أن تكون فكرة نفسية أو لاهوتية أو مهارة مشورية حقيقية وردت في كلام المحاضر.\n" +
        "5. منع الأرقام والنسب الوهمية: لا تضع أي نسب مئوية أو أرقام إلا إذا كانت قاعدة علمية أو مشورية حقيقية ذكرها المحاضر في سياق الشرح.\n\n" +
        "الأنماط البصرية المتاحة التي يمكنك التوليد منها وتكييفها بمرونة:\n" +
        "• dual_system: نظام ثنائي متقابل ومتكامل (مثل: تشريح نصفي المخ، الفص الأيمن مقابل الأيسر، الجهاز السمبثاوي مقابل الباراسمبثاوي، العقل العاطفي مقابل المنطقي، الجسد مقابل الروح).\n" +
        "  الحقول: id, type='dual_system', title, subtitle, badge, leftWing: { title, icon, color, traits: ['خاصية 1', 'خاصية 2'], counselingRole }, rightWing: { title, icon, color, traits: ['خاصية 1', 'خاصية 2'], counselingRole }, integration\n\n" +
        "• cycle: حلقة أو دورة مغلقة أو مثلث علاقات ديناميكي متكرر (مثل: دورة الصدمة النفسية، حلقة الإدمان، مثلث العلاقات المشوري: الضحية والجلاد والمنقذ، دائرة التغيير والتعافي).\n" +
        "  الحقول: id, type='cycle', title, subtitle, badge, stages: [{ step: 1, title, desc, icon }], breakthrough\n\n" +
        "• comparison: مصفوفة مقارنة بصرية عميقة بين مفهومين أو مسارين متقابلين (مثل: الرؤية الكتابية للجسد مقابل النظرة العالمية، أو المشورة مقابل الاعتراف، أو النضج مقابل التصلب).\n" +
        "  الحقول: id, type='comparison', title, subtitle, badge, left: { title, icon, items: [{ aspect, value }] }, right: { title, icon, items: [{ aspect, value }] }\n\n" +
        "• process: مسار تسلسلي أو مراحل تدفق منطقي لديناميكية نفسية أو خطوات جلسة أو رحلة علاجية.\n" +
        "  الحقول: id, type='process', title, subtitle, badge, steps: [{ step: 1, title, desc, icon, outcome }]\n\n" +
        "• pillars: شبكة بطاقات الأركان والأبعاد التشريحية للموضوع (تفكيك المفهوم إلى 3 أو 4 أبعاد رئيسية ومحاور مفصلة).\n" +
        "  الحقول: id, type='pillars', title, subtitle, badge, pillars: [{ title, icon, desc, keyInsights: ['نقطة 1', 'نقطة 2'] }]\n\n" +
        "• pyramid: هرم مفاهيمي متدرج هندسياً [قاعدة إلزامية: المستوى 1 دائماً يمثل القاعدة العريضة التأسيسية في الأسفل كالاحتياجات الفسيولوجية، والمستوى الأخير يمثل قمة الهرم الضيقة في الأعلى كالاتصال بالله أو النضج مع وضع isPeak: true حصراً على القمة. شرط التناسق البصري: عنوان كل مستوى 'title' يجب أن يكون عبارة عربية نقية وموجزة جداً من كلمتين إلى 4 كلمات كحد أقصى دون أي أقواس أو ترجمات إنجليزية، وتوضع الشروحات والمصطلحات بالكامل داخل حقل 'desc'].\n" +
        "  الحقول: id, type='pyramid', title, subtitle, badge, levels: [{ level: 1, title, color, desc, isPeak: true/false }]\n\n" +
        "• metric_card: بطاقة معادلة أو قاعدة مشورية عددية [تحذير قطعي: يُمنع منعاً باتاً استخدامها لأي بيانات إدارية كعدد ساعات المحاضرة أو مدة زووم أو ترتيب الأجزاء. تُستخدم حصراً وفقط إذا ذكر المحاضر قاعدة عددية أو نسبة سريرية واضحة كقاعدة 1 إلى 9. إذا لم توجد قاعدة مشورية رقمية صريحة، لا تولد هذا النمط إطلاقاً].\n" +
        "  الحقول: id, type='metric_card', title, subtitle, badge, metrics: [{ num, label, note, color }], takeaway\n\n" +
        "• pie: مخطط دائري لنسب وتوزيعات حقيقية صريحة وردت في المحاضرة.\n" +
        "  الحقول: id, type='pie', title, subtitle, badge, slices: [{ label, percentage, color, desc }]\n\n" +
        "المطلوب إخراج كائن JSON نقي 100% يحتوي على مصفوفة 'charts' تضم المخططات المستخرجة بجودة أكاديمية تليق بـ NotebookLM.";

      var raw = await window.EducationalAIService.callModel(
        prompt,
        "أنت مصمم معماريات معرفية وبصرية تعليمية بأسلوب Google NotebookLM. أخرج كائن JSON النقي فقط بدون أي نصوص خارجية.",
        { maxOutputTokens: 8192, temperature: 0.25, responseMimeType: "application/json" }
      );
      var parsed = window.EducationalAIService._cleanAndParseJson(raw);
      if (parsed && Array.isArray(parsed.charts)) {
        parsed.charts = parsed.charts.map(function(c) {
          return window.EducationalAIService._sanitizeDiagram(c);
        }).filter(Boolean);
      }
      return parsed;
    },

    // 4.5 المحرك المتسلسل الكامل (Sequential Step-by-Step Chained Generation)
    generateCompletePackage: async function(lectureTitle, lectureContent, options, onProgress) {
      options = options || {};

      var summaryPages = parseInt(options.summaryPages, 10) || 5;
      var quizCount = parseInt(options.quizCount, 10) || 10;
      var customInstructions = (options.customInstructions || "").trim();
      var selected = options.selectedComponents || { summary: true, visuals: true, quiz: true };

      var output = {};

      // الخطوة 1: الدليل الدراسي المصور (الملخص الموسع مع المخططات البصرية المدمجة سياقياً)
      if (selected.summary !== false) {
        if (onProgress) onProgress(35, "جاري صياغة الدليل الدراسي المصور وبناء المخططات البصرية في مواضعها (" + summaryPages + " صفحات)... [1/2]");
        try {
          output.summary = await window.EducationalAIService.generateSummaryOnly(
            lectureTitle,
            lectureContent,
            summaryPages,
            customInstructions
          );
          // استخراج مصفوفة المخططات المدمجة لضمان التوافق مع أي عوارض سابقة
          if (output.summary && Array.isArray(output.summary.sections)) {
            var extractedCharts = [];
            output.summary.sections.forEach(function(sec) {
              if (sec.visualDiagram && sec.visualDiagram.type) {
                extractedCharts.push(sec.visualDiagram);
              }
            });
            if (extractedCharts.length > 0) {
              output.visuals = { charts: extractedCharts };
            }
          }

          // حفظ فوري للركن الأول بمجرد اكتماله لضمان عدم ضياع المجهود
          if (typeof options.onStepSuccess === "function") {
            try {
              await options.onStepSuccess("summary", {
                summary: output.summary,
                visuals: output.visuals
              });
            } catch (stepSaveErr) {
              console.warn("Auto-save for summary step encountered warning:", stepSaveErr);
            }
          }
        } catch (sumErr) {
          console.error("Summary step error:", sumErr);
          throw new Error("فشل إعداد الدليل الدراسي: " + sumErr.message);
        }
      }

      // الخطوة 2: الكويز التفاعلي مع عزل الأخطاء لضمان بقاء الأركان السابقة
      if (selected.quiz !== false) {
        if (onProgress) onProgress(80, "جاري صياغة أسئلة الكويز التفاعلي والتفسيرات (" + quizCount + " سؤال)... [2/2]");
        try {
          output.quiz = await window.EducationalAIService.generateQuizOnly(
            lectureTitle,
            lectureContent,
            quizCount,
            customInstructions
          );

          if (typeof options.onStepSuccess === "function") {
            try {
              await options.onStepSuccess("quiz", { quiz: output.quiz });
            } catch (stepQuizSaveErr) {
              console.warn("Auto-save for quiz step encountered warning:", stepQuizSaveErr);
            }
          }
        } catch (quizErr) {
          console.error("Quiz step error:", quizErr);
          // عزل الخطأ وتسجيله دون إيقاف الحزمة حتى تظل الأركان السابقة محفوظة بنجاح
          output.quizError = quizErr.message;
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
