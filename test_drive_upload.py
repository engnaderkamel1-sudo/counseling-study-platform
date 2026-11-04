import urllib.request
import json
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8')

DRIVE_ENDPOINT = "https://script.google.com/macros/s/AKfycbzVQ7NkIeykIhT8vU61Chphju1nnOjuEp1MvxKGnx2bBQix0MaV5R0z5cELFs5CSiJW/exec"

def test_upload():
    dummy_data = b"ID3\x03\x00\x00\x00\x00\x00\x00" # dummy mp3 header
    payload = json.dumps({
        "fileName": "test_ping.mp3",
        "mimeType": "audio/mp3",
        "base64Data": base64.b64encode(dummy_data).decode("ascii")
    }).encode("utf-8")
    
    req = urllib.request.Request(
        DRIVE_ENDPOINT,
        data=payload,
        headers={"Content-Type": "text/plain;charset=utf-8"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("Upload test response:", res)

if __name__ == '__main__':
    test_upload()
