"""Test ACRCloud credentials against different hosts."""
import requests
import time
import hashlib
import hmac
import base64

ACCESS_KEY = "OO3AnK9YWPL9EGnh"
ACCESS_SECRET = "DANwQn2sPiMm3ZY6WMTbu6VSj3hadaGq"

HOSTS = [
    "https://identify-eu-west-1.acrcloud.com",
    "https://identify-us-west-2.acrcloud.com",
    "https://identify-ap-southeast-1.acrcloud.com",
    "https://eu-west-1.api.acrcloud.com",
    "https://us-west-2.api.acrcloud.com",
]

# Create a tiny WAV
import struct
sample_rate = 8000
num_samples = sample_rate  # 1 sec silence
wav_data = b"RIFF"
wav_data += struct.pack("<I", 36 + num_samples * 2)
wav_data += b"WAVE"
wav_data += b"fmt "
wav_data += struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
wav_data += b"data"
wav_data += struct.pack("<I", num_samples * 2)
wav_data += b"\x00" * (num_samples * 2)

for host in HOSTS:
    http_method = "POST"
    http_uri = "/v1/identify"
    data_type = "audio"
    signature_version = "1"
    timestamp = str(int(time.time()))

    string_to_sign = f"{http_method}\n{http_uri}\n{ACCESS_KEY}\n{data_type}\n{signature_version}\n{timestamp}"
    sign = base64.b64encode(
        hmac.HMAC(ACCESS_SECRET.encode(), string_to_sign.encode(), hashlib.sha1).digest()
    ).decode()

    files = {"sample": ("test.wav", wav_data, "audio/wav")}
    data = {
        "access_key": ACCESS_KEY,
        "sample_bytes": str(len(wav_data)),
        "timestamp": timestamp,
        "signature": sign,
        "data_type": data_type,
        "signature_version": signature_version,
    }

    try:
        r = requests.post(f"{host}/v1/identify", files=files, data=data, timeout=10)
        result = r.json()
        status = result.get("status", {})
        print(f"{host}: code={status.get('code')} msg={status.get('msg')}")
    except Exception as e:
        print(f"{host}: ERROR {e}")

    time.sleep(0.5)
