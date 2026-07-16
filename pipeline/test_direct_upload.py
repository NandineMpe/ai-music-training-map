"""
Test: download a real Suno track and upload it directly to ACR.
This bypasses our web app entirely to confirm ACR processes it.
"""
import requests
import time

TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI3IiwianRpIjoiMjJjODJmNmI2ZWRmNGY2NDVkZTk4YzAwNjAzMmE0ZjM0MjQ5OWU2N2M2ZjhlZmEyMmVmM2JiOGFlOWM4ZDVhZjNjZjE3NGFhMWM1ZmY4MDgiLCJpYXQiOjE3ODQxMjk5NjQuMjQzMTY2LCJuYmYiOjE3ODQxMjk5NjQuMjQzMTcsImV4cCI6MjA5OTc0OTE2NC4yMDQxOTQsInN1YiI6IjM0OTQ5MiIsInNjb3BlcyI6WyIqIiwid3JpdGUtYWxsIiwicmVhZC1hbGwiLCJidWNrZXRzIiwid3JpdGUtYnVja2V0cyIsInJlYWQtYnVja2V0cyIsImF1ZGlvcyIsIndyaXRlLWF1ZGlvcyIsInJlYWQtYXVkaW9zIiwiY2hhbm5lbHMiLCJ3cml0ZS1jaGFubmVscyIsInJlYWQtY2hhbm5lbHMiLCJiYXNlLXByb2plY3RzIiwid3JpdGUtYmFzZS1wcm9qZWN0cyIsInJlYWQtYmFzZS1wcm9qZWN0cyIsInVjZiIsIndyaXRlLXVjZiIsInJlYWQtdWNmIiwiZGVsZXRlLXVjZiIsImJtLXByb2plY3RzIiwiYm0tY3MtcHJvamVjdHMiLCJ3cml0ZS1ibS1jcy1wcm9qZWN0cyIsInJlYWQtYm0tY3MtcHJvamVjdHMiLCJibS1iZC1wcm9qZWN0cyIsIndyaXRlLWJtLWJkLXByb2plY3RzIiwicmVhZC1ibS1iZC1wcm9qZWN0cyIsImZpbGVzY2FubmluZyIsIndyaXRlLWZpbGVzY2FubmluZyIsInJlYWQtZmlsZXNjYW5uaW5nIiwibWV0YWRhdGEiLCJyZWFkLW1ldGFkYXRhIl19.M_scy8pgSQPyNjqLndbpGRaeY-91pPNNzS9_FLYYWxaWNHY_L8mQxqDRFaCQ-VdcO-UOiHIK6UHxhGnFVeadZwBco90JdMY6wGXuwfjfUpKWc3MY-PFJGcJfKZEiy6JQbwcdaHuRnnDcv6E1WfAiL_vn5VMXCVCxVRz6W640LKh8OffUXS0Gpt0tYllYkZP9SKGBh4BEXWYQvYpcQMLnXBUIJKof-qRvUgxqLYVYgLJRdw9JFH7vnFS5dBUoesw5xPcN5A7Mrcr7caMMRV_ktiGNiMFZieTEqMxk-tgeOCLXfmMkz6q65LWmiYfmqaAVCRN3JkGKX3rH-QZ-Rv6e9BT3NgbKK76G6kEw1F86yI0nzHSesQoXfMxPzgpweqv_0RIy4vNjv1-0FqbEwLt5jniO-uBE1p3O0lHeMdQJLzBeEKGxdFSgaO5a6BnteXDwEVfzJUiWp1hjV28XnmOiPAu9ykVswPAMHe4TJFKoJL2DmrAafWNqbzYMSKEupUwTD7qnMf6hnMgjuMLkOuElIXVAwPB3OxXXkKuLGc1nTuyNSJ1SQMF36nUltkhx7ROnBrkslhQBXUKnufJDRwbeSVMXX4CtNgr-bNbySsRI0FLUh_qpfnFljfKqv2lIOBCC-GHq73dhC0OJb8S-kYwKBWbXCzOXyDOUw-JanxEXjDk"
BASE = "https://api-eu-west-1.acrcloud.com/api/fs-containers/33436"
HEADERS = {"Accept": "application/json", "Authorization": f"Bearer {TOKEN}"}

# Download a public MP3 (a real music file, not AI-generated, but this tests the flow)
print("Downloading a test MP3...")
mp3_url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
r = requests.get(mp3_url, timeout=30, stream=True)
mp3_data = b""
for chunk in r.iter_content(chunk_size=8192):
    mp3_data += chunk
    if len(mp3_data) > 1_000_000:  # ~1MB = about 60 seconds
        break

print(f"Got {len(mp3_data)} bytes ({len(mp3_data)/1024:.0f} KB)")

# Upload exactly like ACR docs show
print("Uploading to ACR...")
files = {"file": ("soundhelix-test.mp3", mp3_data, "audio/mpeg")}
data = {"data_type": "audio"}

r2 = requests.post(f"{BASE}/files", headers=HEADERS, files=files, data=data)
print(f"Upload status: {r2.status_code}")
resp = r2.json()
file_id = resp.get("data", {}).get("id")
duration = resp.get("data", {}).get("duration")
print(f"File ID: {file_id}, Duration: {duration}s")

# Poll for results
print("Polling for results...")
for i in range(20):
    time.sleep(5)
    r3 = requests.get(f"{BASE}/files/{file_id}", headers=HEADERS)
    d = r3.json().get("data", [{}])
    if isinstance(d, list):
        d = d[0]
    state = d.get("state", 0)
    if state == 1:
        print(f"  READY after {(i+1)*5}s!")
        ai = d.get("results", {}).get("ai_detection", [])
        music = d.get("results", {}).get("music", [])
        for det in ai:
            print(f"    AI: {det['stem']}: {det['prediction']} ({det['ai_probability']}%) source: {det.get('likely_source')}")
        if music:
            for m in music[:1]:
                res = m.get("result", {})
                print(f"    Music: {res.get('title')} by {[a['name'] for a in res.get('artists', [])]}")
        break
    elif state == -1:
        print(f"  NO RESULTS after {(i+1)*5}s")
        break
    else:
        print(f"  Processing... ({(i+1)*5}s)")
else:
    print("  Timed out waiting for results")
