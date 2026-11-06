// وسيط التخاطب بين كود المنصة في المتصفح وبين إضافة النظام
(function() {
  console.log('[مساعد التفريغ] الإضافة جاهزة ومتصلة بالمنصة.');

  // الإعلان الفوري عن توفر الإضافة للصفحة
  window.postMessage({ type: 'TRANSCRIPT_EXTENSION_AVAILABLE' }, '*');

  // الاستماع للطلبات الصادرة من الصفحة
  window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data) return;

    // فحص توفر الإضافة
    if (event.data.type === 'CHECK_TRANSCRIPT_EXTENSION') {
      chrome.runtime.sendMessage({ action: 'PING' }, function(response) {
        if (chrome.runtime.lastError) {
          window.postMessage({
            type: 'CHECK_TRANSCRIPT_EXTENSION_RESPONSE',
            installed: false
          }, '*');
          return;
        }
        window.postMessage({
          type: 'CHECK_TRANSCRIPT_EXTENSION_RESPONSE',
          installed: true,
          status: response?.status
        }, '*');
      });
      return;
    }

    // طلب جلب التفريغ
    if (event.data.type === 'REQUEST_YOUTUBE_TRANSCRIPT') {
      const { videoId, requestId } = event.data;

      chrome.runtime.sendMessage({ action: 'FETCH_TRANSCRIPT', videoId: videoId }, function(response) {
        if (chrome.runtime.lastError) {
          window.postMessage({
            type: 'RECEIVE_YOUTUBE_TRANSCRIPT',
            requestId: requestId,
            success: false,
            error: chrome.runtime.lastError.message
          }, '*');
          return;
        }

        window.postMessage({
          type: 'RECEIVE_YOUTUBE_TRANSCRIPT',
          requestId: requestId,
          ...response
        }, '*');
      });
    }
  });
})();
