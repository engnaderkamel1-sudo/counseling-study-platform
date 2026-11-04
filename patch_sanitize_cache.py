with open('src/pages/BooksPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = """      if (id === "book-1791664075112" || title === "تتت" || title === "ت ت ت" || title === "ت ت" || b.isDeleted) {
        try {
          utils.removeLocal("counsel_book_data_" + id);
          utils.removeLocal("counsel_book_page_" + id);
        } catch (e) {}
        return false;
      }
      return true;"""

replacement = """      if (id === "book-1791664075112" || title === "تتت" || title === "ت ت ت" || title === "ت ت" || b.isDeleted) {
        try {
          utils.removeLocal("counsel_book_data_" + id);
          utils.removeLocal("counsel_book_page_" + id);
        } catch (e) {}
        return false;
      }
      if (id === "book-1791651887196") {
        try {
          var ch10 = (b.audioChapters || []).find(function(c) { return c && c.id === "chap_1791651928435_10"; });
          if (ch10 && ch10.text && ch10.text.length > 34500) {
            utils.removeLocal("counsel_book_data_book-1791651887196");
            utils.removeLocal("counsel_book_chapters_backup_book-1791651887196");
            localStorage.removeItem("counsel_audio_pos_book-1791651887196_chap_1791651928435_10");
          }
        } catch (eClean) {}
      }
      return true;"""

content_norm = content.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')
replacement_norm = replacement.replace('\r\n', '\n')

assert target_norm in content_norm, "Target not found!"
new_content = content_norm.replace(target_norm, replacement_norm)
with open('src/pages/BooksPage.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("SUCCESS: Patched sanitizeBooksList in BooksPage.js!")
