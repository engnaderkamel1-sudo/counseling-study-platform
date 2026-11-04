import asyncio
import edge_tts
import json

async def test_submaker():
    with open('chap4_text.txt', 'r', encoding='utf-8') as f:
        full_text = f.read()

    sample_text = full_text[:400]
    print('Testing on sample text:', len(sample_text), 'chars')
    
    communicate = edge_tts.Communicate(sample_text, 'ar-EG-SalmaNeural')
    submaker = edge_tts.SubMaker()
    
    async for chunk in communicate.stream():
        if chunk['type'] == 'WordBoundary':
            submaker.feed(chunk)
            
    srt = submaker.get_srt()
    print('SRT generated, length:', len(srt))
    print(srt[:300])

asyncio.run(test_submaker())
