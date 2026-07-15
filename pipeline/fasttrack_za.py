"""Fast-track South African artists via MusicBrainz."""
import json
import time
import sys
import requests
from pathlib import Path

CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_FILE = CACHE_DIR / "artist_country_cache.json"
COUNTS_FILE = CACHE_DIR / "artist_track_counts.json"

MB_SEARCH_URL = "https://musicbrainz.org/ws/2/artist/"
MB_USER_AGENT = "AIMusicTrainingMap/1.0 (nandi@augentik.com)"

# Known South African artists to look up specifically
ZA_ARTISTS = [
    "Black Coffee", "Tyla", "Die Antwoord", "Ladysmith Black Mambazo",
    "Nasty C", "Cassper Nyovest", "AKA", "DJ Maphorisa", "Kabza De Small",
    "Master KG", "Makhadzi", "Zakes Bantwini", "Brenda Fassie",
    "Hugh Masekela", "Miriam Makeba", "Johnny Clegg", "Lucky Dube",
    "Freshlyground", "Jeremy Loops", "Goldfish", "Prime Circle",
    "Locnville", "Mafikizolo", "Zahara", "Lira", "Zonke",
    "Kwesta", "Sjava", "Emtee", "A-Reece", "Riky Rick",
    "Samthing Soweto", "Sun-El Musician", "Ami Faku", "Elaine",
    "Blxckie", "Focalistic", "Uncle Waffles", "DBN Gogo",
    "Msaki", "Nomfundo Moh", "Busiswa", "Sho Madjozi",
    "Moonchild Sanelly", "Musa Keys", "Tyler ICU", "Young Stunna",
    "Costa Titch", "Phantom Steeze", "Major League DJz",
    "DJ Zinhle", "Oskido", "DJ Fresh", "Black Motion",
    "Mi Casa", "The Parlotones", "Seether", "Civil Twilight",
    "Kongos", "Rodriguez", "Abdullah Ibrahim", "Chris Chameleon",
    "Karen Zoid", "Watershed", "Gangs of Ballet", "Matthew Mole",
]

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


print("Fast-tracking South African artists...", flush=True)

# Load cache
with open(CACHE_FILE, "r", encoding="utf-8") as f:
    cache = json.load(f)

# Also search for any artist in our counts that might be South African
with open(COUNTS_FILE, "r", encoding="utf-8") as f:
    all_counts = json.load(f)

found = 0
for name in ZA_ARTISTS:
    key = name.lower().strip()
    if key in cache:
        if cache[key] == "ZA":
            found += 1
        continue

    # Look up
    country = lookup_country(name, cache)
    if country == "ZA":
        found += 1
        track_count = all_counts.get(name, 0)
        print(f"  ZA: {name} ({track_count} tracks)", flush=True)
    elif country:
        print(f"  {country}: {name} (not ZA)", flush=True)
    else:
        print(f"  ?: {name} (not found)", flush=True)

    time.sleep(1.1)

# Save cache
with open(CACHE_FILE, "w", encoding="utf-8") as f:
    json.dump(cache, f, ensure_ascii=False)

print(f"\nDone: {found} South African artists confirmed", flush=True)
