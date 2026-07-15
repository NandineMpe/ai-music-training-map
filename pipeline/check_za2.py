import json
from pathlib import Path

CACHE_DIR = Path(__file__).parent / ".cache"

with open(CACHE_DIR / "artist_track_counts.json", "r", encoding="utf-8") as f:
    counts = json.load(f)

with open(CACHE_DIR / "artist_country_cache.json", "r", encoding="utf-8") as f:
    cache = json.load(f)

# Check ZA artists in cache
za_artists = []
for key, country in cache.items():
    if country == "ZA":
        # Find the original-case name in counts
        for name, count in counts.items():
            if name.lower().strip() == key:
                za_artists.append((name, count))
                break

za_artists.sort(key=lambda x: x[1], reverse=True)
print(f"South African artists in cache with tracks: {len(za_artists)}")
for name, count in za_artists[:30]:
    print(f"  {name}: {count} tracks")
