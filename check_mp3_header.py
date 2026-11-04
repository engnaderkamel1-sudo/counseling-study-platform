import urllib.request
import struct

# Download first 1MB and last 100KB or check MP3 duration
url = 'https://counseling-study-platform.vercel.app/api/audio-proxy?id=1FN_37AjlW31VkfVb-Azdz9fUfiiEI_WV'
req = urllib.request.Request(url, headers={'Range': 'bytes=0-100000', 'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
        print('Downloaded bytes:', len(data))
        # Look for Xing or Info header or estimate bitrate
        # MP3 frame header
        idx = 0
        while idx < len(data) - 4:
            if data[idx] == 0xFF and (data[idx+1] & 0xE0) == 0xE0:
                # Frame sync
                version = (data[idx+1] >> 3) & 0x03
                layer = (data[idx+1] >> 1) & 0x03
                bitrate_idx = (data[idx+2] >> 4) & 0x0F
                samplerate_idx = (data[idx+2] >> 2) & 0x03
                print(f'Sync found at {idx}: ver={version}, layer={layer}, bitrate_idx={bitrate_idx}, sr_idx={samplerate_idx}')
                break
            idx += 1
except Exception as e:
    print('Error:', e)
