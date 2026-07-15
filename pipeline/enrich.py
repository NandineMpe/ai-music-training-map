"""
LAION-DISCO-12M Country Enrichment Pipeline

1. Downloads LAION-DISCO-12M metadata from Hugging Face (12.3M tracks)
2. Downloads GlobalDISCO dataset for country mappings (MusicBrainz-sourced)
3. Cross-references artists to countries
4. Outputs aggregated JSON for the interactive map

No API rate-limiting needed — uses pre-existing country data from GlobalDISCO.
"""

import json
import os
from pathlib import Path
from collections import defaultdict

import pandas as pd
from tqdm import tqdm
from datasets import load_dataset

# --- Configuration ---
OUTPUT_DIR = Path(__file__).parent.parent / "web" / "public" / "data"
ARTISTS_DIR = OUTPUT_DIR / "artists_by_country"


def main():
    print("=" * 60)
    print("AI Music Training Data Map - Country Enrichment Pipeline")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ARTISTS_DIR.mkdir(parents=True, exist_ok=True)

    # --- Step 1: Load GlobalDISCO for country mappings ---
    print("\n[1/4] Loading GlobalDISCO dataset for country mappings...")
    print("       (This provides artist_id -> country from MusicBrainz)")

    global_disco = load_dataset("disco-eth/GlobalDISCO", split="train")
    gd_df = global_disco.to_pandas()

    print(f"       Loaded {len(gd_df):,} rows from GlobalDISCO")
    print(f"       Columns: {list(gd_df.columns)}")

    # Build mapping: we need to extract artist references
    # GlobalDISCO has: artist_id, country, musical_style, laion_song_ids
    # laion_song_ids links back to LAION-DISCO-12M
    # country is the artist's country from MusicBrainz

    # Build artist_id -> country mapping
    artist_country_map = {}
    for _, row in tqdm(gd_df.iterrows(), total=len(gd_df), desc="Building country map"):
        artist_id = row.get("artist_id")
        country = row.get("country")
        if artist_id is not None and country:
            artist_country_map[str(artist_id)] = country

    print(f"       Unique artist->country mappings: {len(artist_country_map):,}")
    print(f"       Countries represented: {len(set(artist_country_map.values()))}")

    # --- Step 2: Load LAION-DISCO-12M ---
    print("\n[2/4] Loading LAION-DISCO-12M dataset from Hugging Face...")
    print("       (This is ~750MB of Parquet metadata, may take a few minutes)")

    laion = load_dataset("laion/LAION-DISCO-12M", split="train")
    laion_df = laion.to_pandas()

    print(f"       Loaded {len(laion_df):,} tracks")
    print(f"       Columns: {list(laion_df.columns)}")

    # --- Step 3: Cross-reference ---
    print("\n[3/4] Cross-referencing artists with country data...")

    # LAION-DISCO-12M has: song_id, title, artist_names, artist_ids, album_name, etc.
    # artist_ids connects to GlobalDISCO's artist references via laion_song_ids

    # Strategy: 
    # - Use artist_names from LAION directly for display
    # - Try to match via artist_ids to GlobalDISCO's artist_id for country
    # - Also try matching by song_id to GlobalDISCO's laion_song_ids

    # First, build a song_id -> country mapping from GlobalDISCO's laion_song_ids
    song_country_map = {}
    for _, row in tqdm(gd_df.iterrows(), total=len(gd_df), desc="Building song->country map"):
        country = row.get("country")
        laion_ids = row.get("laion_song_ids")
        if not country:
            continue
        if laion_ids is not None:
            if isinstance(laion_ids, list):
                for sid in laion_ids:
                    song_country_map[str(sid)] = country
            elif isinstance(laion_ids, str):
                try:
                    parsed = json.loads(laion_ids)
                    if isinstance(parsed, list):
                        for sid in parsed:
                            song_country_map[str(sid)] = country
                    else:
                        song_country_map[laion_ids] = country
                except (json.JSONDecodeError, TypeError):
                    song_country_map[laion_ids] = country

    print(f"       Song->country mappings: {len(song_country_map):,}")

    # Now process LAION tracks
    # Count tracks per artist, and assign country
    artist_data = defaultdict(lambda: {"track_count": 0, "country": None})
    tracks_with_country = 0
    tracks_without_country = 0

    for _, row in tqdm(laion_df.iterrows(), total=len(laion_df), desc="Processing tracks"):
        song_id = str(row.get("song_id", ""))
        artist_names_raw = row.get("artist_names")
        artist_ids_raw = row.get("artist_ids")

        # Parse artist names
        if isinstance(artist_names_raw, list):
            artist_names = artist_names_raw
        elif isinstance(artist_names_raw, str):
            try:
                parsed = json.loads(artist_names_raw)
                artist_names = parsed if isinstance(parsed, list) else [artist_names_raw]
            except (json.JSONDecodeError, TypeError):
                artist_names = [artist_names_raw]
        else:
            continue

        # Parse artist IDs
        if isinstance(artist_ids_raw, list):
            artist_ids = [str(x) for x in artist_ids_raw]
        elif isinstance(artist_ids_raw, str):
            try:
                parsed = json.loads(artist_ids_raw)
                artist_ids = [str(x) for x in parsed] if isinstance(parsed, list) else [artist_ids_raw]
            except (json.JSONDecodeError, TypeError):
                artist_ids = [artist_ids_raw]
        else:
            artist_ids = []

        # Try to find country
        country = None

        # Method 1: via song_id -> GlobalDISCO laion_song_ids
        if song_id in song_country_map:
            country = song_country_map[song_id]

        # Method 2: via artist_ids -> GlobalDISCO artist_id
        if not country:
            for aid in artist_ids:
                if aid in artist_country_map:
                    country = artist_country_map[aid]
                    break

        if country:
            tracks_with_country += 1
        else:
            tracks_without_country += 1

        # Record each artist
        for name in artist_names:
            name = name.strip() if isinstance(name, str) else str(name)
            if not name:
                continue
            artist_data[name]["track_count"] += 1
            if country and not artist_data[name]["country"]:
                artist_data[name]["country"] = country

    print(f"\n       Tracks with country: {tracks_with_country:,}")
    print(f"       Tracks without country: {tracks_without_country:,}")
    print(f"       Unique artists: {len(artist_data):,}")

    # --- Step 4: Aggregate and output ---
    print("\n[4/4] Aggregating data and writing output...")

    # Group by country
    country_artists = defaultdict(list)
    for artist_name, data in artist_data.items():
        country = data["country"] or "UNKNOWN"
        country_artists[country].append({
            "name": artist_name,
            "track_count": data["track_count"],
        })

    # Sort artists within each country
    for country in country_artists:
        country_artists[country].sort(key=lambda a: a["track_count"], reverse=True)

    # Write country_stats.json
    summary = []
    for code, artists in country_artists.items():
        if code == "UNKNOWN":
            continue
        total_tracks = sum(a["track_count"] for a in artists)
        summary.append({
            "country_code": code,
            "track_count": total_tracks,
            "artist_count": len(artists),
            "top_artists": [a["name"] for a in artists[:5]],
        })

    summary.sort(key=lambda x: x["track_count"], reverse=True)

    with open(OUTPUT_DIR / "country_stats.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    # Write per-country files
    for code, artists in country_artists.items():
        if code == "UNKNOWN":
            continue
        total_tracks = sum(a["track_count"] for a in artists)
        with open(ARTISTS_DIR / f"{code}.json", "w", encoding="utf-8") as f:
            json.dump({
                "country_code": code,
                "artist_count": len(artists),
                "track_count": total_tracks,
                "artists": artists,
            }, f, ensure_ascii=False, indent=2)

    # Write unknown
    if "UNKNOWN" in country_artists:
        unknown = country_artists["UNKNOWN"]
        with open(ARTISTS_DIR / "UNKNOWN.json", "w", encoding="utf-8") as f:
            json.dump({
                "country_code": "UNKNOWN",
                "artist_count": len(unknown),
                "track_count": sum(a["track_count"] for a in unknown),
                "artists": unknown[:1000],  # Cap at 1000 for file size
            }, f, ensure_ascii=False, indent=2)

    print(f"\n       Done! Output written to: {OUTPUT_DIR}")
    print(f"       Countries found: {len(summary)}")
    print(f"       Total tracks mapped to countries: {sum(s['track_count'] for s in summary):,}")
    unknown_count = len(country_artists.get('UNKNOWN', []))
    print(f"       Artists without country: {unknown_count:,}")

    print("\n       Top 15 countries by track count:")
    for i, s in enumerate(summary[:15], 1):
        print(f"       {i:2}. {s['country_code']}: {s['track_count']:,} tracks, {s['artist_count']:,} artists")
        print(f"           Top: {', '.join(s['top_artists'][:3])}")


if __name__ == "__main__":
    main()
