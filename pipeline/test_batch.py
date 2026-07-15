"""Test batch MusicBrainz lookups with the actual pipeline logic."""
import json
import time
import sys
import requests

CACHE_FILE = "pipeline/.cache/artist_country_cache.json"
MB_SEARCH_URL = "https://musicbrainz.org/ws/2/artist/"
MB_USER_AGENT = "AIMusicTrainingMap/1.0 (nandi@augentik.com)"

# Load artist counts from cache
with open("pipeline/.cache/artist_track_counts.json", "r", encoding="utf-8") as f:
    counts = json.load(f)

# Top 20 artists
sorted_artists = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:20]

print("Testing top 20 artist lookups...")
sys.stdout.flush()

results = {}
for name, count in sorted_artists:
    try:
        r = requests.get(
            MB_SEARCH_URL,
            params={"query": f'artist:"{name}"', "fmt": "json", "limit": 1},
            headers={"User-Agent": MB_USER_AGENT},
            timeout=10,
        )
        if r.status_code == 200:
            data = r.json()
            artists = data.get("artists", [])
            if artists:
                country = artists[0].get("country", "?")
                results[name] = country
                print(f"  {name} ({count:,} tracks) -> {country}")
            else:
                print(f"  {name} ({count:,} tracks) -> NO RESULT")
        else:
            print(f"  {name} -> HTTP {r.status_code}")
        sys.stdout.flush()
        time.sleep(1.2)
    except Exception as e:
        print(f"  {name} -> ERROR: {e}")
        sys.stdout.flush()

print(f"\nDone: {len(results)}/20 mapped")
