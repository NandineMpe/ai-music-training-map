"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import CountryPanel from "./CountryPanel";

interface CountryStat {
  country_code: string;
  track_count: number;
  artist_count: number;
  top_artists: string[];
}

// ISO Alpha-2 to country name mapping for display
const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  AU: "Australia",
  SE: "Sweden",
  JP: "Japan",
  KR: "South Korea",
  BR: "Brazil",
  NG: "Nigeria",
  ZA: "South Africa",
  IN: "India",
  MX: "Mexico",
  CO: "Colombia",
  ES: "Spain",
  IT: "Italy",
  NZ: "New Zealand",
  JM: "Jamaica",
  IE: "Ireland",
  NL: "Netherlands",
  BE: "Belgium",
  PT: "Portugal",
  AR: "Argentina",
  CL: "Chile",
  PE: "Peru",
  PH: "Philippines",
  ID: "Indonesia",
  TH: "Thailand",
  VN: "Vietnam",
  CN: "China",
  TW: "Taiwan",
  RU: "Russia",
  UA: "Ukraine",
  PL: "Poland",
  CZ: "Czech Republic",
  AT: "Austria",
  CH: "Switzerland",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  GH: "Ghana",
  KE: "Kenya",
  TZ: "Tanzania",
  EG: "Egypt",
  MA: "Morocco",
  IL: "Israel",
  TR: "Turkey",
  GR: "Greece",
  RO: "Romania",
  HU: "Hungary",
  HR: "Croatia",
  RS: "Serbia",
};

// ISO Alpha-3 to Alpha-2 mapping (TopoJSON uses Alpha-3)
const ISO3_TO_ISO2: Record<string, string> = {
  USA: "US", GBR: "GB", CAN: "CA", DEU: "DE", FRA: "FR",
  AUS: "AU", SWE: "SE", JPN: "JP", KOR: "KR", BRA: "BR",
  NGA: "NG", ZAF: "ZA", IND: "IN", MEX: "MX", COL: "CO",
  ESP: "ES", ITA: "IT", NZL: "NZ", JAM: "JM", IRL: "IE",
  NLD: "NL", BEL: "BE", PRT: "PT", ARG: "AR", CHL: "CL",
  PER: "PE", PHL: "PH", IDN: "ID", THA: "TH", VNM: "VN",
  CHN: "CN", TWN: "TW", RUS: "RU", UKR: "UA", POL: "PL",
  CZE: "CZ", AUT: "AT", CHE: "CH", NOR: "NO", DNK: "DK",
  FIN: "FI", GHA: "GH", KEN: "KE", TZA: "TZ", EGY: "EG",
  MAR: "MA", ISR: "IL", TUR: "TR", GRC: "GR", ROU: "RO",
  HUN: "HU", HRV: "HR", SRB: "RS",
};

