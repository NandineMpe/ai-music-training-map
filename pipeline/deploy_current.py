"""Deploy whatever we have in the cache right now."""
import json
from pathlib import Path
from collections import defaultdict

OUTPUT_DIR = Path(__file__).parent.parent / "web" / "public" / "data"
ARTISTS_DIR = OUTPUT_DIR / "artists_by_country"
CACHE_DIR = Path(__file__).parent / ".cache"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
ARTISTS_DIR.mkdir(parents=True, exist_ok=True)

# Load caches
with open(CACHE_DIR / "artist_track_counts.json", "r", encoding="utf-8") as f:
    all_counts = json.load(f)

with open(CACHE_DIR / "artist_country_cache.json", "r", encoding="utf-8") as f:
    country_cache = json.load(f)

print(f"Artist counts: {len(all_counts):,}")
print(f"Country cache entries: {len(country_cache):,}")

# Build country data
sorted_artists = sorted(all_counts.items(), key=lambda x: x[1], reverse=True)

country_data = defaultdict(lambda: {"artists": [], "track_count": 0, "artist_count": 0})
unmapped_count = 0

for name, count in sorted_artists:
    key = name.lower().strip()
    country = country_cache.get(key)
    if country:
        country_data[country]["artists"].append({"name": name, "track_count": count})
        country_data[country]["track_count"] += count
        country_data[country]["artist_count"] += 1
    else:
        unmapped_count += 1

for country in country_data.values():
    country["artists"].sort(key=lambda a: a["track_count"], reverse=True)

# Write summary
summary = []
for code, data in country_data.items():
    summary.append({
        "country_code": code,
        "track_count": data["track_count"],
        "artist_count": data["artist_count"],
        "top_artists": [a["name"] for a in data["artists"][:5]],
    })
summary.sort(key=lambda x: x["track_count"], reverse=True)

with open(OUTPUT_DIR / "country_stats.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)

# Write per-country files
for old_file in ARTISTS_DIR.glob("*.json"):
    old_file.unlink()

for code, data in country_data.items():
    with open(ARTISTS_DIR / f"{code}.json", "w", encoding="utf-8") as f:
        json.dump({
            "country_code": code,
            "artist_count": data["artist_count"],
            "track_count": data["track_count"],
            "artists": data["artists"],
        }, f, ensure_ascii=False, indent=2)

mapped_tracks = sum(s["track_count"] for s in summary)
total = sum(all_counts.values())

print(f"\nOutput written!")
print(f"Countries: {len(summary)}")
print(f"Artists mapped: {sum(s['artist_count'] for s in summary):,}")
print(f"Tracks mapped: {mapped_tracks:,} / {total:,} ({mapped_tracks/total*100:.1f}%)")
print(f"\nTop 10 countries:")
for i, s in enumerate(summary[:10], 1):
    print(f"  {i}. {s['country_code']}: {s['track_count']:,} tracks, {s['artist_count']:,} artists")
    print(f"     Top: {', '.join(s['top_artists'][:3])}")
