"""Check ACRCloud account projects to find identification credentials."""
import requests
import os

TOKEN = os.environ.get("ACR_TOKEN", "")

# List base projects (identification projects)
headers = {
    "Accept": "application/json",
    "Authorization": f"Bearer {TOKEN}",
}

print("Checking base projects...")
r = requests.get("https://api-v2.acrcloud.com/api/base-projects", headers=headers)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    projects = data.get("data", [])
    print(f"Projects: {len(projects)}")
    for p in projects:
        print(f"  ID: {p.get('id')}")
        print(f"  Name: {p.get('name')}")
        print(f"  Region: {p.get('region')}")
        print(f"  Access Key: {p.get('access_key')}")
        print(f"  Buckets: {p.get('buckets')}")
        print()
else:
    print(r.text[:500])
