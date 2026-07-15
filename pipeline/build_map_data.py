"""
Build real map data from LAION-DISCO-12M + MusicBrainz country lookups.

Strategy:
1. Load LAION-DISCO-12M (already cached from previous runs)
2. Count tracks per artist (860K unique artists)
3. For the top N artists by track count, look up country via MusicBrainz API
4. Output JSON for the map

The top 10,000 artists cover the vast majority of tracks.
At 1 req/sec that's ~3 hours.
Results are cached between runs so we can build incrementally.
"""

import json
import time
import os
from pathlib import Path
from collections import defaultdict

import requests
import pandas as pd
from datasets import load_dataset

OUTPUT_DIR = Path(__file__).parent.parent / "web" / "public" / "data"
ARTISTS_DIR = OUTPUT_DIR / "artists_by_country"
CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_FILE = CACHE_DIR / "artist_country_cache.json"
ARTIST_COUNTS_CACHE = CACHE_DIR / "artist_track_counts.json"

MB_SEARCH_URL = "https://musicbrainz.org/ws/2/artist/"
MB_USER_AGENT = "AIMusicTrainingMap/1.0 (nandi@augentik.com)"

# How many top artists to look up (by track count)
# Top 10K covers most of the dataset's track volume
MAX_ARTISTS_TO_LOOKUP = 10000


def load_cache():
    if CACHE_FILE.exists():
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)


def lookup_artist_country(artist_name, cache):
    """Look up artist country via MusicBrainz API. Returns ISO2 code or None."""
    key = artist_name.lower().strip()
    if key in cache:
        return cache[key]

    try:
        r = requests.get(
            MB_SEARCH_URL,
            params={"query": f'artist:"{artist_name}"', "fmt": "json", "limit": 1},
            headers={"User-Agent": MB_USER_AGENT},
            timeout=10,
        )

        if r.status_code == 503:
            # Rate limited, wait and retry
            time.sleep(2)
            return lookup_artist_country(artist_name, cache)

        if r.status_code != 200:
            cache[key] = None
            return None

        data = r.json()
        artists = data.get("artists", [])

        if artists:
            artist = artists[0]
            country = artist.get("country")
            if country:
                cache[key] = country
                return country

            # Try area
            area = artist.get("area", {})
            if area:
                iso_codes = area.get("iso-3166-1-codes", [])
                if iso_codes:
                    cache[key] = iso_codes[0]
                    return iso_codes[0]

        cache[key] = None
        return None

    except Exception as e:
        print(f"       Error for '{artist_name}': {e}")
        return None


def get_artist_track_counts():
    """Load or compute artist track counts from LAION-DISCO-12M."""
    if ARTIST_COUNTS_CACHE.exists():
        print("       Loading cached artist track counts...")
        with open(ARTIST_COUNTS_CACHE, "r", encoding="utf-8") as f:
            return json.load(f)

    print("       Loading LAION-DISCO-12M from Hugging Face...")
    ds = load_dataset("laion/LAION-DISCO-12M", split="train")
    print(f"       Loaded {len(ds):,} tracks, converting to pandas...")
    df = ds.to_pandas()

    print("       Counting tracks per artist...")
    artist_series = df["artist_names"].explode().dropna()
    artist_series = artist_series[artist_series.str.strip() != ""]
    artist_series = artist_series.str.strip()

    counts = artist_series.value_counts()
    result = {name: int(count) for name, count in counts.items()}

    # Cache for next run
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(ARTIST_COUNTS_CACHE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)

    print(f"       Cached {len(result):,} artist counts")
    return result


