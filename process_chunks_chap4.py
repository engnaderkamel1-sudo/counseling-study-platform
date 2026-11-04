import asyncio
import edge_tts
import json
import re

def split_text_into_chunks(text, max_chars=12000):
    paragraphs = text.split('\n')
    chunks = []
    current_chunk = []
    current_len = 0
    
    for p in paragraphs:
        p_len = len(p) + 1
        if current_len + p_len > max_chars and current_chunk:
            chunks.append('\n'.join(current_chunk))
            current_chunk = [p]
            current_len = p_len
        else:
            current_chunk.append(p)
            current_len += p_len
            
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
        
    return chunks

async def process_all_chunks():
    with open('chap4_text.txt', 'r', encoding='utf-8') as f:
        full_text = f.read()

    chunks = split_text_into_chunks(full_text, max_chars=12000)
    print(f'Total chunks to process: {len(chunks)}')
    for i, ch in enumerate(chunks):
        print(f'Chunk {i+1}: {len(ch)} characters')

    all_sentences = []
    cumulative_offset = 0.0

    for idx, chunk in enumerate(chunks):
        print(f'\n--- Processing Chunk {idx+1}/{len(chunks)} ---')
        communicate = edge_tts.Communicate(chunk, 'ar-EG-SalmaNeural')
        chunk_sentences = []
        max_end_in_chunk = 0.0

        async for chunk_msg in communicate.stream():
            if chunk_msg['type'] == 'SentenceBoundary':
                s_start = round((chunk_msg['offset'] / 10000000) + cumulative_offset, 2)
                s_dur = round(chunk_msg['duration'] / 10000000, 2)
                s_end = round(s_start + s_dur, 2)
                t = chunk_msg['text'].strip()
                if t:
                    chunk_sentences.append({
                        'start': s_start,
                        'end': s_end,
                        'text': t
                    })
                rel_end = (chunk_msg['offset'] + chunk_msg['duration']) / 10000000
                if rel_end > max_end_in_chunk:
                    max_end_in_chunk = rel_end

        print(f'Chunk {idx+1} completed: {len(chunk_sentences)} sentences. Duration: {max_end_in_chunk:.2f}s')
        all_sentences.extend(chunk_sentences)
        cumulative_offset += max_end_in_chunk
        print(f'Total sentences so far: {len(all_sentences)}. Cumulative time: {cumulative_offset:.2f}s')

    print(f'\n====================================')
    print(f'ALL CHUNKS DONE! Total sentences: {len(all_sentences)}')
    print(f'Total duration: {cumulative_offset:.2f}s ({cumulative_offset/60:.2f} minutes)')
    
    with open('chap4_full_subtitles.json', 'w', encoding='utf-8') as out:
        json.dump(all_sentences, out, ensure_ascii=False, indent=2)
    print('Saved to chap4_full_subtitles.json')

asyncio.run(process_all_chunks())
