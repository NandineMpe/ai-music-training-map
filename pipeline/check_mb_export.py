import requests

# Check what's in the data directory of the MB export repo
r = requests.get('https://api.github.com/repos/jbcurtin/musicbrainz-db-artist-export/contents/data', timeout=10)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    for item in r.json():
        name = item["name"]
        size = item["size"]
        print(f"  {name} - {size:,} bytes")
