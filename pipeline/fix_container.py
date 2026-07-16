"""
Check and fix the container configuration.
Key insight from Claude: audio_type should be 'linein' for direct file uploads,
not 'recorded' (which is for mic captures).
We need TWO containers: one for file uploads (linein), one for mic (recorded).
"""
import requests
import json

TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI3IiwianRpIjoiMjJjODJmNmI2ZWRmNGY2NDVkZTk4YzAwNjAzMmE0ZjM0MjQ5OWU2N2M2ZjhlZmEyMmVmM2JiOGFlOWM4ZDVhZjNjZjE3NGFhMWM1ZmY4MDgiLCJpYXQiOjE3ODQxMjk5NjQuMjQzMTY2LCJuYmYiOjE3ODQxMjk5NjQuMjQzMTcsImV4cCI6MjA5OTc0OTE2NC4yMDQxOTQsInN1YiI6IjM0OTQ5MiIsInNjb3BlcyI6WyIqIiwid3JpdGUtYWxsIiwicmVhZC1hbGwiLCJidWNrZXRzIiwid3JpdGUtYnVja2V0cyIsInJlYWQtYnVja2V0cyIsImF1ZGlvcyIsIndyaXRlLWF1ZGlvcyIsInJlYWQtYXVkaW9zIiwiY2hhbm5lbHMiLCJ3cml0ZS1jaGFubmVscyIsInJlYWQtY2hhbm5lbHMiLCJiYXNlLXByb2plY3RzIiwid3JpdGUtYmFzZS1wcm9qZWN0cyIsInJlYWQtYmFzZS1wcm9qZWN0cyIsInVjZiIsIndyaXRlLXVjZiIsInJlYWQtdWNmIiwiZGVsZXRlLXVjZiIsImJtLXByb2plY3RzIiwiYm0tY3MtcHJvamVjdHMiLCJ3cml0ZS1ibS1jcy1wcm9qZWN0cyIsInJlYWQtYm0tY3MtcHJvamVjdHMiLCJibS1iZC1wcm9qZWN0cyIsIndyaXRlLWJtLWJkLXByb2plY3RzIiwicmVhZC1ibS1iZC1wcm9qZWN0cyIsImZpbGVzY2FubmluZyIsIndyaXRlLWZpbGVzY2FubmluZyIsInJlYWQtZmlsZXNjYW5uaW5nIiwibWV0YWRhdGEiLCJyZWFkLW1ldGFkYXRhIl19.M_scy8pgSQPyNjqLndbpGRaeY-91pPNNzS9_FLYYWxaWNHY_L8mQxqDRFaCQ-VdcO-UOiHIK6UHxhGnFVeadZwBco90JdMY6wGXuwfjfUpKWc3MY-PFJGcJfKZEiy6JQbwcdaHuRnnDcv6E1WfAiL_vn5VMXCVCxVRz6W640LKh8OffUXS0Gpt0tYllYkZP9SKGBh4BEXWYQvYpcQMLnXBUIJKof-qRvUgxqLYVYgLJRdw9JFH7vnFS5dBUoesw5xPcN5A7Mrcr7caMMRV_ktiGNiMFZieTEqMxk-tgeOCLXfmMkz6q65LWmiYfmqaAVCRN3JkGKX3rH-QZ-Rv6e9BT3NgbKK76G6kEw1F86yI0nzHSesQoXfMxPzgpweqv_0RIy4vNjv1-0FqbEwLt5jniO-uBE1p3O0lHeMdQJLzBeEKGxdFSgaO5a6BnteXDwEVfzJUiWp1hjV28XnmOiPAu9ykVswPAMHe4TJFKoJL2DmrAafWNqbzYMSKEupUwTD7qnMf6hnMgjuMLkOuElIXVAwPB3OxXXkKuLGc1nTuyNSJ1SQMF36nUltkhx7ROnBrkslhQBXUKnufJDRwbeSVMXX4CtNgr-bNbySsRI0FLUh_qpfnFljfKqv2lIOBCC-GHq73dhC0OJb8S-kYwKBWbXCzOXyDOUw-JanxEXjDk"
HEADERS = {"Accept": "application/json", "Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# Step 1: Check current container config
print("=== Current container (33436) ===")
r = requests.get(
    "https://api-eu-west-1.acrcloud.com/api/fs-containers/33436",
    headers={"Accept": "application/json", "Authorization": f"Bearer {TOKEN}"},
)
if r.status_code == 200:
    d = r.json().get("data", {})
    print(f"  Name: {d.get('name')}")
    print(f"  audio_type: {d.get('audio_type')}")  # THIS IS THE KEY
    print(f"  engine: {d.get('engine')}")
    print(f"  policy: {d.get('policy')}")
    print(f"  region: {d.get('region')}")
else:
    print(f"  Error: {r.status_code} {r.text[:200]}")

# Step 2: Create a new 'linein' container for direct file uploads
print("\n=== Creating 'linein' container for file uploads ===")
payload = {
    "name": "AI Detection - File Upload (linein)",
    "region": "eu-west-1",
    "audio_type": "linein",
    "engine": 1,
    "buckets": ["ACRCloud Music"],
    "policy": {
        "type": "traverse",
        "interval": 0,
        "rec_length": 10,
        "ai_detection": 1
    }
}

r2 = requests.post(
    "https://api-v2.acrcloud.com/api/fs-containers",
    headers=HEADERS,
    json=payload,
)
print(f"  Status: {r2.status_code}")
if r2.status_code in (200, 201):
    new_data = r2.json().get("data", {})
    print(f"  New container ID: {new_data.get('id')}")
    print(f"  Name: {new_data.get('name')}")
    print(f"  audio_type: {new_data.get('audio_type')}")
    print(f"  policy: {new_data.get('policy')}")
else:
    print(f"  Error: {r2.text[:300]}")

# Step 3: Also create a 'recorded' container for mic recordings
print("\n=== Creating 'recorded' container for mic recordings ===")
payload2 = {
    "name": "AI Detection - Mic Recording (recorded)",
    "region": "eu-west-1",
    "audio_type": "recorded",
    "engine": 1,
    "buckets": ["ACRCloud Music"],
    "policy": {
        "type": "traverse",
        "interval": 0,
        "rec_length": 10,
        "ai_detection": 1
    }
}

r3 = requests.post(
    "https://api-v2.acrcloud.com/api/fs-containers",
    headers=HEADERS,
    json=payload2,
)
print(f"  Status: {r3.status_code}")
if r3.status_code in (200, 201):
    new_data2 = r3.json().get("data", {})
    print(f"  New container ID: {new_data2.get('id')}")
    print(f"  Name: {new_data2.get('name')}")
    print(f"  audio_type: {new_data2.get('audio_type')}")
else:
    print(f"  Error: {r3.text[:300]}")
