"""Test MusicBrainz API."""
import requests
import time

url = "https://musicbrainz.org/ws/2/artist/"
headers = {"User-Agent": "AIMusicMap/1.0 (nandi@augentik.com)"}

tests = ["Johann Sebastian Bach", "Burna Boy", "Black Coffee", "Taylor Swift"]

for name in tests:
    r = requests.get(
        url,
        params={"query": f'artist:"{name}"', "fmt": "json", "limit": 1},
        headers=headers,
        timeout=10,
    )
    print(f"{name}: status={r.status_code}")
    if r.status_code == 200:
        data = r.json()
        artists = data.get("artists", [])
        if artists:
            a = artists[0]
            print(f"  Found: {a.get('name')} | Country: {a.get('country')} | Score: {a.get('score')}")
        else:
            print("  No results")
    time.sleep(1.2)
