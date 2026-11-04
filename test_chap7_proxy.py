import urllib.request
import time

drive_id = "1GCyUaSgFM95skneni0B2L59h8CLmhtOu" # Chap 7
proxy_url = f"https://counseling-study-platform.vercel.app/api/audio-proxy?id={drive_id}"
req = urllib.request.Request(proxy_url, headers={'User-Agent': 'Mozilla/5.0'})

for attempt in range(1, 4):
    try:
        print(f'Attempt {attempt} for Chapter 7...')
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            print('Success! Downloaded bytes:', len(data))
            break
    except Exception as e:
        print('Failed attempt:', type(e), e)
        time.sleep(3)
