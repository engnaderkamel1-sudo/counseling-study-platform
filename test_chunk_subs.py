import asyncio
import edge_tts
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

async def test_chunk():
    with open('chap10_cleaned_text.txt', 'r', encoding='utf-8') as f:
        text = f.read()

    # Take first ~1000 chars
    first_chunk = text[:1000]
    # cut at last newline
    idx = first_chunk.rfind('\n')
    if idx > 0:
        first_chunk = first_chunk[:idx]

    print("Chunk text:\n", first_chunk)
    print("=" * 60)

    comm = edge_tts.Communicate(first_chunk, 'ar-EG-SalmaNeural')
    subs = []
    async for item in comm.stream():
        if item['type'] == 'SentenceBoundary':
            st = item['offset'] / 1e7
            dur = item['duration'] / 1e7
            subs.append({'start': round(st, 2), 'end': round(st + dur, 2), 'text': item['text'].strip()})

    print(f"Total sentences extracted: {len(subs)}")
    for s in subs:
        print(f"[{s['start']}s -> {s['end']}s]: {s['text']}")

if __name__ == '__main__':
    asyncio.run(test_chunk())
