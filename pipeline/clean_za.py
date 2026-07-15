"""
Clean up ZA false positives.
For artists with generic/ambiguous names, verify they're actually South African
by checking MusicBrainz more carefully (score, disambiguation, etc.)
"""
import json
import time
import requests
from pathlib import Path

CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_FILE = CACHE_DIR / "artist_country_cache.json"
COUNTS_FILE = CACHE_DIR / "artist_track_counts.json"

MB_URL = "https://musicbrainz.org/ws/2/artist/"
HEADERS = {"User-Agent": "AIMusicTrainingMap/1.0 (nandi@augentik.com)"}

with open(CACHE_FILE, "r", encoding="utf-8") as f:
    cache = json.load(f)

with open(COUNTS_FILE, "r", encoding="utf-8") as f:
    all_counts = json.load(f)

# Get current ZA artists
za_artists = []
for name, count in all_counts.items():
    if cache.get(name.lower().strip()) == "ZA":
        za_artists.append((name, count))
za_artists.sort(key=lambda x: x[1], reverse=True)

print(f"Current ZA artists: {len(za_artists)}", flush=True)

# Obvious false positives - generic single names that are likely not the SA artist
# These are names so generic that MusicBrainz's search might return a ZA artist
# but the LAION dataset likely has a different artist with the same name
SUSPECT_NAMES = []

# Flag names that are very short/generic (1 word, common English names)
for name, count in za_artists:
    words = name.split()
    # Single common word names are suspicious
    if len(words) == 1 and len(name) <= 8:
        SUSPECT_NAMES.append(name)
    # Very common first names
    elif name.lower() in [
        "adam", "eden", "jay", "zee", "rebecca", "hawk", "monique",
        "slug", "eden", "joy", "grace", "faith", "angel", "storm",
        "genesis", "phoenix", "trinity", "destiny", "crystal",
        "diamond", "shadow", "blade", "nova", "blaze", "echo",
    ]:
        if name not in SUSPECT_NAMES:
            SUSPECT_NAMES.append(name)

print(f"\nSuspect names to verify: {len(SUSPECT_NAMES)}", flush=True)
for name in SUSPECT_NAMES[:20]:
    count = all_counts.get(name, 0)
    print(f"  {name}: {count} tracks", flush=True)

# For each suspect, do a more careful MusicBrainz lookup:
# - Check if the top result's score is high (exact match)
# - Check if there are multiple artists with that name (ambiguous)
# - If ambiguous or low score, remove from ZA
print(f"\nVerifying {len(SUSPECT_NAMES)} suspect names...", flush=True)

removed = []
kept = []

for name in SUSPECT_NAMES:
    key = name.lower().strip()
    try:
        r = requests.get(
            MB_URL,
            params={"query": f'artist:"{name}"', "fmt": "json", "limit": 5},
            headers=HEADERS,
            timeout=10,
        )
        if r.status_code == 200:
            data = r.json()
            artists = data.get("artists", [])

            if not artists:
                # No results at all - remove
                cache[key] = None
                removed.append(name)
                continue

            # Check how many results there are with that exact name
            exact_matches = [a for a in artists if a.get("name", "").lower() == name.lower()]

            if len(exact_matches) > 1:
                # Multiple artists with same name - ambiguous, likely not the SA one in LAION
                # Check if the ZA one is the most popular (has highest score)
                za_matches = [a for a in exact_matches if a.get("country") == "ZA"]
                non_za_matches = [a for a in exact_matches if a.get("country") != "ZA" and a.get("country")]

                if non_za_matches and za_matches:
                    # There's both a ZA and non-ZA artist with this name
                    # The LAION dataset likely has the more famous one
                    za_score = max(a.get("score", 0) for a in za_matches)
                    other_score = max(a.get("score", 0) for a in non_za_matches)

                    if other_score > za_score:
                        # Non-ZA artist is more relevant - remove ZA tag
                        best_other = max(non_za_matches, key=lambda a: a.get("score", 0))
                        cache[key] = best_other.get("country")
                        removed.append(name)
                        print(f"  REMOVED: {name} (more likely {best_other.get('country')} artist, score {other_score} vs ZA {za_score})", flush=True)
                    else:
                        kept.append(name)
                elif non_za_matches and not za_matches:
                    # No ZA match found in top results
                    best = max(non_za_matches, key=lambda a: a.get("score", 0))
                    cache[key] = best.get("country")
                    removed.append(name)
                    print(f"  REMOVED: {name} (actually {best.get('country')})", flush=True)
                else:
                    kept.append(name)
            elif len(exact_matches) == 1:
                # Only one match - if it's ZA with high score, keep
                if exact_matches[0].get("country") == "ZA" and exact_matches[0].get("score", 0) >= 90:
                    kept.append(name)
                else:
                    # Low confidence
                    if exact_matches[0].get("country") != "ZA":
                        cache[key] = exact_matches[0].get("country")
                        removed.append(name)
                        print(f"  REMOVED: {name} (actually {exact_matches[0].get('country')})", flush=True)
                    else:
                        kept.append(name)
            else:
                # No exact name match - the search was fuzzy, remove
                cache[key] = None
                removed.append(name)
                print(f"  REMOVED: {name} (no exact match in MusicBrainz)", flush=True)

        time.sleep(1.2)
    except Exception as e:
        print(f"  ERROR: {name} -> {e}", flush=True)

# Save updated cache
with open(CACHE_FILE, "w", encoding="utf-8") as f:
    json.dump(cache, f, ensure_ascii=False)

# Report
print(f"\n{'='*60}", flush=True)
print(f"Removed: {len(removed)} false positives", flush=True)
print(f"Kept: {len(kept)} verified ZA artists", flush=True)

# New ZA count
new_za = [(name, count) for name, count in all_counts.items() if cache.get(name.lower().strip()) == "ZA"]
new_za.sort(key=lambda x: x[1], reverse=True)
print(f"\nUpdated ZA total: {len(new_za)} artists, {sum(c for _, c in new_za):,} tracks", flush=True)
print(f"\nTop 20 ZA artists (after cleanup):", flush=True)
for name, count in new_za[:20]:
    print(f"  {name}: {count} tracks", flush=True)
