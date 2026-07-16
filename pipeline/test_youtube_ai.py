"""
Test with a known AI-generated song from YouTube via platform URL.
ACR supports YouTube links directly.
"""
import requests
import time

TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI3IiwianRpIjoiMjJjODJmNmI2ZWRmNGY2NDVkZTk4YzAwNjAzMmE0ZjM0MjQ5OWU2N2M2ZjhlZmEyMmVmM2JiOGFlOWM4ZDVhZjNjZjE3NGFhMWM1ZmY4MDgiLCJpYXQiOjE3ODQxMjk5NjQuMjQzMTY2LCJuYmYiOjE3ODQxMjk5NjQuMjQzMTcsImV4cCI6MjA5OTc0OTE2NC4yMDQxOTQsInN1YiI6IjM0OTQ5MiIsInNjb3BlcyI6WyIqIiwid3JpdGUtYWxsIiwicmVhZC1hbGwiLCJidWNrZXRzIiwid3JpdGUtYnVja2V0cyIsInJlYWQtYnVja2V0cyIsImF1ZGlvcyIsIndyaXRlLWF1ZGlvcyIsInJlYWQtYXVkaW9zIiwiY2hhbm5lbHMiLCJ3cml0ZS1jaGFubmVscyIsInJlYWQtY2hhbm5lbHMiLCJiYXNlLXByb2plY3RzIiwid3JpdGUtYmFzZS1wcm9qZWN0cyIsInJlYWQtYmFzZS1wcm9qZWN0cyIsInVjZiIsIndyaXRlLXVjZiIsInJlYWQtdWNmIiwiZGVsZXRlLXVjZiIsImJtLXByb2plY3RzIiwiYm0tY3MtcHJvamVjdHMiLCJ3cml0ZS1ibS1jcy1wcm9qZWN0cyIsInJlYWQtYm0tY3MtcHJvamVjdHMiLCJibS1iZC1wcm9qZWN0cyIsIndyaXRlLWJtLWJkLXByb2plY3RzIiwicmVhZC1ibS1iZC1wcm9qZWN0cyIsImZpbGVzY2FubmluZyIsIndyaXRlLWZpbGVzY2FubmluZyIsInJlYWQtZmlsZXNjYW5uaW5nIiwibWV0YWRhdGEiLCJyZWFkLW1ldGFkYXRhIl19.M_scy8pgSQPyNjqLndbpGRaeY-91pPNNzS9_FLYYWxaWNHY_L8mQxqDRFaCQ-VdcO-UOiHIK6UHxhGnFVeadZwBco90JdMY6wGXuwfjfUpKWc3MY-PFJGcJfKZEiy6JQbwcdaHuRnnDcv6E1WfAiL_vn5VMXCVCxVRz6W640LKh8OffUXS0Gpt0tYllYkZP9SKGBh4BEXWYQvYpcQMLnXBUIJKof-qRvUgxqLYVYgLJRdw9JFH7vnFS5dBUoesw5xPcN5A7Mrcr7caMMRV_ktiGNiMFZieTEqMxk-tgeOCLXfmMkz6q65LWmiYfmqaAVCRN3JkGKX3rH-QZ-Rv6e9BT3NgbKK76G6kEw1F86yI0nzHSesQoXfMxPzgpweqv_0RIy4vNjv1-0FqbEwLt5jniO-uBE1p3O0lHeMdQJLzBeEKGxdFSgaO5a6BnteXDwEVfzJUiWp1hjV28XnmOiPAu9ykVswPAMHe4TJFKoJL2DmrAafWNqbzYMSKEupUwTD7qnMf6hnMgjuMLkOuElIXVAwPB3OxXXkKuLGc1nTuyNSJ1SQMF36nUltkhx7ROnBrkslhQBXUKnufJDRwbeSVMXX4CtNgr-bNbySsRI0FLUh_qpfnFljfKqv2lIOBCC-GHq73dhC0OJb8S-kYwKBWbXCzOXyDOUw-JanxEXjDk"
BASE = "https://api-eu-west-1.acrcloud.com/api/fs-containers/33436"
HEADERS = {"Accept": "application/json", "Authorization": f"Bearer {TOKEN}"}

# Submit a known Suno-generated song on YouTube via platform URL
# This is a well-known AI-generated track
youtube_url = "https://www.youtube.com/watch?v=3xJGMZ3Q-Bo"  # "Soul of the Machine" - known Suno track

print(f"Submitting YouTube URL: {youtube_url}")
data = {
    "url": youtube_url,
    "data_type": "platforms",
}

r = requests.post(
    f"{BASE}/files",
    headers={**HEADERS, "Content-Type": "application/json"},
    json=data,
)
print(f"Upload status: {r.status_code}")
print(f"Response: {r.text[:500]}")

if r.status_code == 200:
    file_id = r.json().get("data", {}).get("id")
    print(f"File ID: {file_id}")
    
    print("Polling for results...")
    for i in range(30):
        time.sleep(5)
        r2 = requests.get(f"{BASE}/files/{file_id}", headers=HEADERS)
        d = r2.json().get("data", [{}])
        if isinstance(d, list):
            d = d[0]
        state = d.get("state", 0)
        if state == 1:
            print(f"\nRESULTS after {(i+1)*5}s:")
            ai = d.get("results", {}).get("ai_detection", [])
            for det in ai:
                print(f"  {det['stem']}: {det['prediction']} ({det['ai_probability']}%) source: {det.get('likely_source')}")
                if det.get("source_probabilities"):
                    for sp in sorted(det["source_probabilities"], key=lambda x: x["probability"], reverse=True)[:5]:
                        print(f"    {sp['source']}: {sp['probability']}%")
            break
        elif state == -1:
            print(f"\nNO RESULTS after {(i+1)*5}s")
            break
        else:
            print(f"  Processing... ({(i+1)*5}s)")
