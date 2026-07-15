# AI Music Training Data Map

Interactive world map showing which countries' music was used to train AI models — based on The Atlantic's AI Watchdog investigation of the LAION-DISCO-12M dataset.

## How it works

1. **Data pipeline** (`/pipeline`) — Python script that downloads the LAION-DISCO-12M metadata from Hugging Face, looks up artist countries via MusicBrainz, and outputs processed data as JSON.
2. **Web app** (`/web`) — Next.js interactive map. Click a country to see stats, drill down into artists sorted by number of tracks extracted.

## Quick Start

### 1. Run the data pipeline

```bash
cd pipeline
pip install -r requirements.txt
python enrich.py
```

This outputs `../web/public/data/country_stats.json` and `../web/public/data/artists_by_country.json`.

### 2. Run the web app

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000

## Data Sources

- [LAION-DISCO-12M](https://huggingface.co/datasets/laion/LAION-DISCO-12M) — 12.3M music tracks metadata
- [MusicBrainz](https://musicbrainz.org/) — Artist country/nationality data
- [The Atlantic AI Watchdog](https://www.theatlantic.com/technology/archive/2025/09/ai-watchdog-faq/684082/) — Investigation context
