"""
Find South African artists in the LAION-DISCO-12M dataset.
Strategy: Search MusicBrainz for artists with country=ZA, then check if they're in our dataset.
Also: look up uncached artists from our dataset that might be South African.
"""
import json
import time
import sys
import requests
from pathlib import Path

CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_FILE = CACHE_DIR / "artist_country_cache.json"
COUNTS_FILE = CACHE_DIR / "artist_track_counts.json"

MB_URL = "https://musicbrainz.org/ws/2/artist/"
HEADERS = {"User-Agent": "AIMusicTrainingMap/1.0 (nandi@augentik.com)"}

# Load data
with open(COUNTS_FILE, "r", encoding="utf-8") as f:
    all_counts = json.load(f)

with open(CACHE_FILE, "r", encoding="utf-8") as f:
    cache = json.load(f)

print(f"Dataset has {len(all_counts):,} artists", flush=True)
print(f"Cache has {len(cache):,} entries", flush=True)

# Strategy 1: Search MusicBrainz for ZA artists and check if they're in our dataset
print("\n[1] Searching MusicBrainz for South African artists...", flush=True)

# Search for artists with country:ZA, paginated
za_found_via_search = []
offsets = range(0, 500, 100)  # Get up to 500 ZA artists from MB

for offset in offsets:
    try:
        r = requests.get(
            MB_URL,
            params={"query": "country:ZA", "fmt": "json", "limit": 100, "offset": offset},
            headers=HEADERS,
            timeout=15,
        )
        if r.status_code == 200:
            data = r.json()
            artists = data.get("artists", [])
            if not artists:
                break
            for a in artists:
                name = a.get("name", "")
                country = a.get("country", "")
                if country == "ZA" and name:
                    # Check if this artist is in our dataset
                    for dataset_name, count in all_counts.items():
                        if dataset_name.lower() == name.lower():
                            za_found_via_search.append((dataset_name, count))
                            # Also cache it
                            cache[name.lower().strip()] = "ZA"
                            break
            print(f"  Offset {offset}: checked {len(artists)} MB artists, found {len(za_found_via_search)} in dataset so far", flush=True)
        else:
            print(f"  HTTP {r.status_code} at offset {offset}", flush=True)
        time.sleep(1.2)
    except Exception as e:
        print(f"  Error: {e}", flush=True)

print(f"\n  Found {len(za_found_via_search)} ZA artists from MB search that are in our dataset", flush=True)

# Strategy 2: Look up uncached artists from our dataset that have South African-sounding names
# or are in common SA genres. Let's just batch-lookup the top uncached artists.
print("\n[2] Looking up uncached artists from dataset...", flush=True)

sorted_artists = sorted(all_counts.items(), key=lambda x: x[1], reverse=True)
uncached = [(name, count) for name, count in sorted_artists if name.lower().strip() not in cache]
print(f"  {len(uncached):,} artists not yet looked up", flush=True)

# Look up the top 200 uncached artists (might find more ZA ones)
new_za = 0
lookups = 0
for name, count in uncached[:200]:
    key = name.lower().strip()
    try:
        r = requests.get(
            MB_URL,
            params={"query": f'artist:"{name}"', "fmt": "json", "limit": 1},
            headers=HEADERS,
            timeout=10,
        )
        if r.status_code == 200:
            data = r.json()
            artists = data.get("artists", [])
            if artists:
                a = artists[0]
                country = a.get("country")
                if not country:
                    area = a.get("area", {})
                    codes = area.get("iso-3166-1-codes", [])
                    if codes:
                        country = codes[0]
                cache[key] = country
                if country == "ZA":
                    new_za += 1
                    print(f"  NEW ZA: {name} ({count} tracks)", flush=True)
            else:
                cache[key] = None
        lookups += 1
        time.sleep(1.1)
        if lookups % 50 == 0:
            print(f"  Progress: {lookups}/200 looked up, {new_za} new ZA found", flush=True)
    except Exception as e:
        print(f"  Error for {name}: {e}", flush=True)

# Save cache
with open(CACHE_FILE, "w", encoding="utf-8") as f:
    json.dump(cache, f, ensure_ascii=False)

# Summary
all_za = [(name, count) for name, count in all_counts.items() if cache.get(name.lower().strip()) == "ZA"]
all_za.sort(key=lambda x: x[1], reverse=True)

print(f"\n{'='*60}", flush=True)
print(f"TOTAL South African artists in LAION-DISCO-12M: {len(all_za)}", flush=True)
print(f"Total tracks: {sum(c for _, c in all_za):,}", flush=True)
print(f"\nTop 30 SA artists by tracks scraped:", flush=True)
for name, count in all_za[:30]:
    print(f"  {name}: {count} tracks", flush=True)
