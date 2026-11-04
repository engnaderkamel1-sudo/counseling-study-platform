import json

with open('chap4_sentences_partial.json', 'r', encoding='utf-8') as f:
    subs = json.load(f)

print('Partial count:', len(subs))
print('First sentence:', subs[0])
print('Sentence 50:', subs[50])
print('Last sentence:', subs[-1])
