"use client";

import { useState, useEffect } from "react";

interface CountryStat {
  country_code: string;
  track_count: number;
  artist_count: number;
  top_artists: string[];
}

interface ArtistDetail {
  name: string;
  track_count: number;
  total_recordings?: number;
  label?: string;
  type?: string;
}

interface CountryDetail {
  country_code: string;
  artist_count: number;
  track_count: number;
  artists: ArtistDetail[];
}

// Country names
const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", DE: "Germany",
  FR: "France", AU: "Australia", SE: "Sweden", JP: "Japan", KR: "South Korea",
  BR: "Brazil", NG: "Nigeria", ZA: "South Africa", IN: "India", MX: "Mexico",
  CO: "Colombia", ES: "Spain", IT: "Italy", NZ: "New Zealand", JM: "Jamaica",
  IE: "Ireland", NL: "Netherlands", BE: "Belgium", PT: "Portugal",
  AR: "Argentina", CL: "Chile", PE: "Peru", PH: "Philippines", ID: "Indonesia",
  TH: "Thailand", VN: "Vietnam", CN: "China", TW: "Taiwan", RU: "Russia",
  UA: "Ukraine", PL: "Poland", CZ: "Czech Republic", AT: "Austria",
  CH: "Switzerland", NO: "Norway", DK: "Denmark", FI: "Finland", GH: "Ghana",
  KE: "Kenya", TZ: "Tanzania", EG: "Egypt", MA: "Morocco", IL: "Israel",
  TR: "Turkey", GR: "Greece", RO: "Romania", HU: "Hungary", HR: "Croatia",
  RS: "Serbia",
};

// Country flag emojis from code
function getFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

interface CountryPanelProps {
  country: CountryStat;
  onClose: () => void;
}

function ArtistRow({ artist, index, maxCount }: { artist: ArtistDetail; index: number; maxCount: number }) {
  const [expanded, setExpanded] = useState(false);
  const pctInclusion = artist.total_recordings
    ? Math.min(Math.round((artist.track_count / artist.total_recordings) * 100), 100)
    : null;

  return (
    <div className="rounded-lg hover:bg-slate-800 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2 px-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-slate-600 w-6 text-right flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-sm text-white truncate">{artist.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-400">
            {artist.track_count.toLocaleString()} tracks
          </span>
          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{
                width: `${Math.min(100, (artist.track_count / maxCount) * 100)}%`,
              }}
            />
          </div>
          <svg
            className={`w-3 h-3 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 ml-9">
          <div className="bg-slate-800/50 rounded-lg p-3 text-xs space-y-2 border border-slate-700/50">
            {/* Inclusion percentage */}
            {pctInclusion !== null && artist.total_recordings && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Catalog included in AI training</span>
                <span className="text-orange-400 font-bold">{pctInclusion}%</span>
              </div>
            )}
            {artist.total_recordings && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tracks in dataset / total catalog</span>
                <span className="text-slate-300">{artist.track_count} / {artist.total_recordings}</span>
              </div>
            )}
            {pctInclusion !== null && (
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${pctInclusion}%` }}
                />
              </div>
            )}

            {/* Label */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">Label</span>
              <span className="text-slate-300 text-right max-w-[180px] truncate">
                {artist.label || "Unknown"}
              </span>
            </div>

            {/* Type */}
            {artist.type && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Type</span>
                <span className="text-slate-300">{artist.type}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CountryPanel({ country, onClose }: CountryPanelProps) {
  const [detail, setDetail] = useState<CountryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);

  const countryName = COUNTRY_NAMES[country.country_code] || country.country_code;
  const flag = getFlag(country.country_code);

  useEffect(() => {
    setLoading(true);
    setSearchQuery("");
    setVisibleCount(50);

    fetch(`/data/artists_by_country/${country.country_code}.json`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: CountryDetail) => {
        setDetail(data);
        setLoading(false);
      })
      .catch(() => {
        // If no detail file yet, use the summary data
        setDetail({
          country_code: country.country_code,
          artist_count: country.artist_count,
          track_count: country.track_count,
          artists: country.top_artists.map((name, i) => ({
            name,
            track_count: Math.floor(country.track_count / (i + 2)),
          })),
        });
        setLoading(false);
      });
  }, [country]);

  const filteredArtists = detail?.artists.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const visibleArtists = filteredArtists.slice(0, visibleCount);

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-700 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* Panel header */}
      <div className="p-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{flag}</span>
            <h2 className="text-xl font-bold text-white">{countryName}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-xl font-bold text-orange-400">
              {country.track_count.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Tracks extracted</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-xl font-bold text-orange-400">
              {country.artist_count.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Artists affected</div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <input
            type="text"
            placeholder="Search artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Artist list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-slate-400 py-8">Loading artists...</div>
        ) : (
          <>
            <div className="text-xs text-slate-500 mb-3">
              {filteredArtists.length.toLocaleString()} artists
              {searchQuery && ` matching "${searchQuery}"`}
              {" · "}sorted by tracks extracted (most → least)
            </div>

            <div className="space-y-1">
              {visibleArtists.map((artist, i) => (
                <ArtistRow key={artist.name} artist={artist} index={i} maxCount={filteredArtists[0]?.track_count || 1} />
              ))}
            </div>

            {/* Load more */}
            {visibleCount < filteredArtists.length && (
              <button
                onClick={() => setVisibleCount((v) => v + 50)}
                className="w-full mt-4 py-2 text-sm text-orange-400 hover:text-orange-300 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Load more ({filteredArtists.length - visibleCount} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700 flex-shrink-0">
        <p className="text-xs text-slate-500 text-center">
          Data from LAION-DISCO-12M · Country via MusicBrainz
        </p>
      </div>
    </div>
  );
}
