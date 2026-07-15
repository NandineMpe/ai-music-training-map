"""
Step 1: Fetch country mappings from GlobalDISCO via HuggingFace Datasets API.
Uses the REST API to fetch only text columns without downloading 264GB of audio.

GlobalDISCO has ~73K rows. Each row has:
- artist_id (numeric)
- country (full country name from MusicBrainz)
- laion_song_ids (semicolon-separated YouTube video IDs linking to LAION-DISCO-12M)
"""

import json
import time
import requests
from pathlib import Path
from tqdm import tqdm

CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)
OUTPUT = CACHE_DIR / "global_disco_countries.json"

BASE_URL = "https://datasets-server.huggingface.co"
DATASET = "disco-eth/GlobalDISCO"

def fetch_rows(offset=0, length=100):
    url = f"{BASE_URL}/rows"
    params = {
        "dataset": DATASET,
        "config": "default",
        "split": "train",
        "offset": offset,
        "length": length,
    }
    resp = requests.get(url, params=params, timeout=60)
    resp.raise_for_status()
    return resp.json()


print("=" * 60)
print("Step 1: Fetching GlobalDISCO country mappings")
print("=" * 60)
print("Using HuggingFace Datasets Server API (no audio download)")
print()

# First get the total count
info_resp = requests.get(f"{BASE_URL}/size", params={"dataset": DATASET}, timeout=30)
info = info_resp.json()
splits = info.get("size", {}).get("splits", [])
total_rows = 0
for s in splits:
    if s.get("split") == "train":
        total_rows = s.get("num_rows") or s.get("estimated_num_rows", 73000)
        break

if not total_rows:
    total_rows = 73000  # Fallback estimate

print(f"Total rows to fetch: {total_rows:,}")

# Fetch all rows
# song_id (YouTube video ID) -> country
song_country_map = {}
# artist_id (GlobalDISCO numeric ID) -> country
artist_id_country = {}
# Also collect artist_id -> list of laion_song_ids for later reference
batch_size = 100
errors = 0
fetched = 0

for offset in tqdm(range(0, total_rows, batch_size), desc="Fetching GlobalDISCO"):
    try:
        result = fetch_rows(offset=offset, length=batch_size)
        rows = result.get("rows", [])
        
        if not rows:
            print(f"\n  No more rows at offset {offset}, stopping.")
            break
        
        for item in rows:
            row = item.get("row", {})
            artist_id = row.get("artist_id")
            country = row.get("country", "")
            laion_ids_str = row.get("laion_song_ids", "")
            
            if not country:
                continue
                
            # Normalize country name
            country = country.strip()
            
            if artist_id is not None:
                artist_id_country[str(artist_id)] = country
            
            # Parse laion_song_ids (semicolon-separated YouTube video IDs)
            if laion_ids_str and isinstance(laion_ids_str, str):
                song_ids = [s.strip() for s in laion_ids_str.split(";") if s.strip()]
                for sid in song_ids:
                    song_country_map[sid] = country
        
        fetched += len(rows)
        
        # Small delay to be respectful to the API
        time.sleep(0.05)
        
    except requests.exceptions.HTTPError as e:
        errors += 1
        if e.response and e.response.status_code == 404:
            print(f"\n  404 at offset {offset}, likely end of data.")
            break
        if errors > 20:
            print(f"\n  Too many errors ({errors}), stopping.")
            break
        time.sleep(3)
    except Exception as e:
        errors += 1
        print(f"\n  Error at offset {offset}: {type(e).__name__}: {e}")
        if errors > 20:
            break
        time.sleep(3)

print(f"\nResults:")
print(f"  Rows fetched: {fetched:,}")
print(f"  Song->country mappings: {len(song_country_map):,}")
print(f"  Artist IDs with country: {len(artist_id_country):,}")
print(f"  Unique countries: {len(set(song_country_map.values()))}")
print(f"  Errors: {errors}")

# Show country distribution
from collections import Counter
country_counts = Counter(song_country_map.values())
print(f"\n  Top 15 countries by song count in GlobalDISCO:")
for country, count in country_counts.most_common(15):
    print(f"    {country}: {count:,} songs")

# Save
with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump({
        "song_country_map": song_country_map,
        "artist_id_country": artist_id_country,
    }, f)

print(f"\nSaved to {OUTPUT}")
print(f"File size: {OUTPUT.stat().st_size / 1024 / 1024:.1f} MB")
