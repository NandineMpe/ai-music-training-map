"""
LAION-DISCO-12M Country Enrichment Pipeline

Downloads the LAION-DISCO-12M metadata from Hugging Face,
looks up artist countries via MusicBrainz, and outputs
aggregated JSON for the interactive map.

Rate-limited to respect MusicBrainz's 1 req/sec policy.
Caches results to avoid redundant lookups on re-runs.
"""

import json
import os
import time
import hashlib
from pathlib import Path

import pandas as pd
import musicbrainzngs
from tqdm import tqdm
from datasets import load_dataset

# --- Configuration ---
OUTPUT_DIR = Path(__file__).parent.parent / "web" / "public" / "data"
CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_FILE = CACHE_DIR / "artist_country_cache.json"
MUSICBRAINZ_APP = "ai-music-map"
MUSICBRAINZ_VERSION = "1.0"
MUSICBRAINZ_CONTACT = "nandi@augentik.com"

# How many artists to process (set to None for all)
# MusicBrainz rate limit: 1 req/sec, so 250k artists = ~3 days
# Start with a sample, then scale up
MAX_ARTISTS = None  # Set to e.g. 5000 for testing


def setup():
    """Initialize MusicBrainz client and directories."""
    musicbrainzngs.set_useragent(
        MUSICBRAINZ_APP, MUSICBRAINZ_VERSION, MUSICBRAINZ_CONTACT
    )
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def load_cache() -> dict:
    """Load cached artist -> country mappings."""
    if CACHE_FILE.exists():
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache: dict):
    """Persist cache to disk."""
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)


def lookup_artist_country(artist_name: str, cache: dict) -> str | None:
    """
    Look up an artist's country via MusicBrainz.
    Returns ISO country code or None if not found.
    Uses cache to avoid redundant API calls.
    """
    # Check cache first
    cache_key = artist_name.lower().strip()
    if cache_key in cache:
        return cache[cache_key]

    try:
        result = musicbrainzngs.search_artists(artist=artist_name, limit=1)
        artists = result.get("artist-list", [])

        if artists:
            artist = artists[0]
            # Try 'country' field first, then 'area'
            country = artist.get("country")
            if not country and "area" in artist:
                area = artist["area"]
                # area has iso-3166-1-code-list sometimes
                codes = area.get("iso-3166-1-code-list", [])
                if codes:
                    country = codes[0]

            cache[cache_key] = country
            return country

        cache[cache_key] = None
        return None

    except musicbrainzngs.WebServiceError as e:
        print(f"  MusicBrainz error for '{artist_name}': {e}")
        cache[cache_key] = None
        return None
    except Exception as e:
        print(f"  Unexpected error for '{artist_name}': {e}")
        return None


