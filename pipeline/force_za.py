"""Force re-lookup SA artists (clear their cache entries first)."""
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
    "Uncle Waffles", "Sho Madjozi", "Moonchild Sanelly",
    "Tyler ICU", "DJ Zinhle", "Oskido", "Black Motion", "Mi Casa",
    "Seether", "Abdullah Ibrahim", "Karen Zoid", "Matthew Mole",
    "Busiswa", "Tyla", "Zahara", "Zonke", "Focalistic", "DBN Gogo",
]

with open(CACHE_FILE, "r", encoding="utf-8") as f:
    cache = json.load(f)

# Force re-lookup all ZA artists
added = 0
for name in ZA_ARTISTS:
    key = name.lower().strip()
    # Delete existing entry to force re-lookup
    if key in cache:
        del cache[key]

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
                if country == "ZA":
                    added += 1
                    print(f"  ZA: {name}", flush=True)
                else:
                    print(f"  {country}: {name}", flush=True)
            else:
                cache[key] = None
                print(f"  NOT FOUND: {name}", flush=True)
        time.sleep(1.2)
    except Exception as e:
        print(f"  ERROR: {name} -> {e}", flush=True)

with open(CACHE_FILE, "w", encoding="utf-8") as f:
    json.dump(cache, f, ensure_ascii=False)

print(f"\nDone: {added} ZA artists confirmed and saved to cache.", flush=True)
