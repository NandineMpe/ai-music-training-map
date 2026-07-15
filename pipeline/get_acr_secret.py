"""Get the access_secret for the ACRCloud project."""
import requests
import os

TOKEN = os.environ.get("ACR_TOKEN", "")

headers = {
    "Accept": "application/json",
    "Authorization": f"Bearer {TOKEN}",
}

# Get project details
r = requests.get("https://api-v2.acrcloud.com/api/base-projects/106979", headers=headers)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    p = data.get("data", {})
    print(f"Name: {p.get('name')}")
    print(f"Access Key: {p.get('access_key')}")
    print(f"Access Secret: {p.get('access_secret')}")
    print(f"Host: {p.get('host')}")
    # Print all keys
    for k, v in p.items():
        if k not in ('buckets',):
            print(f"  {k}: {v}")
else:
    print(r.text[:500])