def main():
    print("=" * 60)
    print("AI Music Training Data Map - Country Enrichment Pipeline")
    print("=" * 60)

    setup()

    # --- Step 1: Load LAION-DISCO-12M metadata ---
    print("\n[1/4] Loading LAION-DISCO-12M dataset from Hugging Face...")
    print("       (This downloads ~750MB of Parquet metadata on first run)")

    ds = load_dataset("laion/LAION-DISCO-12M", split="train")
    df = ds.to_pandas()

    print(f"       Loaded {len(df):,} tracks")
    print(f"       Columns: {list(df.columns)}")

    # --- Step 2: Extract unique artists ---
    print("\n[2/4] Extracting unique artists...")

    # The dataset has 'artist_names' which may be a list or string
    # Flatten and deduplicate
    all_artists = []
    for names in df["artist_names"]:
        if isinstance(names, list):
            all_artists.extend(names)
        elif isinstance(names, str):
            # Could be JSON array or single name
            try:
                parsed = json.loads(names)
                if isinstance(parsed, list):
                    all_artists.extend(parsed)
                else:
                    all_artists.append(names)
            except (json.JSONDecodeError, TypeError):
                all_artists.append(names)

    unique_artists = list(set(a.strip() for a in all_artists if a and a.strip()))
    unique_artists.sort()

    if MAX_ARTISTS:
        unique_artists = unique_artists[:MAX_ARTISTS]

    print(f"       Found {len(unique_artists):,} unique artists")

    # --- Step 3: Look up countries via MusicBrainz ---
    print("\n[3/4] Looking up artist countries via MusicBrainz...")
    print("       (Rate limited to 1 request/second)")

    cache = load_cache()
    cached_count = sum(1 for a in unique_artists if a.lower().strip() in cache)
    print(f"       {cached_count:,} already cached, {len(unique_artists) - cached_count:,} to look up")

    artist_countries = {}
    save_interval = 100  # Save cache every N lookups

    for i, artist_name in enumerate(tqdm(unique_artists, desc="Looking up artists")):
        country = lookup_artist_country(artist_name, cache)
        artist_countries[artist_name] = country

        # Rate limit (only if we actually hit the API)
        if artist_name.lower().strip() not in cache:
            time.sleep(1.1)  # Slightly over 1 sec to be safe

        # Periodic cache save
        if (i + 1) % save_interval == 0:
            save_cache(cache)

    save_cache(cache)

    # --- Step 4: Aggregate and output ---
    print("\n[4/4] Aggregating data and writing output...")

    # Count tracks per artist
    artist_track_counts = {}
    for _, row in df.iterrows():
        names = row["artist_names"]
        if isinstance(names, list):
            artists_in_row = names
        elif isinstance(names, str):
            try:
                parsed = json.loads(names)
                artists_in_row = parsed if isinstance(parsed, list) else [names]
            except (json.JSONDecodeError, TypeError):
                artists_in_row = [names]
        else:
            continue

        for name in artists_in_row:
            name = name.strip()
            if name:
                artist_track_counts[name] = artist_track_counts.get(name, 0) + 1

    # Build country stats
    country_stats = {}  # {country_code: {track_count, artist_count, artists: [...]}}

    for artist_name, country in artist_countries.items():
        if not country:
            country = "UNKNOWN"

        if country not in country_stats:
            country_stats[country] = {
                "country_code": country,
                "track_count": 0,
                "artist_count": 0,
                "artists": [],
            }

        track_count = artist_track_counts.get(artist_name, 0)
        country_stats[country]["track_count"] += track_count
        country_stats[country]["artist_count"] += 1
        country_stats[country]["artists"].append({
            "name": artist_name,
            "track_count": track_count,
        })

    # Sort artists within each country by track count (descending)
    for country in country_stats.values():
        country["artists"].sort(key=lambda a: a["track_count"], reverse=True)

    # Write country_stats.json (summary for map coloring)
    summary = []
    for code, data in country_stats.items():
        if code == "UNKNOWN":
            continue
        summary.append({
            "country_code": code,
            "track_count": data["track_count"],
            "artist_count": data["artist_count"],
            "top_artists": [a["name"] for a in data["artists"][:5]],
        })

    summary.sort(key=lambda x: x["track_count"], reverse=True)

    with open(OUTPUT_DIR / "country_stats.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    # Write artists_by_country/{country_code}.json for drill-down
    artists_dir = OUTPUT_DIR / "artists_by_country"
    artists_dir.mkdir(parents=True, exist_ok=True)

    for code, data in country_stats.items():
        if code == "UNKNOWN":
            continue
        with open(artists_dir / f"{code}.json", "w", encoding="utf-8") as f:
            json.dump({
                "country_code": code,
                "artist_count": data["artist_count"],
                "track_count": data["track_count"],
                "artists": data["artists"],
            }, f, ensure_ascii=False, indent=2)

    # Also write unknown artists
    if "UNKNOWN" in country_stats:
        with open(artists_dir / "UNKNOWN.json", "w", encoding="utf-8") as f:
            json.dump(country_stats["UNKNOWN"], f, ensure_ascii=False, indent=2)

    print(f"\n       Done! Output written to: {OUTPUT_DIR}")
    print(f"       Countries found: {len(summary)}")
    print(f"       Total tracks mapped: {sum(s['track_count'] for s in summary):,}")
    print(f"       Unknown country: {country_stats.get('UNKNOWN', {}).get('artist_count', 0):,} artists")

    # Print top 10 countries
    print("\n       Top 10 countries by track count:")
    for i, s in enumerate(summary[:10], 1):
        print(f"       {i:2}. {s['country_code']}: {s['track_count']:,} tracks, {s['artist_count']:,} artists")


if __name__ == "__main__":
    main()
