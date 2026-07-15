"""Test both sets of ACRCloud credentials."""
import requests
import time
import hashlib
import hmac
import base64
import struct

# Credentials set 1 (from user)
CREDS = [
    ("OO3AnK9YWPL9EGnh", "DANwQn2sPiMm3ZY6WMTbu6VSj3hadaGq", "User provided"),
    ("5aa990706d6b3744528ee64cc86ae342", "54VvG3x6bti00ubtWtlmQ5QZsc7qJHWICikYT1jU", "Console API"),
]

HOSTS = [
    "https://identify-eu-west-1.acrcloud.com",
    "https://identify-us-west-2.acrcloud.com",
]

# Create tiny WAV
sample_rate = 8000
num_samples = sample_rate
wav_data = b"RIFF"
wav_data += struct.pack("<I", 36 + num_samples * 2)
wav_data += b"WAVE"
wav_data += b"fmt "
wav_data += struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
wav_data += b"data"
wav_data += struct.pack("<I", num_samples * 2)
wav_data += b"\x00" * (num_samples * 2)

for access_key, access_secret, label in CREDS:
    print(f"\n--- {label} ---")
    print(f"    Key: {access_key}")

    for host in HOSTS:
        timestamp = str(int(time.time()))
        string_to_sign = f"POST\n/v1/identify\n{access_key}\naudio\n1\n{timestamp}"
        sign = base64.b64encode(
            hmac.HMAC(access_secret.encode(), string_to_sign.encode(), hashlib.sha1).digest()
        ).decode()

        files = {"sample": ("test.wav", wav_data, "audio/wav")}
        data = {
            "access_key": access_key,
            "sample_bytes": str(len(wav_data)),
            "timestamp": timestamp,
            "signature": sign,
            "data_type": "audio",
            "signature_version": "1",
        }

        try:
            r = requests.post(f"{host}/v1/identify", files=files, data=data, timeout=10)
            result = r.json()
            status = result.get("status", {})
            code = status.get("code")
            msg = status.get("msg")
            print(f"    {host.split('//')[1]}: code={code} msg={msg}")
        except Exception as e:
            print(f"    {host.split('//')[1]}: ERROR {e}")

        time.sleep(0.5)
