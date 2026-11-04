import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/components/books/ChapterTextViewerModal.js', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.splitlines()
for i, l in enumerate(lines):
    if 'createElement("button"' in l or "createElement('button'" in l:
        block = '\n'.join(lines[i:min(len(lines), i+12)])
        print(f"Line {i+1}:")
        print(block)
        print("-" * 50)