const WORLD_TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function WorldMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<CountryStat[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryStat | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    fetch("/data/country_stats.json")
      .then((r) => r.json())
      .then((data: CountryStat[]) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load stats:", err);
        setLoading(false);
      });
  }, []);

  // Build a lookup from ISO2 code to stats
  const statsLookup = useCallback(() => {
    const map = new Map<string, CountryStat>();
    stats.forEach((s) => map.set(s.country_code, s));
    return map;
  }, [stats]);

  // Render map
  useEffect(() => {
    if (loading || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll("*").remove();

    const lookup = statsLookup();

    // Color scale
    const maxTracks = Math.max(...stats.map((s) => s.track_count));
    const colorScale = d3
      .scaleSequentialLog(d3.interpolateOrRd)
      .domain([1, maxTracks]);

    // Projection
    const projection = d3
      .geoNaturalEarth1()
      .fitSize([width, height], { type: "Sphere" } as d3.GeoPermissibleObjects);

    const path = d3.geoPath().projection(projection);

    // Load world topology
    d3.json(WORLD_TOPO_URL).then((world: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const worldData = world as any;
      const countries = topojson.feature(
        worldData,
        worldData.objects.countries
      );

      // Draw countries
      svg
        .append("g")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .selectAll("path")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .data((countries as any).features)
        .join("path")
        .attr("class", "country-path")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("d", path as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr("fill", (d: any) => {
          const iso3 = d.properties?.iso_a3 || d.id;
          const iso2 = ISO3_TO_ISO2[iso3];
          const stat = iso2 ? lookup.get(iso2) : null;
          if (stat) {
            return colorScale(stat.track_count);
          }
          return "#1e293b";
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("mouseover", function (event: MouseEvent, d: any) {
          const iso3 = d.properties?.iso_a3 || d.id;
          const iso2 = ISO3_TO_ISO2[iso3];
          const stat = iso2 ? lookup.get(iso2) : null;
          const name = (iso2 && COUNTRY_NAMES[iso2]) || d.properties?.name || "Unknown";

          const tooltip = tooltipRef.current;
          if (tooltip) {
            if (stat) {
              tooltip.innerHTML = `
                <div class="font-bold text-white">${name}</div>
                <div class="text-orange-400 text-lg font-bold mt-1">${stat.track_count.toLocaleString()} tracks</div>
                <div class="text-slate-300 text-sm">${stat.artist_count.toLocaleString()} artists</div>
                <div class="text-slate-400 text-xs mt-2">Top: ${stat.top_artists.slice(0, 3).join(", ")}</div>
                <div class="text-slate-500 text-xs mt-1">Click to explore →</div>
              `;
            } else {
              tooltip.innerHTML = `
                <div class="font-bold text-white">${name}</div>
                <div class="text-slate-400 text-sm mt-1">No data available</div>
              `;
            }
            tooltip.style.display = "block";
            tooltip.style.left = event.pageX + 12 + "px";
            tooltip.style.top = event.pageY - 10 + "px";
          }
        })
        .on("mousemove", function (event: MouseEvent) {
          const tooltip = tooltipRef.current;
          if (tooltip) {
            tooltip.style.left = event.pageX + 12 + "px";
            tooltip.style.top = event.pageY - 10 + "px";
          }
        })
        .on("mouseout", function () {
          const tooltip = tooltipRef.current;
          if (tooltip) {
            tooltip.style.display = "none";
          }
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("click", function (_event: MouseEvent, d: any) {
          const iso3 = d.properties?.iso_a3 || d.id;
          const iso2 = ISO3_TO_ISO2[iso3];
          const stat = iso2 ? lookup.get(iso2) : null;
          if (stat) {
            setSelectedCountry(stat);
          }
        });

      // Add zoom
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
          svg.select("g").attr("transform", event.transform);
        });

      svg.call(zoom);
    });
  }, [loading, stats, statsLookup]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-lg">Loading map data...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex">
      {/* Map area */}
      <div className="flex-1 relative">
        <svg
          ref={svgRef}
          className="w-full h-[calc(100vh-80px)]"
          preserveAspectRatio="xMidYMid meet"
        />
        <div ref={tooltipRef} className="map-tooltip hidden" />

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-4">
          <div className="text-xs text-slate-400 mb-2 font-medium">Tracks extracted for AI training</div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">0</span>
            <div className="w-32 h-3 rounded" style={{
              background: "linear-gradient(to right, #1e293b, #fca5a5, #ef4444, #991b1b)"
            }} />
            <span className="text-xs text-slate-500">3M+</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Total: {stats.reduce((sum, s) => sum + s.track_count, 0).toLocaleString()} tracks across {stats.length} countries
          </div>
        </div>

        {/* Stats bar */}
        <div className="absolute top-4 left-6 flex gap-4">
          <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold text-orange-400">
              {stats.reduce((sum, s) => sum + s.track_count, 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Total tracks</div>
          </div>
          <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold text-orange-400">
              {stats.reduce((sum, s) => sum + s.artist_count, 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Artists affected</div>
          </div>
          <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold text-orange-400">{stats.length}</div>
            <div className="text-xs text-slate-400">Countries</div>
          </div>
        </div>
      </div>

      {/* Side panel (shown when country is selected) */}
      {selectedCountry && (
        <CountryPanel
          country={selectedCountry}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </div>
  );
}
