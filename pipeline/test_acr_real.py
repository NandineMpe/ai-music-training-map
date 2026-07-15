"""
Test ACRCloud with a real audio file to see what actually happens.
Download a short sample and try to identify it.
"""
import requests
import time
import hashlib
import hmac
import base64
import struct
import math

# Credentials from Console API
ACCESS_KEY = "5aa990706d6b3744528ee64cc86ae342"
ACCESS_SECRET = "54VvG3x6bti00ubtWtlmQ5QZsc7qJHWICikYT1jU"
HOST = "https://identify-eu-west-1.acrcloud.com"

# Generate a WAV with a 440Hz tone (not silence)
sample_rate = 16000
duration = 5  # seconds
num_samples = sample_rate * duration
samples = []
for i in range(num_samples):
    t = i / sample_rate
    # 440Hz sine wave
    value = int(32767 * 0.8 * math.sin(2 * math.pi * 440 * t))
    samples.append(struct.pack("<h", value))

wav_data = b"RIFF"
wav_data += struct.pack("<I", 36 + num_samples * 2)
wav_data += b"WAVE"
wav_data += b"fmt "
wav_data += struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
wav_data += b"data"
wav_data += struct.pack("<I", num_samples * 2)
wav_data += b"".join(samples)

print(f"Generated {duration}s WAV, {len(wav_data)} bytes")

# Sign request
timestamp = str(int(time.time()))
string_to_sign = f"POST\n/v1/identify\n{ACCESS_KEY}\naudio\n1\n{timestamp}"
sign = base64.b64encode(
    hmac.HMAC(ACCESS_SECRET.encode(), string_to_sign.encode(), hashlib.sha1).digest()
).decode()

# Send
files = {"sample": ("test.wav", wav_data, "audio/wav")}
data = {
    "access_key": ACCESS_KEY,
    "sample_bytes": str(len(wav_data)),
    "timestamp": timestamp,
    "signature": sign,
    "data_type": "audio",
    "signature_version": "1",
}

print(f"Sending to {HOST}/v1/identify...")
print(f"Access key: {ACCESS_KEY}")
print(f"Timestamp: {timestamp}")
print(f"Signature: {sign[:20]}...")

r = requests.post(f"{HOST}/v1/identify", files=files, data=data, timeout=15)
print(f"\nHTTP Status: {r.status_code}")
print(f"Response: {r.text[:500]}")

# Also try with the user's key
print("\n\n--- Testing with user-provided key ---")
ACCESS_KEY2 = "OO3AnK9YWPL9EGnh"
ACCESS_SECRET2 = "DANwQn2sPiMm3ZY6WMTbu6VSj3hadaGq"

timestamp2 = str(int(time.time()))
string_to_sign2 = f"POST\n/v1/identify\n{ACCESS_KEY2}\naudio\n1\n{timestamp2}"
sign2 = base64.b64encode(
    hmac.HMAC(ACCESS_SECRET2.encode(), string_to_sign2.encode(), hashlib.sha1).digest()
).decode()

data2 = {
    "access_key": ACCESS_KEY2,
    "sample_bytes": str(len(wav_data)),
    "timestamp": timestamp2,
    "signature": sign2,
    "data_type": "audio",
    "signature_version": "1",
}

r2 = requests.post(f"{HOST}/v1/identify", files={"sample": ("test.wav", wav_data, "audio/wav")}, data=data2, timeout=15)
print(f"HTTP Status: {r2.status_code}")
print(f"Response: {r2.text[:500]}")
