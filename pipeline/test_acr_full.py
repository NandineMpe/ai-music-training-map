"""
Test ACRCloud with a real music file downloaded from the web.
This will tell us exactly what's happening.
"""
import requests
import time
import hashlib
import hmac
import base64

ACCESS_KEY = "5aa990706d6b3744528ee64cc86ae342"
ACCESS_SECRET = "54VvG3x6bti00ubtWtlmQ5QZsc7qJHWICikYT1jU"
HOST = "https://identify-eu-west-1.acrcloud.com"

# Download a short sample of a known song (free sample from archive.org)
print("Downloading a test audio clip...")
# Use a small public domain clip
sample_url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
r = requests.get(sample_url, timeout=15, stream=True)
# Just get first 500KB (about 30 seconds of MP3)
audio_data = b""
for chunk in r.iter_content(chunk_size=8192):
    audio_data += chunk
    if len(audio_data) > 500000:
        break

print(f"Got {len(audio_data)} bytes of audio")

# Sign request
timestamp = str(int(time.time()))
string_to_sign = f"POST\n/v1/identify\n{ACCESS_KEY}\naudio\n1\n{timestamp}"
sign = base64.b64encode(
    hmac.HMAC(ACCESS_SECRET.encode(), string_to_sign.encode(), hashlib.sha1).digest()
).decode()

# Send
files = {"sample": ("test.mp3", audio_data, "audio/mpeg")}
data = {
    "access_key": ACCESS_KEY,
    "sample_bytes": str(len(audio_data)),
    "timestamp": timestamp,
    "signature": sign,
    "data_type": "audio",
    "signature_version": "1",
}

print(f"Sending {len(audio_data)} bytes to ACRCloud...")
resp = requests.post(f"{HOST}/v1/identify", files=files, data=data, timeout=20)
print(f"HTTP Status: {resp.status_code}")

result = resp.json()
print(f"Status code: {result.get('status', {}).get('code')}")
print(f"Status msg: {result.get('status', {}).get('msg')}")

if result.get("metadata"):
    meta = result["metadata"]
    if meta.get("music"):
        print(f"\nMusic matches: {len(meta['music'])}")
        for m in meta["music"][:3]:
            artists = ", ".join(a["name"] for a in m.get("artists", []))
            print(f"  {m.get('title')} by {artists} (score: {m.get('score')})")
    if meta.get("humming"):
        print(f"\nHumming matches: {len(meta['humming'])}")
        for m in meta["humming"][:3]:
            artists = ", ".join(a["name"] for a in m.get("artists", []))
            print(f"  {m.get('title')} by {artists} (score: {m.get('score')})")
    if not meta.get("music") and not meta.get("humming"):
        print(f"\nMetadata keys: {list(meta.keys())}")
else:
    print("\nNo metadata in response")
    print(f"Full response: {resp.text[:500]}")
