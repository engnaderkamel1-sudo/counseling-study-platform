import urllib.request

url = 'https://counseling-study-platform.vercel.app/api/audio-proxy?id=1FN_37AjlW31VkfVb-Azdz9fUfiiEI_WV'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        print('Status:', resp.status)
        print('Content-Type:', resp.headers.get('Content-Type'))
        print('Content-Length:', resp.headers.get('Content-Length'))
except Exception as e:
    print('Error:', e)
