import asyncio
import edge_tts

async def check_types():
    c = edge_tts.Communicate('اعرف نفسك لتتعرف الله. أن تكون ذاتك الحقيقية.', 'ar-EG-SalmaNeural')
    counts = {}
    items = []
    async for chunk in c.stream():
        t = chunk['type']
        counts[t] = counts.get(t, 0) + 1
        if t != 'audio':
            items.append({
                'type': t,
                'offset': chunk['offset'] / 10000000,
                'duration': chunk['duration'] / 10000000,
                'text': chunk['text']
            })
    print('Counts:', counts)
    print('Non-audio count:', len(items))
    for it in items:
        print(it['type'], it['offset'], it['duration'], repr(it['text']))

asyncio.run(check_types())
