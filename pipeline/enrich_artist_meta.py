"""
Enrich artist data with metadata from MusicBrainz:
- Total recordings count (to calculate % inclusion)
- Record label(s)
- Type (group/person)

Start with ZA artists, then can expand to others.
"""
import json
import time
import requests
from pathlib import Path

CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_FILE = CACHE_DIR / "artist_country_cache.json"
COUNTS_FILE = CACHE_DIR / "artist_track_counts.json"
META_FILE = CACHE_DIR / "artist_meta_cache.json"

MB_URL = "https://musicbrainz.org/ws/2/artist/"
HEADERS = {"User-Agent": "AIMusicTrainingMap/1.0 (nandi@augentik.com)"}

# Load data
with open(COUNTS_FILE, "r", encoding="utf-8") as f:
    all_counts = json.load(f)

with open(CACHE_FILE, "r", encoding="utf-8") as f:
    country_cache = json.load(f)

# Load or create meta cache
if META_FILE.exists():
    with open(META_FILE, "r", encoding="utf-8") as f:
        meta_cache = json.load(f)
else:
    meta_cache = {}

# Get ZA artists
za_artists = [(name, count) for name, count in all_counts.items()
              if country_cache.get(name.lower().strip()) == "ZA"]
za_artists.sort(key=lambda x: x[1], reverse=True)

print(f"ZA artists to enrich: {len(za_artists)}", flush=True)
already_cached = sum(1 for name, _ in za_artists if name.lower().strip() in meta_cache)
print(f"Already cached: {already_cached}", flush=True)
to_fetch = [(n, c) for n, c in za_artists if n.lower().strip() not in meta_cache]
print(f"To fetch: {len(to_fetch)}", flush=True)

fetched = 0
for name, track_count in to_fetch:
    key = name.lower().strip()

    try:
        # Search for the artist
        r = requests.get(
            MB_URL,
            params={"query": f'artist:"{name}" AND country:ZA', "fmt": "json", "limit": 1},
            headers=HEADERS,
            timeout=10,
        )

        if r.status_code != 200:
            time.sleep(2)
            continue

        data = r.json()
        artists = data.get("artists", [])

        if not artists:
            meta_cache[key] = {"total_recordings": None, "label": None, "type": None}
            fetched += 1
            time.sleep(1.1)
            continue

        artist = artists[0]
        mbid = artist.get("id")
        artist_type = artist.get("type", "Unknown")

        # Get recording count and label from artist details
        total_recordings = None
        label = None

        if mbid:
            # Get recording count
            r2 = requests.get(
                f"https://musicbrainz.org/ws/2/recording/",
                params={"artist": mbid, "fmt": "json", "limit": 1},
                headers=HEADERS,
                timeout=10,
            )
            if r2.status_code == 200:
                rec_data = r2.json()
                total_recordings = rec_data.get("recording-count", 0)

            time.sleep(1.1)

            # Get label from releases
            r3 = requests.get(
                f"https://musicbrainz.org/ws/2/release/",
                params={"artist": mbid, "fmt": "json", "limit": 5, "inc": "labels"},
                headers=HEADERS,
                timeout=10,
            )
            if r3.status_code == 200:
                rel_data = r3.json()
                releases = rel_data.get("releases", [])
                labels_found = set()
                for release in releases:
                    for li in release.get("label-info", []):
                        lbl = li.get("label", {})
                        if lbl and lbl.get("name"):
                            labels_found.add(lbl["name"])
                if labels_found:
                    # Pick the most common/first label
                    label = ", ".join(list(labels_found)[:2])
                else:
                    label = "Independent"

            time.sleep(1.1)

        meta_cache[key] = {
            "total_recordings": total_recordings,
            "label": label,
            "type": artist_type,
        }

        fetched += 1
        pct_included = (track_count / total_recordings * 100) if total_recordings and total_recordings > 0 else None
        pct_str = f"{pct_included:.0f}%" if pct_included else "?"

        print(f"  {name}: {track_count} in dataset / {total_recordings or '?'} total ({pct_str}) | {label or 'Unknown'} | {artist_type}", flush=True)

        if fetched % 20 == 0:
            # Save periodically
            with open(META_FILE, "w", encoding="utf-8") as f:
                json.dump(meta_cache, f, ensure_ascii=False)
            print(f"  --- Saved ({fetched}/{len(to_fetch)}) ---", flush=True)

    except Exception as e:
        print(f"  ERROR: {name} -> {e}", flush=True)
        time.sleep(2)

# Final save
with open(META_FILE, "w", encoding="utf-8") as f:
    json.dump(meta_cache, f, ensure_ascii=False)

print(f"\nDone: enriched {fetched} artists", flush=True)
print(f"Meta cache now has {len(meta_cache)} entries", flush=True)
