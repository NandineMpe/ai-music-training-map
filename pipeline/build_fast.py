"""
Fast build: look up top 2000 artists from LAION-DISCO-12M via MusicBrainz.
Outputs real data for the map. Runs in ~35 minutes.
"""

import json
import time
import sys
import os
from pathlib import Path
from collections import defaultdict

import requests

OUTPUT_DIR = Path(__file__).parent.parent / "web" / "public" / "data"
ARTISTS_DIR = OUTPUT_DIR / "artists_by_country"
CACHE_DIR = Path(__file__).parent / ".cache"
COUNTRY_CACHE_FILE = CACHE_DIR / "artist_country_cache.json"
COUNTS_FILE = CACHE_DIR / "artist_track_counts.json"

MB_SEARCH_URL = "https://musicbrainz.org/ws/2/artist/"
MB_USER_AGENT = "AIMusicTrainingMap/1.0 (nandi@augentik.com)"

TOP_N = 2000  # Look up top 2000 artists


def load_country_cache():
    if COUNTRY_CACHE_FILE.exists():
        with open(COUNTRY_CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_country_cache(cache):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(COUNTRY_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)


def lookup_country(name, cache):
    key = name.lower().strip()
    if key in cache:
        return cache[key]

    try:
        r = requests.get(
            MB_SEARCH_URL,
            params={"query": f'artist:"{name}"', "fmt": "json", "limit": 1},
            headers={"User-Agent": MB_USER_AGENT},
            timeout=10,
        )

        if r.status_code == 503:
            time.sleep(3)
            return lookup_country(name, cache)

        if r.status_code != 200:
            cache[key] = None
            return None

        data = r.json()
        artists = data.get("artists", [])
        if artists:
            a = artists[0]
            country = a.get("country")
            if not country:
                area = a.get("area", {})
                if area:
                    codes = area.get("iso-3166-1-codes", [])
                    if codes:
                        country = codes[0]
            cache[key] = country
            return country

        cache[key] = None
        return None

    except Exception as e:
        print(f"  ERROR: {name} -> {e}", flush=True)
        return None


def main():
    print("=" * 60, flush=True)
    print("Building real map data (fast mode - top 2000 artists)", flush=True)
    print("=" * 60, flush=True)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ARTISTS_DIR.mkdir(parents=True, exist_ok=True)

    # Load artist counts
    print("\n[1/3] Loading artist track counts...", flush=True)
    with open(COUNTS_FILE, "r", encoding="utf-8") as f:
        all_counts = json.load(f)

    sorted_artists = sorted(all_counts.items(), key=lambda x: x[1], reverse=True)
    print(f"       {len(sorted_artists):,} total artists", flush=True)

    top_artists = sorted_artists[:TOP_N]
    print(f"       Top {TOP_N} cover {sum(c for _, c in top_artists):,} track-pairs", flush=True)

    # Look up countries
    print(f"\n[2/3] Looking up countries via MusicBrainz...", flush=True)
    cache = load_country_cache()
    cached = sum(1 for name, _ in top_artists if name.lower().strip() in cache)
    to_lookup = TOP_N - cached
    print(f"       {cached} cached, {to_lookup} to look up", flush=True)
    if to_lookup > 0:
        print(f"       ETA: ~{to_lookup * 1.2 / 60:.0f} minutes", flush=True)

    country_map = {}
    lookups_done = 0
    start_time = time.time()

    for i, (name, count) in enumerate(top_artists):
        key = name.lower().strip()
        if key in cache:
            if cache[key]:
                country_map[name] = cache[key]
            continue

        country = lookup_country(name, cache)
        if country:
            country_map[name] = country

        lookups_done += 1
        time.sleep(1.1)

        if lookups_done % 50 == 0:
            save_country_cache(cache)
            elapsed = time.time() - start_time
            rate = lookups_done / elapsed if elapsed > 0 else 0
            remaining = (to_lookup - lookups_done) / rate if rate > 0 else 0
            print(f"       {lookups_done}/{to_lookup} done, {len(country_map)} mapped, ~{remaining/60:.0f}m remaining", flush=True)

    save_country_cache(cache)
    print(f"       Done: {len(country_map):,} artists mapped", flush=True)

    # Aggregate
    print(f"\n[3/3] Writing output...", flush=True)

    country_data = defaultdict(lambda: {"artists": [], "track_count": 0, "artist_count": 0})

    # Include ALL artists that have a country mapping (from cache)
    for name, count in sorted_artists:
        key = name.lower().strip()
        country = cache.get(key)
        if country:
            country_data[country]["artists"].append({"name": name, "track_count": count})
            country_data[country]["track_count"] += count
            country_data[country]["artist_count"] += 1

    for country in country_data.values():
        country["artists"].sort(key=lambda a: a["track_count"], reverse=True)

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

    # Stats
    mapped_tracks = sum(s["track_count"] for s in summary)
    total = sum(all_counts.values())
    print(f"\n       DONE!", flush=True)
    print(f"       Countries: {len(summary)}", flush=True)
    print(f"       Artists mapped: {sum(s['artist_count'] for s in summary):,}", flush=True)
    print(f"       Tracks mapped: {mapped_tracks:,} / {total:,} ({mapped_tracks/total*100:.1f}%)", flush=True)
    print(f"\n       Top 10 countries:", flush=True)
    for i, s in enumerate(summary[:10], 1):
        print(f"       {i:2}. {s['country_code']}: {s['track_count']:,} tracks, {s['artist_count']:,} artists", flush=True)


if __name__ == "__main__":
    main()
