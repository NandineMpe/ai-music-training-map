"""Check latest results and diagnose MP3 issue."""
import requests
import json

TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI3IiwianRpIjoiMjJjODJmNmI2ZWRmNGY2NDVkZTk4YzAwNjAzMmE0ZjM0MjQ5OWU2N2M2ZjhlZmEyMmVmM2JiOGFlOWM4ZDVhZjNjZjE3NGFhMWM1ZmY4MDgiLCJpYXQiOjE3ODQxMjk5NjQuMjQzMTY2LCJuYmYiOjE3ODQxMjk5NjQuMjQzMTcsImV4cCI6MjA5OTc0OTE2NC4yMDQxOTQsInN1YiI6IjM0OTQ5MiIsInNjb3BlcyI6WyIqIiwid3JpdGUtYWxsIiwicmVhZC1hbGwiLCJidWNrZXRzIiwid3JpdGUtYnVja2V0cyIsInJlYWQtYnVja2V0cyIsImF1ZGlvcyIsIndyaXRlLWF1ZGlvcyIsInJlYWQtYXVkaW9zIiwiY2hhbm5lbHMiLCJ3cml0ZS1jaGFubmVscyIsInJlYWQtY2hhbm5lbHMiLCJiYXNlLXByb2plY3RzIiwid3JpdGUtYmFzZS1wcm9qZWN0cyIsInJlYWQtYmFzZS1wcm9qZWN0cyIsInVjZiIsIndyaXRlLXVjZiIsInJlYWQtdWNmIiwiZGVsZXRlLXVjZiIsImJtLXByb2plY3RzIiwiYm0tY3MtcHJvamVjdHMiLCJ3cml0ZS1ibS1jcy1wcm9qZWN0cyIsInJlYWQtYm0tY3MtcHJvamVjdHMiLCJibS1iZC1wcm9qZWN0cyIsIndyaXRlLWJtLWJkLXByb2plY3RzIiwicmVhZC1ibS1iZC1wcm9qZWN0cyIsImZpbGVzY2FubmluZyIsIndyaXRlLWZpbGVzY2FubmluZyIsInJlYWQtZmlsZXNjYW5uaW5nIiwibWV0YWRhdGEiLCJyZWFkLW1ldGFkYXRhIl19.M_scy8pgSQPyNjqLndbpGRaeY-91pPNNzS9_FLYYWxaWNHY_L8mQxqDRFaCQ-VdcO-UOiHIK6UHxhGnFVeadZwBco90JdMY6wGXuwfjfUpKWc3MY-PFJGcJfKZEiy6JQbwcdaHuRnnDcv6E1WfAiL_vn5VMXCVCxVRz6W640LKh8OffUXS0Gpt0tYllYkZP9SKGBh4BEXWYQvYpcQMLnXBUIJKof-qRvUgxqLYVYgLJRdw9JFH7vnFS5dBUoesw5xPcN5A7Mrcr7caMMRV_ktiGNiMFZieTEqMxk-tgeOCLXfmMkz6q65LWmiYfmqaAVCRN3JkGKX3rH-QZ-Rv6e9BT3NgbKK76G6kEw1F86yI0nzHSesQoXfMxPzgpweqv_0RIy4vNjv1-0FqbEwLt5jniO-uBE1p3O0lHeMdQJLzBeEKGxdFSgaO5a6BnteXDwEVfzJUiWp1hjV28XnmOiPAu9ykVswPAMHe4TJFKoJL2DmrAafWNqbzYMSKEupUwTD7qnMf6hnMgjuMLkOuElIXVAwPB3OxXXkKuLGc1nTuyNSJ1SQMF36nUltkhx7ROnBrkslhQBXUKnufJDRwbeSVMXX4CtNgr-bNbySsRI0FLUh_qpfnFljfKqv2lIOBCC-GHq73dhC0OJb8S-kYwKBWbXCzOXyDOUw-JanxEXjDk"
BASE = "https://api-eu-west-1.acrcloud.com/api/fs-containers/33436"
HEADERS = {"Accept": "application/json", "Authorization": f"Bearer {TOKEN}"}

# Check latest ready files for their AI results
ready_ids = [
    "257bfac8-8c90-4372-9a99-944e043aa062",
    "78280918-2f4d-4b9c-b1ad-149b31558942", 
    "94c2aa0e-b7b0-4243-a1ed-5f16d778018b",
]

print("=== Files WITH results ===")
r = requests.get(f"{BASE}/files/{','.join(ready_ids)}", headers=HEADERS)
for f in r.json().get("data", []):
    ai = f.get("results", {}).get("ai_detection", [])
    music = f.get("results", {}).get("music", [])
    print(f"\n{f['name']} ({f['duration']}s):")
    for d in ai:
        print(f"  AI: {d['stem']}: {d['prediction']} ({d['ai_probability']}%) likely: {d.get('likely_source')}")
    if music:
        for m in music[:1]:
            res = m.get("result", {})
            print(f"  Music: {res.get('title')} by {[a['name'] for a in res.get('artists', [])]}")

# Now try uploading an MP3 directly from here to see if the issue is our API or ACR
print("\n\n=== Direct MP3 upload test ===")
# Download a real Suno-generated track from a public URL for testing
# Let's just use the shapeofyou file from the web
import struct, math

# Create a more realistic test - a 30 second wav with varied frequencies
sample_rate = 44100
duration = 30
num_samples = sample_rate * duration
samples = b""
for i in range(num_samples):
    t = i / sample_rate
    # Mix of frequencies to simulate music
    value = int(16000 * (
        math.sin(2 * math.pi * 440 * t) * 0.3 +
        math.sin(2 * math.pi * 554 * t) * 0.2 +
        math.sin(2 * math.pi * 660 * t) * 0.2 +
        math.sin(2 * math.pi * (440 + 100 * math.sin(t * 2)) * t) * 0.3
    ))
    value = max(-32768, min(32767, value))
    samples += struct.pack("<h", value)

wav_data = b"RIFF"
wav_data += struct.pack("<I", 36 + num_samples * 2)
wav_data += b"WAVE"
wav_data += b"fmt "
wav_data += struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
wav_data += b"data"
wav_data += struct.pack("<I", num_samples * 2)
wav_data += samples

print(f"Uploading 30s WAV ({len(wav_data)} bytes)...")
import time
files = {"file": ("test_music.wav", wav_data, "audio/wav")}
data = {"data_type": "audio"}
r = requests.post(f"{BASE}/files", headers=HEADERS, files=files, data=data)
print(f"Upload: {r.status_code}")
resp = r.json()
file_id = resp.get("data", {}).get("id")
print(f"File ID: {file_id}")

# Poll
for i in range(10):
    time.sleep(5)
    r2 = requests.get(f"{BASE}/files/{file_id}", headers=HEADERS)
    d = r2.json().get("data", [{}])
    if isinstance(d, list):
        d = d[0]
    state = d.get("state", 0)
    print(f"  Poll {i+1}: state={state}")
    if state == 1:
        ai = d.get("results", {}).get("ai_detection", [])
        for det in ai:
            print(f"    {det['stem']}: {det['prediction']} ({det['ai_probability']}%)")
        break
    elif state == -1:
        print("    No results")
        break
