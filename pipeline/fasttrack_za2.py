"""Fast-track South African artists - quick version."""
import json
import time
import requests
from pathlib import Path

CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_FILE = CACHE_DIR / "artist_country_cache.json"

MB_URL = "https://musicbrainz.org/ws/2/artist/"
HEADERS = {"User-Agent": "AIMusicTrainingMap/1.0 (nandi@augentik.com)"}

ZA_ARTISTS = [
    "Black Coffee", "Die Antwoord", "Nasty C", "Cassper Nyovest",
    "DJ Maphorisa", "Kabza De Small", "Master KG", "Makhadzi",
    "Brenda Fassie", "Hugh Masekela", "Miriam Makeba", "Johnny Clegg",
    "Lucky Dube", "Freshlyground", "Jeremy Loops", "Goldfish",
    "Prime Circle", "Locnville", "Mafikizolo", "Lira",
    "Kwesta", "Sjava", "Emtee", "A-Reece", "Riky Rick",
    "Samthing Soweto", "Sun-El Musician", "Ami Faku", "Blxckie",
    "Uncle Waffles", "Sho Madjozi", "Moonchild Sanelly", "Musa Keys",
    "Tyler ICU", "Young Stunna", "Major League DJz", "DJ Zinhle",
    "Oskido", "DJ Fresh", "Black Motion", "Mi Casa", "Seether",
    "Abdullah Ibrahim", "Karen Zoid", "Matthew Mole", "Tyla",
    "Ladysmith Black Mambazo", "Zakes Bantwini", "Busiswa",
]

# Load cache
with open(CACHE_FILE, "r", encoding="utf-8") as f:
    cache = json.load(f)

print(f"Cache has {len(cache)} entries", flush=True)
added = 0

for name in ZA_ARTISTS:
    key = name.lower().strip()
    if key in cache and cache[key] is not None:
        continue

    try:
        r = requests.get(
            MB_URL,
            params={"query": f'artist:"{name}"', "fmt": "json", "limit": 1},
            headers=HEADERS,
            timeout=10,
        )
        if r.status_code == 200:
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
                added += 1
                print(f"  {name} -> {country}", flush=True)
            else:
                cache[key] = None
                print(f"  {name} -> not found", flush=True)
        else:
            print(f"  {name} -> HTTP {r.status_code}", flush=True)

        time.sleep(1.2)
    except Exception as e:
        print(f"  {name} -> error: {e}", flush=True)

# Save
with open(CACHE_FILE, "w", encoding="utf-8") as f:
    json.dump(cache, f, ensure_ascii=False)

print(f"\nDone: added {added} new entries. Cache now has {len(cache)} entries.", flush=True)
