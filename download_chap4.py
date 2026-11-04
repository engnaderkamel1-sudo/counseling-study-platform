import urllib.request

url = 'https://counseling-study-platform.vercel.app/api/audio-proxy?id=1FN_37AjlW31VkfVb-Azdz9fUfiiEI_WV'
print('Downloading chap4 audio...')
urllib.request.urlretrieve(url, 'chap4_drive.mp3')
print('Downloaded.')

# Check file size
import os
print('File size:', os.path.getsize('chap4_drive.mp3'))