def main():
    print("=" * 60)
    print("Building real map data")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ARTISTS_DIR.mkdir(parents=True, exist_ok=True)

    # --- Step 1: Get artist track counts ---
    print("\n[1/3] Getting artist track counts...")
    artist_track_counts = get_artist_track_counts()
    print(f"       {len(artist_track_counts):,} unique artists")
    print(f"       {sum(artist_track_counts.values()):,} total track-artist pairs")

    # Sort by count, get top N
    sorted_artists = sorted(artist_track_counts.items(), key=lambda x: x[1], reverse=True)

    print(f"\n       Top 10 artists:")
    for name, count in sorted_artists[:10]:
        print(f"         {name}: {count:,}")

    artists_to_lookup = sorted_artists[:MAX_ARTISTS_TO_LOOKUP]
    print(f"\n       Will look up top {len(artists_to_lookup):,} artists")
    print(f"       These cover {sum(c for _, c in artists_to_lookup):,} track-artist pairs")

    # --- Step 2: Look up countries ---
    print("\n[2/3] Looking up artist countries via MusicBrainz...")
    cache = load_cache()
    cached_count = sum(1 for name, _ in artists_to_lookup if name.lower().strip() in cache)
    to_lookup = len(artists_to_lookup) - cached_count
    print(f"       {cached_count:,} already cached, {to_lookup:,} to look up")

    if to_lookup > 0:
        print(f"       Estimated time: {to_lookup} seconds (~{to_lookup // 60} minutes)")
        print(f"       Progress will be saved every 100 lookups.")

    country_map = {}
    lookups_done = 0

    for i, (name, count) in enumerate(artists_to_lookup):
        country = lookup_artist_country(name, cache)
        if country:
            country_map[name] = country

        # Rate limit only for new lookups
        if name.lower().strip() not in cache:
            lookups_done += 1
            time.sleep(1.1)

            if lookups_done % 100 == 0:
                save_cache(cache)
                pct = lookups_done / to_lookup * 100 if to_lookup > 0 else 100
                print(f"       Progress: {lookups_done:,}/{to_lookup:,} ({pct:.0f}%) - {len(country_map):,} mapped")
        else:
            if cache.get(name.lower().strip()):
                country_map[name] = cache[name.lower().strip()]

    save_cache(cache)
    print(f"       Done: {len(country_map):,} artists mapped to countries")

    # --- Step 3: Aggregate and output ---
    print("\n[3/3] Writing output...")

    country_data = defaultdict(lambda: {"artists": [], "track_count": 0, "artist_count": 0})
    unmapped_artists = []

    for name, count in sorted_artists:
        country = country_map.get(name)
        if country:
            country_data[country]["artists"].append({"name": name, "track_count": count})
            country_data[country]["track_count"] += count
            country_data[country]["artist_count"] += 1
        else:
            unmapped_artists.append({"name": name, "track_count": count})

    # Sort artists within each country
    for country in country_data.values():
        country["artists"].sort(key=lambda a: a["track_count"], reverse=True)

    # Write country_stats.json
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

    # Unmapped summary
    unmapped_artists.sort(key=lambda a: a["track_count"], reverse=True)
    with open(ARTISTS_DIR / "UNMAPPED.json", "w", encoding="utf-8") as f:
        json.dump({
            "country_code": "UNMAPPED",
            "artist_count": len(unmapped_artists),
            "track_count": sum(a["track_count"] for a in unmapped_artists),
            "artists": unmapped_artists[:2000],
        }, f, ensure_ascii=False, indent=2)

    # Final report
    mapped_tracks = sum(s["track_count"] for s in summary)
    total_tracks = sum(artist_track_counts.values())

    print(f"\n       DONE!")
    print(f"       Countries: {len(summary)}")
    print(f"       Artists mapped: {sum(s['artist_count'] for s in summary):,}")
    print(f"       Tracks mapped: {mapped_tracks:,} / {total_tracks:,} ({mapped_tracks/total_tracks*100:.1f}%)")
    print(f"\n       Top 10 countries:")
    for i, s in enumerate(summary[:10], 1):
        print(f"       {i:2}. {s['country_code']}: {s['track_count']:,} tracks, {s['artist_count']:,} artists")
    print(f"\n       Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
