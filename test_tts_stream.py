import asyncio
import edge_tts
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def test():
    text = "إن قانون الحياة ببساطة هو خطة مقصودة وواعية لجعل الله في قلب حياتنا اليومية. وهو يقدم إرشادات تساعدنا دائماً أن نتذكر الله بوصفه مصدر كل خير."
    comm = edge_tts.Communicate(text, 'ar-EG-SalmaNeural')
    audio = bytearray()
    subs = []
    async for chunk in comm.stream():
        if chunk['type'] == 'audio':
            audio.extend(chunk['data'])
        elif chunk['type'] == 'SentenceBoundary':
            subs.append(chunk)
            
    print(f"Audio size: {len(audio)} bytes")
    for s in subs:
        st = s['offset'] / 10000000.0
        en = st + s['duration'] / 10000000.0
        txt = s.get('text', '')
        print(f"{st:.2f} -> {en:.2f}: {txt}")

if __name__ == '__main__':
    asyncio.run(test())
