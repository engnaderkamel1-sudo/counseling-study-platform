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

      // المحاولة 1: إزالة وسوم markdown البرمجية إذا كانت موجودة
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

      // المحاولة 2: التحليل المباشر للنص الأصلي دون أي تعديل إطلاقاً (لحماية البيانات السليمة)
      try {
        return JSON.parse(cleaned);
      } catch (firstErr) {
        // المحاولة 3: استخراج كائن JSON من بين نصوص الشرح في حال وجود هوامش خارجية
        var firstBrace = cleaned.indexOf("{");
        var lastBrace = cleaned.lastIndexOf("}");
        var subJson = (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace)
          ? cleaned.substring(firstBrace, lastBrace + 1)
          : cleaned;

        try {
          return JSON.parse(subJson);
        } catch (eSub) {}

        // المحاولة 4: الماسح الشامل الذكي لمعالجة قفزات الأسطر وعلامات التنصيص الداخلية
        try {
          var s = subJson;
          var out = [];
          var inStrVal = false;
          var inKey = false;
          var isEsc = false;
          var quoteCount = 0;
          var n = s.length;

          for (var i = 0; i < n; i++) {
            var ch = s.charAt(i);

            if (isEsc) {
              out.push(ch);
              isEsc = false;
              continue;
            }

            if (ch === '\\') {
              isEsc = true;
              out.push(ch);
              continue;
            }

            if (inKey) {
              if (ch === '"') {
                var restKey = s.substring(i + 1, i + 50);
                if (/^\s*:/.test(restKey)) {
                  inKey = false;
                  out.push('"');
                } else {
                  out.push('\\"');
                }
              } else {
                out.push(ch);
              }
              continue;
            }

            if (inStrVal) {
              if (ch === '"') {
                var restVal = s.substring(i + 1, i + 50);
                if (/^\s*(?:,|\}|\]|$)/.test(restVal)) {
                  inStrVal = false;
                  out.push('"');
                } else {
                  quoteCount++;
                  out.push(quoteCount % 2 === 1 ? "«" : "»");
                }
              } else if (ch === '\n') {
                out.push('\\n');
              } else if (ch === '\r') {
                // تجاهل قفزة سطر ويندوز داخل النص
              } else if (ch === '\t') {
                out.push('\\t');
              } else {
                out.push(ch);
              }
              continue;
            }

            // خارج النصوص
            if (ch === '"') {
              var prevStr = out.join("").trim();
              var lastNonWs = prevStr.length > 0 ? prevStr.charAt(prevStr.length - 1) : "";
              if (lastNonWs === ':') {
                inStrVal = true;
                quoteCount = 0;
                out.push('"');
              } else if (lastNonWs === '[' || lastNonWs === ',') {
                var restArr = s.substring(i + 1, i + 100);
                if (/^[^"]*"\s*:/.test(restArr)) {
                  inKey = true;
                } else {
                  inStrVal = true;
                  quoteCount = 0;
                }
                out.push('"');
              } else {
                inKey = true;
                out.push('"');
              }
              continue;
            }

            out.push(ch);
          }

          var fixed = out.join("");

          // محاولة سريعة بالنص المعالج من الماسح
          try {
            return JSON.parse(fixed.replace(/,\s*([\}\]])/g, "$1"));
          } catch (ePre) {}

          // المحاولة 5: معالجة الفواصل الإنجليزية المفقودة بين الخصائص وعناصر المصفوفات (Missing Commas Repair)
          var repairCommas = function(str) {
            var r = str;
            // 1. فاصلة مفقودة بعد قيمة نصية يتبعها سطر بمفتاح جديد أو عنصر جديد
            r = r.replace(/("[^"\\]*(?:\\.[^"\\]*)*")\s*\n\s*(")/g, "$1,\n$2");
            // 2. فاصلة مفقودة بعد إغلاق كائن أو مصفوفة يتبعها كائن أو مفتاح جديد
            r = r.replace(/(\}|\])\s*\n\s*(\{|\[|")/g, "$1,\n$2");
            // 3. فاصلة مفقودة بعد القيم الرقمية والمنطقية
            r = r.replace(/(\btrue\b|\bfalse\b|\bnull\b|\b\d+(?:\.\d+)?)\s*\n\s*(")/g, "$1,\n$2");
            // 4. إزالة أي فواصل زائدة قبل إغلاق الأقواس
            r = r.replace(/,\s*([\}\]])/g, "$1");
            return r;
          };

          var candidate = repairCommas(fixed);
          try {
            return JSON.parse(candidate);
          } catch (eWithCommas) {
            // المحاولة 6: إنقاذ النص عند الانقطاع اللحظي بسقف الإخراج أو الفواصل الصعبة
            var lastObjEnd = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
            if (lastObjEnd !== -1) {
              var trimmed = candidate.substring(0, lastObjEnd + 1).replace(/,\s*$/, "");
              var openBrackets = (trimmed.match(/\[/g) || []).length - (trimmed.match(/\]/g) || []).length;
              for (var b = 0; b < Math.max(0, openBrackets); b++) trimmed += "]";
              var openBraces = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
              for (var c = 0; c < Math.max(0, openBraces); c++) trimmed += "}";
              trimmed = trimmed.replace(/,\s*([\}\]])/g, "$1");
              try {
                return JSON.parse(trimmed);
              } catch (eTrim) {}
            }
          }
        } catch (scannerErr) {}

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

      // تحديد نموذجين حصريين فقط من واقع النماذج النشطة في حساب المستخدم لمنع أي دوران:
      // النموذج الأول: نموذج الفلاش فائق السرعة
      // النموذج الثاني: نموذج الإنتاج الرسمي الدائم المعتمد
      var candidateModels = [
        "gemini-3.8-flash",
        "gemini-3.5-flash"
      ];

      if (window.GeminiAIService && typeof window.GeminiAIService.fetchSupportedModels === "function") {
        try {
          var discovered = await window.GeminiAIService.fetchSupportedModels(key);
          if (Array.isArray(discovered) && discovered.length > 0) {
            var activeFlashes = discovered.filter(function(m) {
              return m.includes("flash") &&
                     !m.includes("2.5") && !m.includes("1.5") && !m.includes("tts") &&
                     !m.includes("image") &&
                     !m.includes("embedding") &&
                     !m.includes("vision");
            });
            var primary = activeFlashes.find(function(m) { return m === "gemini-3.8-flash" || m.includes("3.8-flash"); }) || activeFlashes[0] || "gemini-3.8-flash";
            var backup = activeFlashes.find(function(m) { return m === "gemini-3.5-flash" || m.includes("3.5-flash"); }) || activeFlashes[1] || "gemini-3.5-flash";
            candidateModels = [primary, backup];
          }
        } catch (discErr) {}
      }

      var lastError = "";

      for (var i = 0; i < candidateModels.length; i++) {
        var modelName = candidateModels[i];
        var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + key;

        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 150000);

        try {
          var response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key
            },
            body: JSON.stringify(body),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

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

            // إذا كان سبب الخطأ ذروة ضغط مؤقتة (503 / 429)، ننتظر ثانيتين فقط قبل تجربة النموذج المستقر الأخير
            var isBusy = response.status === 503 || response.status === 429 || errMsg.includes("high demand") || errMsg.includes("quota");
            if (isBusy && i < candidateModels.length - 1) {
              await new Promise(function(resolve) { setTimeout(resolve, 2000); });
            }
          }
        } catch (netErr) {
          clearTimeout(timeoutId);
          if (netErr.name === "AbortError") {
            lastError = "استغرق النموذج وقتاً أطول من المتوقع (تجاوز 150 ثانية): " + modelName;
          } else {
            if (netErr.message && netErr.message.includes("مفتاح API")) throw netErr;
            lastError = netErr.message;
          }
        }
      }

      // إذا فشل النموذجان كلاهما، يتوقف النظام فوراً ويُظهر رسالة واضحة دون أي دوران
      throw new Error("خوادم الذكاء الاصطناعي تشهد حالياً ذروة ضغط استثنائية لدى جوجل. يرجى الانتظار دقيقة واحدة ثم المحاولة مجدداً: " + lastError);
    },

    // 4.1 توليد خطوة الملخص الموسع بشكل مستقل
    generateSummaryOnly: async function(lectureTitle, lectureContent, targetPages, customInstructions) {
      var pages = parseInt(targetPages, 10) || 5;
      if (typeof lectureContent === "string") {
        lectureContent = lectureContent
          .replace(/محاضرة\s+أونلاين\s+عبر\s+زووم\s*\([^)]*\)\s*[-–—]?/gi, "")
          .replace(/عبر\s+زووم/gi, "")
          .replace(/\(من\s+\d+\s+إلى\s+\d+\s+(مساءً|صباحاً|ظهراً)\)/gi, "")
          .trim();
      }
      if (!lectureContent || lectureContent.length < 100) {
        throw new Error("لا يمكن توليد الدليل الدراسي: محتوى تفريغ المحاضرة غير متوفر أو غير كافٍ لضمان الأمانة العلمية.");
      }
      var prompt = "أنت كبير معماريي ومصممي المعرفة الأكاديمية والبصرية (Chief Educational & Visual Architect) في معهد المشورة المسيحية الأرثوذكسية.\n" +
        "المطلوب: صياغة دليل دراسي مصور فائق الجودة والعمق بأسلوب Google NotebookLM المعمق لمحاضرة: '" + lectureTitle + "'.\n\n" +
        "المحتوى المرجعي الكامل للمحاضرة:\n" + lectureContent + "\n\n" +
        "الشروط الأكاديمية الصارمة (قواعد قطعية لا تهاون فيها):\n" +
        "1. قاعدة الأمانة العلمية الإلزامية (مُحرّم التوقع أو التأليف نهائياً): يُمنع منعاً باتاً ذكر أي رأي شخصي أو معلومة أو نظرية غير واردة صراحة في كلام المحاضر في هذا التسجيل.\n" +
        "2. حظر قطعي مطلق للبيانات الإدارية والتنظيمية: يُمنع منعاً باتاً ذكر أو تلخيص أو تحويل أي بيانات شكلية أو إدارية إلى نقاط أو بطاقات (مثل: تطبيق زووم، مدة الفيديو، عدد ساعات التسجيل والتدريس، رقم المحاضرة، الجزء الأول أو الثاني، تاريخ اللقاء، منصة البث، وقت الاستراحة، الحضور والغياب). التلخيص والمخططات مخصصة حصراً بنسبة 100% للمحتوى اللاهوتي والنفسي والمشوري الصافي.\n" +
        "3. الدمج البصري الإلزامي المنضبط والمقيد بالمحتوى الحقيقي (Mandatory Grounded Visual Diagrams):\n" +
        "   - لكل محور تفصيلي في 'sections'، يجب تصميم مخطط بصري وتطبيقي متكامل في حقل 'visualDiagram' من واقع كلام المحاضر نصاً دون أي اختراع أو هلاوس.\n" +
        "   - يُمنع منعاً باتاً ترك visualDiagram فارغاً أو null؛ فكل محور يجب أن يحمل بطاقة بصرية وفقاً لأحد الأنماط العلمية المنضبطة التالية حصراً:\n" +
        "     • النمط comparison (مصفوفة مقارنة بصرية عميقة): يُستخدم عند وجود مفهومين أو مصطلحين متقابلين في كلام المحاضر (مثل سوما وساركس، أو العقل والوجدان، أو المشورة والصداقة، أو التقبل مقابل الموافقة).\n" +
        "     • النمط process (مسار تسلسلي ومراحل ديناميكية): يُستخدم عند ذكر خطوات أو مراحل متتالية لعملية إرشادية أو علاجية أو نمو شخصي.\n" +
        "     • النمط dual_system (نظام ثنائي متكامل ومتقابل): يُستخدم عند تشريح نصفي المخ، أو الجهاز السمبثاوي والباراسمبثاوي، أو العقل العاطفي مقابل المنطقي.\n" +
        "     • النمط cycle (حلقة أو دورة مغلقة أو مثلث علاقات ديناميكي): كدورة الصدمة، أو حلقة الإدمان، أو مثلث كاربمان.\n" +
        "     • النمط pillars (أركان وأبعاد الموقف التطبيقي للمشير): إذا كان المحور فكرياً عاماً، يُصمم كمخطط أبعاد وتطبيقات إرشادية للمشير توضح: ما هو التوجيه السليم؟ وما هي المحاذير المشورية؟ من واقع نص كلام المحاضر حصراً.\n" +
        "     • النمط pyramid (هرم متدرج هندسياً): يُستخدم عند وجود تدرج هرمي صريح ذكره المحاضر (كهرم الاحتياجات الإنسانية)، ويكون المستوى 1 في القاعدة والقمة تحمل الوسم isPeak: true.\n" +
        "   ⚠️ قاعدة منع الهلاوس والتأليف البصري (Zero Hallucination Rule): يُحظر تماماً اختراع أي أشكال أو رموز وهمية لم يذكرها المحاضر، وكل عنصر أو نقطة في المخطط يجب أن تستند صراحة لكلامه في التسجيل.\n" +
        "   ⚠️ شرط قطعي لسلامة بنية البيانات: يُحظر استخدام علامات التنصيص المزدوجة (\") نهائياً داخل نصوص الشرح أو الأمثلة أو قيم المخططات، واستبدلها دائماً بالأقواس العربية « » عند الاقتباس الداخلي.\n" +
        "   ⚠️ قواعد إلزامية صارمة لسلامة JSON:\n" +
        "     - كل اسم خاصية (key) وكل قيمة نصية يجب أن تكون محاطة حصراً بعلامات تنصيص مزدوجة قياسية (\").\n" +
        "     - يُحظر نهائياً استخدام علامات التنصيص المفردة (') أو كتابة أي اسم خاصية بدون علامات تنصيص مزدوجة.\n" +
        "     - يُحظر ترك أي فواصل زائدة قبل إغلاق الأقواس المعقوفة أو المربعة.\n" +
        "4. المرجعية الأكاديمية الشاملة والمعادلة الذهبية للاستيعاب السريع (Comprehensive High-Yield Standard):\n" +
        "   - التقسيم العضوي التلقائي للمحاور: قسّم المحاضرة إلى محاور رئيسية وافية بحسب التحولات الفكرية الحقيقية للمحاضر في التسجيل دون تقيد مسبق بعدد مصطنع (سواء استلزمت مادة المحاضرة 4 أو 6 أو 8 محاور)؛ تتبع خط سير أفكاره بدقة وموضوعية دون قفز.\n" +
        "   - بنية المحور المركزة ثلاثية الطبقات (قراءة مكثفة وشاملة في 7 إلى 10 دقائق): في كل محور في 'sections'، التزم بالطبقات الثلاث التالية حصراً:\n" +
        "     1. المتن الأكاديمي المكثف في 'content' (فقرة من 4 إلى 7 أسطر مركزة): صياغة عربية فصحى نقية ورصينة لجوهر الفكرة دون حشو شفهي، مع الحفظ الحرفي الصارم لكافة المصطلحات الأصيلة (يونانية، نفسية، كتابية) وأسماء النظريات وواضعيها ونقدها (كجبل الثلج، أو هرم ماسلو بتعديله المشوري، أو قاعدة 1 إلى 9 في التشجيع، أو مصطلحات ساركس وسوما وهابتو).\n" +
        "     2. ركائز التطبيق والمثال في 'keyPoints' (مصفوفة نقاط محددة): رصد الشاهد والمثال التوضيحي الأصلي الذي ذكره المحاضر لتثبيت الفكرة في الذاكرة، والتوجيه المشوري التطبيقي، والمحذور الإرشادي.\n" +
        "     3. المخطط البصري المركز في 'visualDiagram': بطاقة بصرية وفق أحد الأنماط العلمية تلخص علاقات المحور في ثوانٍ معدودة.\n" +
        "   - التصفية الصارمة للشوائب والهوامش: احذف تماماً أي مقدمات ترحيبية، أو تفقد للحضور، أو إعلانات، أو تنبيهات إدارية، أو إشارات لمنصة زووم أو التسجيل أو أوقات الاستراحة؛ فالدليل مخصص حصراً بنسبة 100% للمادة اللاهوتية والنفسية والمشورية الصافية.\n" +
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
    generateQuizOnly: async function(lectureTitle, lectureContent, quizCount, customInstructions, sectionsReference) {
      var count = parseInt(quizCount, 10) || 8;
      if (typeof lectureContent === "string") {
        lectureContent = lectureContent
          .replace(/محاضرة\s+أونلاين\s+عبر\s+زووم\s*\([^)]*\)\s*[-–—]?/gi, "")
          .replace(/عبر\s+زووم/gi, "")
          .replace(/\(من\s+\d+\s+إلى\s+\d+\s+(مساءً|صباحاً|ظهراً)\)/gi, "")
          .trim();
      }
      if (!lectureContent || lectureContent.length < 100) {
        throw new Error("لا يمكن توليد أسئلة الكويز: محتوى تفريغ المحاضرة غير متوفر أو غير كافٍ لضمان الأمانة العلمية.");
      }
      var prompt = "المطلوب: إعداد وتوليد بنك أسئلة كويز تفاعلي استيعابي وتطبيقي يغطي محاور محاضرة المشورة: '" + lectureTitle + "'.\n" +
        "محتوى المحاضرة المرجعي الكامل:\n" + lectureContent + "\n\n" +
        "الشروط والمعايير الأكاديمية الصارمة:\n" +
        "1. شرط الاقتباس المرجعي الدقيق والموجز (sourceQuote & timestamp): لكل سؤال يُصاغ، استخرج واقتبس العبارة أو الجملة الجوهرية الصريحة من كلام المحاضر في سطر واحد مركز ومختصر (جملة واحدة فقط دون أي فواصل أسطر Enter حقيقية) في حقل 'sourceQuote'، مع تحديد التوقيت الزمني الدقيق بالدقيقة والثانية من الفيديو (مثل: '14:25' أو '01:05:30') في حقل 'timestamp'. إذا كانت الفكرة غير مشروحة بنص وتوقيت صريح، يُحظر صياغة سؤال عنها نهائياً.\n" +
        "2. حظر أسئلة المجاملات والشكليات البحتة: يُمنع منعاً باتاً صياغة أي سؤال عن التحيات الشكلية، الترحيب الودي العابر، الواجبات، أو الترتيبات التنظيمية. يجب أن يختبر كل سؤال فكرة أو مفهوماً أو تمييزاً أو مهارة مشورية حقيقية شرحها المحاضر.\n" +
        "3. التغطية العضوية الشاملة (المعيار الأكاديمي الذهبي: سؤالان لكل محور حقيقي):\n" +
        "   - تتبع مسار المحاضرة وصغ الأسئلة لتغطي كافة محاور ومفاصل المحاضرة بالتساوي (بواقع سؤالين لكل محور رئيسي تم شرحه في المحاضرة ما مجموعه " + count + " سؤالاً بالتمام):\n" +
        (Array.isArray(sectionsReference) && sectionsReference.length > 0
          ? ("   - قائمة محاور المحاضرة المطلوب تغطيتها بسؤالين لكل محور:\n" + sectionsReference.map(function(s, idx) { return "     " + (idx + 1) + ". " + (s.title || ""); }).join("\n") + "\n")
          : "") +
        "   - لكل محور رئيسي، احرص على صياغة سؤالين متكاملين:\n" +
        "     • السؤال الأول (مفاهيمي ولغوي ولاهوتي): يقيس الاستيعاب الدقيق للمصطلح والتعريف والفروق العلمية التي ذكرها المحاضر (مثل الفارق بين ساركس وسوما، أو أركان العقد المشوري).\n" +
        "     • السؤال الثاني (تطبيقي وإكلينيكي ورعائي): يقيس كيف يوظف المشير هذا المفهوم عملياً داخل غرفة المشورة، والتعامل مع حالات وسيناريوهات المخدومين والمحاذير الأخلاقية.\n" +
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
          .replace(/\(من\s+\d+\s+إلى\s+\d+\s+(مساءً|صباحاً|ظهراً)\)/gi, "")
          .trim();
      }
      if (!lectureContent || lectureContent.length < 100) {
        throw new Error("لا يمكن استخراج المخططات البصرية: محتوى تفريغ المحاضرة غير متوفر أو غير كافٍ لضمان الأمانة العلمية.");
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
      if (typeof lectureContent === "string") {
        lectureContent = lectureContent
          .replace(/محاضرة\s+أونلاين\s+عبر\s+زووم\s*\([^)]*\)\s*[-–—]?/gi, "")
          .replace(/عبر\s+زووم/gi, "")
          .replace(/\(من\s+\d+\s+إلى\s+\d+\s+(مساءً|صباحاً|ظهراً)\)/gi, "")
          .trim();
      }
      if (!lectureContent || lectureContent.length < 100) {
        throw new Error("لا يمكن توليد الحزمة التعليمية: محتوى تفريغ المحاضرة غير متوفر أو غير كافٍ لضمان الأمانة العلمية.");
      }

      var summaryPages = parseInt(options.summaryPages, 10) || 5;
      var quizCount = parseInt(options.quizCount, 10) || 10;
      var customInstructions = (options.customInstructions || "").trim();
      var selected = options.selectedComponents || { summary: true, visuals: true, quiz: true };

      var output = {};

      // الخطوة 1: الدليل الدراسي المصور (الملخص الموسع مع المخططات البصرية المدمجة سياقياً)
      if (selected.summary !== false) {
        if (onProgress) onProgress(35, "جاري صياغة الدليل الدراسي المصور وبناء المخططات البصرية عضوياً... [1/2]");
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

      // الخطوة 2: الكويز التفاعلي العضوي (سؤالان متكاملان لكل محور رئيسي تم استخراجه)
      if (selected.quiz !== false) {
        var secList = (output.summary && Array.isArray(output.summary.sections)) ? output.summary.sections : [];
        var organicQuizCount = secList.length > 0 ? (secList.length * 2) : (parseInt(options.quizCount, 10) || 8);
        if (onProgress) onProgress(80, "جاري صياغة أسئلة الكويز التفاعلي عضوياً (سؤالان لكل محور: " + organicQuizCount + " أسئلة)... [2/2]");
        try {
          output.quiz = await window.EducationalAIService.generateQuizOnly(
            lectureTitle,
            lectureContent,
            organicQuizCount,
            customInstructions,
            secList
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
