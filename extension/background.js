// دالة تحويل المللي ثانية إلى دقائق وثواني
function formatTimestamp(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// دالة تنظيف وتنسيق النصوص
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n/g, ' ')
    .trim();
}

// معالجة جلب التفريغ من يوتيوب
async function fetchYouTubeTranscript(videoId) {
  // 1. طلب صفحة الفيديو
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(watchUrl, {
    credentials: 'include',
    headers: {
      'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error(`تعذر فتح صفحة الفيديو: رمز الخطأ ${response.status}`);
  }

  const html = await response.text();

  // 2. استخراج بيانات المشغل
  let playerResponse = null;
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
  if (match && match[1]) {
    try {
      playerResponse = JSON.parse(match[1]);
    } catch (e) {
      // محاولة بديلة إذا كان هناك تداخل
    }
  }

  if (!playerResponse) {
    const jsonMatch = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        playerResponse = JSON.parse(jsonMatch[1]);
      } catch (e) {}
    }
  }

  if (!playerResponse) {
    throw new Error('لم يتم العثور على بيانات مشغل يوتيوب في الصفحة');
  }

  // 3. البحث عن مسارات الترجمة والتفريغ
  const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('لا توجد مسارات تفريغ نصي مسجلة أو مولدة لهذا الفيديو على يوتيوب');
  }

  // اختيار المسار العربي إن وجد، أو أول مسار متاح
  let selectedTrack = captionTracks.find(t => t.languageCode === 'ar' || (t.vssId && t.vssId.includes('ar')));
  if (!selectedTrack) {
    selectedTrack = captionTracks[0];
  }

  let transcriptUrl = selectedTrack.baseUrl;

  // 4. طلب نص التفريغ بصيغة json3 المريحة
  const separator = transcriptUrl.includes('?') ? '&' : '?';
  const jsonUrl = `${transcriptUrl}${separator}fmt=json3`;

  let transcriptData = null;
  try {
    const tResponse = await fetch(jsonUrl, { credentials: 'include' });
    if (tResponse.ok) {
      transcriptData = await tResponse.json();
    }
  } catch (err) {
    console.warn('فشل جلب صيغة json3، جاري المحاولة بالصيغة الافتراضية:', err);
  }

  let formattedTranscript = '';

  if (transcriptData && transcriptData.events) {
    // تجميع الفقرات كل 30 إلى 40 ثانية مع التوقيت
    let currentBlock = [];
    let currentStartMs = null;
    const blocks = [];

    for (const event of transcriptData.events) {
      if (!event.segs) continue;
      const text = event.segs.map(s => s.utf8).join('').trim();
      if (!text || text === '\n') continue;

      const startMs = event.tStartMs || 0;
      if (currentStartMs === null) {
        currentStartMs = startMs;
      }

      currentBlock.push(cleanText(text));

      // إذا تجاوزت الفقرة 35 ثانية أو احتوت على كلمات كافية نغلقها ونبدأ كتلة زمنية جديدة
      if (startMs - currentStartMs >= 35000 && currentBlock.length >= 4) {
        const timestampStr = formatTimestamp(currentStartMs);
        blocks.push(`⏱️ [${timestampStr}]\n${currentBlock.join(' ')}`);
        currentBlock = [];
        currentStartMs = null;
      }
    }

    if (currentBlock.length > 0 && currentStartMs !== null) {
      const timestampStr = formatTimestamp(currentStartMs);
      blocks.push(`⏱️ [${timestampStr}]\n${currentBlock.join(' ')}`);
    }

    formattedTranscript = blocks.join('\n\n');
  } else {
    // محاولة بديلة: قراءة بصيغة XML إذا تعذر json3
    const xmlResponse = await fetch(transcriptUrl, { credentials: 'include' });
    const xmlText = await xmlResponse.text();

    const regex = /<text start="([\d\.]+)" dur="[\d\.]+">(.*?)<\/text>/g;
    let matchXml;
    let currentBlock = [];
    let currentStartSec = null;
    const blocks = [];

    while ((matchXml = regex.exec(xmlText)) !== null) {
      const startSec = parseFloat(matchXml[1]);
      const text = cleanText(matchXml[2]);
      if (!text) continue;

      if (currentStartSec === null) {
        currentStartSec = startSec;
      }

      currentBlock.push(text);

      if (startSec - currentStartSec >= 35 && currentBlock.length >= 4) {
        const timestampStr = formatTimestamp(currentStartSec * 1000);
        blocks.push(`⏱️ [${timestampStr}]\n${currentBlock.join(' ')}`);
        currentBlock = [];
        currentStartSec = null;
      }
    }

    if (currentBlock.length > 0 && currentStartSec !== null) {
      const timestampStr = formatTimestamp(currentStartSec * 1000);
      blocks.push(`⏱️ [${timestampStr}]\n${currentBlock.join(' ')}`);
    }

    formattedTranscript = blocks.join('\n\n');
  }

  if (!formattedTranscript || formattedTranscript.trim().length === 0) {
    throw new Error('تم العثور على مسار التفريغ لكنه لا يحتوي على أي نصوص مقروءة');
  }

  return {
    transcript: formattedTranscript,
    transcriptText: formattedTranscript,
    language: selectedTrack.name?.simpleText || selectedTrack.languageCode || 'ar'
  };
}

// الاستماع للرسائل القادمة من صفحة التطبيق
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FETCH_TRANSCRIPT') {
    fetchYouTubeTranscript(request.videoId)
      .then(result => {
        sendResponse({ success: true, ...result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // إبقاء القناة مفتوحة للرد غير المتزامن
  }

  if (request.action === 'PING') {
    sendResponse({ success: true, status: 'READY' });
    return true;
  }
});
