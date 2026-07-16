"""
Download a real Suno-generated track from Hugging Face and upload to ACR.
This should return AI_GENERATED with high probability.
"""
import requests
import time
from datasets import load_dataset

TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI3IiwianRpIjoiMjJjODJmNmI2ZWRmNGY2NDVkZTk4YzAwNjAzMmE0ZjM0MjQ5OWU2N2M2ZjhlZmEyMmVmM2JiOGFlOWM4ZDVhZjNjZjE3NGFhMWM1ZmY4MDgiLCJpYXQiOjE3ODQxMjk5NjQuMjQzMTY2LCJuYmYiOjE3ODQxMjk5NjQuMjQzMTcsImV4cCI6MjA5OTc0OTE2NC4yMDQxOTQsInN1YiI6IjM0OTQ5MiIsInNjb3BlcyI6WyIqIiwid3JpdGUtYWxsIiwicmVhZC1hbGwiLCJidWNrZXRzIiwid3JpdGUtYnVja2V0cyIsInJlYWQtYnVja2V0cyIsImF1ZGlvcyIsIndyaXRlLWF1ZGlvcyIsInJlYWQtYXVkaW9zIiwiY2hhbm5lbHMiLCJ3cml0ZS1jaGFubmVscyIsInJlYWQtY2hhbm5lbHMiLCJiYXNlLXByb2plY3RzIiwid3JpdGUtYmFzZS1wcm9qZWN0cyIsInJlYWQtYmFzZS1wcm9qZWN0cyIsInVjZiIsIndyaXRlLXVjZiIsInJlYWQtdWNmIiwiZGVsZXRlLXVjZiIsImJtLXByb2plY3RzIiwiYm0tY3MtcHJvamVjdHMiLCJ3cml0ZS1ibS1jcy1wcm9qZWN0cyIsInJlYWQtYm0tY3MtcHJvamVjdHMiLCJibS1iZC1wcm9qZWN0cyIsIndyaXRlLWJtLWJkLXByb2plY3RzIiwicmVhZC1ibS1iZC1wcm9qZWN0cyIsImZpbGVzY2FubmluZyIsIndyaXRlLWZpbGVzY2FubmluZyIsInJlYWQtZmlsZXNjYW5uaW5nIiwibWV0YWRhdGEiLCJyZWFkLW1ldGFkYXRhIl19.M_scy8pgSQPyNjqLndbpGRaeY-91pPNNzS9_FLYYWxaWNHY_L8mQxqDRFaCQ-VdcO-UOiHIK6UHxhGnFVeadZwBco90JdMY6wGXuwfjfUpKWc3MY-PFJGcJfKZEiy6JQbwcdaHuRnnDcv6E1WfAiL_vn5VMXCVCxVRz6W640LKh8OffUXS0Gpt0tYllYkZP9SKGBh4BEXWYQvYpcQMLnXBUIJKof-qRvUgxqLYVYgLJRdw9JFH7vnFS5dBUoesw5xPcN5A7Mrcr7caMMRV_ktiGNiMFZieTEqMxk-tgeOCLXfmMkz6q65LWmiYfmqaAVCRN3JkGKX3rH-QZ-Rv6e9BT3NgbKK76G6kEw1F86yI0nzHSesQoXfMxPzgpweqv_0RIy4vNjv1-0FqbEwLt5jniO-uBE1p3O0lHeMdQJLzBeEKGxdFSgaO5a6BnteXDwEVfzJUiWp1hjV28XnmOiPAu9ykVswPAMHe4TJFKoJL2DmrAafWNqbzYMSKEupUwTD7qnMf6hnMgjuMLkOuElIXVAwPB3OxXXkKuLGc1nTuyNSJ1SQMF36nUltkhx7ROnBrkslhQBXUKnufJDRwbeSVMXX4CtNgr-bNbySsRI0FLUh_qpfnFljfKqv2lIOBCC-GHq73dhC0OJb8S-kYwKBWbXCzOXyDOUw-JanxEXjDk"
BASE = "https://api-eu-west-1.acrcloud.com/api/fs-containers/33436"
HEADERS = {"Accept": "application/json", "Authorization": f"Bearer {TOKEN}"}

# Get a Suno track from Hugging Face
print("Loading Suno dataset from Hugging Face (streaming)...")
ds = load_dataset("humair025/suno-audio", split="train", streaming=True)

# Get the first track
row = next(iter(ds))
print(f"Track: {row.get('title', 'unknown')}")
print(f"Audio: {row.get('audio', {}).keys() if 'audio' in row else 'no audio field'}")

# The audio field should have 'path', 'array', 'sampling_rate'
audio = row.get("audio", {})
if audio:
    import numpy as np
    import struct
    import io

    arr = np.array(audio["array"])
    sr = audio["sampling_rate"]
    print(f"Sample rate: {sr}, Duration: {len(arr)/sr:.1f}s, Shape: {arr.shape}")

    # Convert to WAV
    # Normalize to int16
    arr_int16 = (arr * 32767).astype(np.int16)
    
    wav_buf = io.BytesIO()
    wav_buf.write(b"RIFF")
    data_size = len(arr_int16) * 2
    wav_buf.write(struct.pack("<I", 36 + data_size))
    wav_buf.write(b"WAVE")
    wav_buf.write(b"fmt ")
    wav_buf.write(struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16))
    wav_buf.write(b"data")
    wav_buf.write(struct.pack("<I", data_size))
    wav_buf.write(arr_int16.tobytes())
    
    wav_data = wav_buf.getvalue()
    print(f"WAV size: {len(wav_data)} bytes ({len(wav_data)/1024:.0f} KB)")

    # Upload to ACR
    print("\nUploading Suno track to ACR...")
    files = {"file": ("suno_track.wav", wav_data, "audio/wav")}
    data = {"data_type": "audio"}
    
    r = requests.post(f"{BASE}/files", headers=HEADERS, files=files, data=data)
    print(f"Upload: {r.status_code}")
    resp = r.json()
    file_id = resp.get("data", {}).get("id")
    print(f"File ID: {file_id}")

    # Poll
    print("Polling for results...")
    for i in range(30):
        time.sleep(5)
        r2 = requests.get(f"{BASE}/files/{file_id}", headers=HEADERS)
        d = r2.json().get("data", [{}])
        if isinstance(d, list):
            d = d[0]
        state = d.get("state", 0)
        if state == 1:
            print(f"\nRESULTS READY after {(i+1)*5}s!")
            ai = d.get("results", {}).get("ai_detection", [])
            for det in ai:
                print(f"  {det['stem']}: {det['prediction']} ({det['ai_probability']}%) source: {det.get('likely_source')}")
                if det.get("source_probabilities"):
                    for sp in sorted(det["source_probabilities"], key=lambda x: x["probability"], reverse=True)[:3]:
                        print(f"    {sp['source']}: {sp['probability']}%")
            break
        elif state == -1:
            print(f"\nNO RESULTS after {(i+1)*5}s")
            break
        else:
            print(f"  Processing... ({(i+1)*5}s)")
    else:
        print("  Timed out")
else:
    print("No audio data in the dataset row")
