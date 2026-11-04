import sys

with open('src/pages/BooksPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = """            var needCloudSync = false;
            var mergedChaps = (cloudChaps.length > 0 ? cloudChaps : localChaps).map(function(ch) {
              var cachedCh = localChaps.find(function(cc) {
                return cc.id === ch.id || (cc.title && ch.title && cc.title.trim() === ch.title.trim());
              });
              var cachedTextLen = cachedCh && cachedCh.text ? cachedCh.text.length : 0;
              var cloudTextLen = ch.text ? ch.text.length : 0;
              if (cachedTextLen > cloudTextLen) {
                needCloudSync = true;
              }
              var isCloudExpired = utils.isExpiredAudioUrl ? utils.isExpiredAudioUrl(ch.audioUrl) : (ch.audioUrl && (ch.audioUrl.indexOf("/tmp/gradio/") !== -1 || ch.audioUrl.indexOf("gradio_api/file") !== -1));
              var isCachedDrive = cachedCh && cachedCh.audioUrl && (cachedCh.audioUrl.indexOf("drive.google.com") !== -1 || cachedCh.audioUrl.indexOf("docs.google.com") !== -1);
              // الرابط الصوتي المعتمد: إذا كان الرابط في السحابة مفرغاً ("") فيعامل كحذف ولا يعاد إحياؤه من الكاش المحلي
              var cloudAudioVal = (ch.audioUrl || "").trim();
              var isCloudDrive = cloudAudioVal && (cloudAudioVal.indexOf("drive.google.com") !== -1 || cloudAudioVal.indexOf("docs.google.com") !== -1);
              var bestAudio = "";
              if (cloudAudioVal) {
                bestAudio = isCloudDrive ? cloudAudioVal : (!isCloudExpired ? cloudAudioVal : "");
              } else if (ch.audioUrl === undefined && isCachedDrive) {
                bestAudio = cachedCh.audioUrl.trim();
              }
              var bestText = (cachedTextLen > cloudTextLen) ? cachedCh.text : (ch.text || "");"""

replacement = """            var needCloudSync = false;
            var mergedChaps = (cloudChaps.length > 0 ? cloudChaps : localChaps).map(function(ch) {
              var cachedCh = localChaps.find(function(cc) {
                return cc.id === ch.id || (cc.title && ch.title && cc.title.trim() === ch.title.trim());
              });
              var cachedText = (cachedCh && cachedCh.text) ? cachedCh.text.trim() : "";
              var cloudText = (ch && ch.text) ? ch.text.trim() : "";
              if (!cloudText && cachedText) {
                needCloudSync = true;
              }
              var isCloudExpired = utils.isExpiredAudioUrl ? utils.isExpiredAudioUrl(ch.audioUrl) : (ch.audioUrl && (ch.audioUrl.indexOf("/tmp/gradio/") !== -1 || ch.audioUrl.indexOf("gradio_api/file") !== -1));
              var isCachedDrive = cachedCh && cachedCh.audioUrl && (cachedCh.audioUrl.indexOf("drive.google.com") !== -1 || cachedCh.audioUrl.indexOf("docs.google.com") !== -1);
              // الرابط الصوتي المعتمد: السحابة دائماً صاحبة القرار النهائي، ولا يتم اللجوء للكاش إلا إذا كان حقل السحابة غير معرف
              var cloudAudioVal = (ch.audioUrl || "").trim();
              var isCloudDrive = cloudAudioVal && (cloudAudioVal.indexOf("drive.google.com") !== -1 || cloudAudioVal.indexOf("docs.google.com") !== -1);
              var bestAudio = "";
              if (cloudAudioVal) {
                bestAudio = isCloudDrive ? cloudAudioVal : (!isCloudExpired ? cloudAudioVal : "");
              } else if (ch.audioUrl === undefined && isCachedDrive) {
                bestAudio = cachedCh.audioUrl.trim();
              }
              // النص المعتمد: النص السحابي هو المعتمد القطعي، ولا يعتمد الكاش إلا إذا كان النص في السحابة فارغاً
              var bestText = cloudText ? ch.text : cachedText;"""

content_norm = content.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')
replacement_norm = replacement.replace('\r\n', '\n')

if target_norm in content_norm:
    new_content = content_norm.replace(target_norm, replacement_norm)
    with open('src/pages/BooksPage.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: Patched BooksPage.js!")
else:
    print("ERROR: Target not found in BooksPage.js")
    sys.exit(1)
