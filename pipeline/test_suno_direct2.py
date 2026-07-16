"""
Download a Suno track directly from HF API and upload to ACR.
"""
import requests
import time

TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI3IiwianRpIjoiMjJjODJmNmI2ZWRmNGY2NDVkZTk4YzAwNjAzMmE0ZjM0MjQ5OWU2N2M2ZjhlZmEyMmVmM2JiOGFlOWM4ZDVhZjNjZjE3NGFhMWM1ZmY4MDgiLCJpYXQiOjE3ODQxMjk5NjQuMjQzMTY2LCJuYmYiOjE3ODQxMjk5NjQuMjQzMTcsImV4cCI6MjA5OTc0OTE2NC4yMDQxOTQsInN1YiI6IjM0OTQ5MiIsInNjb3BlcyI6WyIqIiwid3JpdGUtYWxsIiwicmVhZC1hbGwiLCJidWNrZXRzIiwid3JpdGUtYnVja2V0cyIsInJlYWQtYnVja2V0cyIsImF1ZGlvcyIsIndyaXRlLWF1ZGlvcyIsInJlYWQtYXVkaW9zIiwiY2hhbm5lbHMiLCJ3cml0ZS1jaGFubmVscyIsInJlYWQtY2hhbm5lbHMiLCJiYXNlLXByb2plY3RzIiwid3JpdGUtYmFzZS1wcm9qZWN0cyIsInJlYWQtYmFzZS1wcm9qZWN0cyIsInVjZiIsIndyaXRlLXVjZiIsInJlYWQtdWNmIiwiZGVsZXRlLXVjZiIsImJtLXByb2plY3RzIiwiYm0tY3MtcHJvamVjdHMiLCJ3cml0ZS1ibS1jcy1wcm9qZWN0cyIsInJlYWQtYm0tY3MtcHJvamVjdHMiLCJibS1iZC1wcm9qZWN0cyIsIndyaXRlLWJtLWJkLXByb2plY3RzIiwicmVhZC1ibS1iZC1wcm9qZWN0cyIsImZpbGVzY2FubmluZyIsIndyaXRlLWZpbGVzY2FubmluZyIsInJlYWQtZmlsZXNjYW5uaW5nIiwibWV0YWRhdGEiLCJyZWFkLW1ldGFkYXRhIl19.M_scy8pgSQPyNjqLndbpGRaeY-91pPNNzS9_FLYYWxaWNHY_L8mQxqDRFaCQ-VdcO-UOiHIK6UHxhGnFVeadZwBco90JdMY6wGXuwfjfUpKWc3MY-PFJGcJfKZEiy6JQbwcdaHuRnnDcv6E1WfAiL_vn5VMXCVCxVRz6W640LKh8OffUXS0Gpt0tYllYkZP9SKGBh4BEXWYQvYpcQMLnXBUIJKof-qRvUgxqLYVYgLJRdw9JFH7vnFS5dBUoesw5xPcN5A7Mrcr7caMMRV_ktiGNiMFZieTEqMxk-tgeOCLXfmMkz6q65LWmiYfmqaAVCRN3JkGKX3rH-QZ-Rv6e9BT3NgbKK76G6kEw1F86yI0nzHSesQoXfMxPzgpweqv_0RIy4vNjv1-0FqbEwLt5jniO-uBE1p3O0lHeMdQJLzBeEKGxdFSgaO5a6BnteXDwEVfzJUiWp1hjV28XnmOiPAu9ykVswPAMHe4TJFKoJL2DmrAafWNqbzYMSKEupUwTD7qnMf6hnMgjuMLkOuElIXVAwPB3OxXXkKuLGc1nTuyNSJ1SQMF36nUltkhx7ROnBrkslhQBXUKnufJDRwbeSVMXX4CtNgr-bNbySsRI0FLUh_qpfnFljfKqv2lIOBCC-GHq73dhC0OJb8S-kYwKBWbXCzOXyDOUw-JanxEXjDk"
BASE = "https://api-eu-west-1.acrcloud.com/api/fs-containers/33436"
HEADERS = {"Accept": "application/json", "Authorization": f"Bearer {TOKEN}"}

# Download a Suno track directly from HF file server
# The dataset has parquet files, let's get a direct audio URL from the rows API
print("Fetching Suno track URL from HF API...")
r = requests.get(
    "https://datasets-server.huggingface.co/rows",
    params={"dataset": "humair025/suno-audio", "config": "default", "split": "train", "offset": 0, "length": 1},
    timeout=30,
)
data = r.json()
row = data["rows"][0]["row"]
audio_info = row.get("audio", {})
print(f"Title: {row.get('title', '?')}")

# The audio field should have a 'src' URL
audio_src = None
if isinstance(audio_info, dict):
    audio_src = audio_info.get("src")
    print(f"Audio src: {audio_src[:100] if audio_src else 'none'}...")

if not audio_src:
    # Try to get from the parquet file directly
    print("No direct URL, trying parquet approach...")
    # Get parquet file info
    r2 = requests.get(
        "https://datasets-server.huggingface.co/parquet",
        params={"dataset": "humair025/suno-audio"},
        timeout=10,
    )
    pdata = r2.json()
    parquet_files = pdata.get("parquet_files", [])
    if parquet_files:
        print(f"Found {len(parquet_files)} parquet files")
        print(f"First: {parquet_files[0].get('filename')} ({parquet_files[0].get('size', 0) / 1024 / 1024:.0f} MB)")

    # Alternative: try a public Suno song URL
    print("\nTrying public Suno content...")
    # Suno songs are at cdn1.suno.ai/[uuid].mp3
    # Let's try a known public track
    test_urls = [
        "https://cdn1.suno.ai/2cfe0e65-5e04-4ff2-a09c-4cf0a67f5880.mp3",
        "https://cdn1.suno.ai/da16d0ec-4b64-4834-bc6d-9a7131b5f831.mp3",
    ]
    
    for url in test_urls:
        print(f"\nTrying: {url}")
        try:
            r3 = requests.get(url, timeout=10, stream=True)
            if r3.status_code == 200:
                audio_data = r3.content
                print(f"  Downloaded {len(audio_data)} bytes")
                audio_src = "found"
                
                # Upload to ACR
                print("  Uploading to ACR...")
                files = {"file": ("suno_song.mp3", audio_data, "audio/mpeg")}
                fdata = {"data_type": "audio"}
                r4 = requests.post(f"{BASE}/files", headers=HEADERS, files=files, data=fdata)
                print(f"  Upload: {r4.status_code}")
                if r4.status_code == 200:
                    file_id = r4.json().get("data", {}).get("id")
                    print(f"  File ID: {file_id}")
                    
                    # Poll
                    for i in range(20):
                        time.sleep(5)
                        r5 = requests.get(f"{BASE}/files/{file_id}", headers=HEADERS)
                        d = r5.json().get("data", [{}])
                        if isinstance(d, list):
                            d = d[0]
                        state = d.get("state", 0)
                        if state == 1:
                            print(f"\n  RESULTS after {(i+1)*5}s:")
                            ai = d.get("results", {}).get("ai_detection", [])
                            for det in ai:
                                print(f"    {det['stem']}: {det['prediction']} ({det['ai_probability']}%) source: {det.get('likely_source')}")
                            break
                        elif state == -1:
                            print(f"  NO RESULTS after {(i+1)*5}s")
                            break
                        else:
                            print(f"  Processing... ({(i+1)*5}s)")
                    break
            else:
                print(f"  HTTP {r3.status_code}")
        except Exception as e:
            print(f"  Error: {e}")
