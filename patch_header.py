with open('src/components/Header.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = """            onClick: function() {
              if ("caches" in window) {
                caches.keys().then(function(names) {
                  for (var i = 0; i < names.length; i++) caches.delete(names[i]);
                });
              }
              window.location.reload(true);
            },"""

replacement = """            onClick: function() {
              if ("caches" in window) {
                caches.keys().then(function(names) {
                  for (var i = 0; i < names.length; i++) caches.delete(names[i]);
                });
              }
              try {
                localStorage.removeItem("counsel_books_data");
                localStorage.removeItem("counsel_book_data_book-1791651887196");
                localStorage.removeItem("counsel_book_chapters_backup_book-1791651887196");
                Object.keys(localStorage).forEach(function(k) {
                  if (k.indexOf("counsel_cached_subtitles_") === 0 || k.indexOf("counsel_audio_pos_") === 0) {
                    localStorage.removeItem(k);
                  }
                });
              } catch (e) {}
              window.location.reload(true);
            },"""

content_norm = content.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')
replacement_norm = replacement.replace('\r\n', '\n')

assert target_norm in content_norm, "Target not found in Header.js!"
new_content = content_norm.replace(target_norm, replacement_norm)
with open('src/components/Header.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("SUCCESS: Patched Header.js reload button!")
