import asyncio
import edge_tts
import json

async def run_full():
    with open('chap4_text.txt', 'r', encoding='utf-8') as f:
        text = f.read()

    print(f'Starting stream for {len(text)} characters...')
    c = edge_tts.Communicate(text, 'ar-EG-SalmaNeural')
    sentences = []
    
    try:
        count = 0
        async for chunk in c.stream():
            if chunk['type'] == 'SentenceBoundary':
                count += 1
                start = round(chunk['offset'] / 10000000, 2)
                dur = round(chunk['duration'] / 10000000, 2)
                end = round(start + dur, 2)
                sentences.append({
                    'start': start,
                    'end': end,
                    'text': chunk['text'].strip()
                })
                if count % 20 == 0:
                    print(f'Processed {count} sentences. Latest offset: {start}s')
        
        print(f'Finished successfully! Total sentences: {len(sentences)}')
        with open('chap4_sentences.json', 'w', encoding='utf-8') as out:
            json.dump(sentences, out, ensure_ascii=False, indent=2)
            
    except Exception as e:
        print('Error during stream:', type(e), e)
        if sentences:
            print(f'Saved partial ({len(sentences)} sentences) up to {sentences[-1]["end"]}s')
            with open('chap4_sentences_partial.json', 'w', encoding='utf-8') as out:
                json.dump(sentences, out, ensure_ascii=False, indent=2)

asyncio.run(run_full())
