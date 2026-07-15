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

// ISO 3166-1 numeric to Alpha-2 mapping (world-atlas uses numeric IDs)
const NUMERIC_TO_ISO2: Record<string, string> = {
  "004": "AF", "008": "AL", "012": "DZ", "016": "AS", "020": "AD",
  "024": "AO", "028": "AG", "032": "AR", "036": "AU", "040": "AT",
  "044": "BS", "048": "BH", "050": "BD", "051": "AM", "052": "BB",
  "056": "BE", "060": "BM", "064": "BT", "068": "BO", "070": "BA",
  "072": "BW", "076": "BR", "084": "BZ", "090": "SB", "092": "VG",
  "096": "BN", "100": "BG", "104": "MM", "108": "BI", "112": "BY",
  "116": "KH", "120": "CM", "124": "CA", "132": "CV", "140": "CF",
  "144": "LK", "148": "TD", "152": "CL", "156": "CN", "158": "TW",
  "170": "CO", "174": "KM", "178": "CG", "180": "CD", "184": "CK",
  "188": "CR", "191": "HR", "192": "CU", "196": "CY", "203": "CZ",
  "204": "BJ", "208": "DK", "212": "DM", "214": "DO", "218": "EC",
  "222": "SV", "226": "GQ", "231": "ET", "232": "ER", "233": "EE",
  "234": "FO", "238": "FK", "242": "FJ", "246": "FI", "250": "FR",
  "254": "GF", "258": "PF", "260": "TF", "262": "DJ", "266": "GA",
  "268": "GE", "270": "GM", "275": "PS", "276": "DE", "288": "GH",
  "296": "KI", "300": "GR", "304": "GL", "308": "GD", "312": "GP",
  "316": "GU", "320": "GT", "324": "GN", "328": "GY", "332": "HT",
  "336": "VA", "340": "HN", "344": "HK", "348": "HU", "352": "IS",
  "356": "IN", "360": "ID", "364": "IR", "368": "IQ", "372": "IE",
  "376": "IL", "380": "IT", "384": "CI", "388": "JM", "392": "JP",
  "398": "KZ", "400": "JO", "404": "KE", "408": "KP", "410": "KR",
  "414": "KW", "417": "KG", "418": "LA", "422": "LB", "426": "LS",
  "428": "LV", "430": "LR", "434": "LY", "438": "LI", "440": "LT",
  "442": "LU", "446": "MO", "450": "MG", "454": "MW", "458": "MY",
  "462": "MV", "466": "ML", "470": "MT", "474": "MQ", "478": "MR",
  "480": "MU", "484": "MX", "492": "MC", "496": "MN", "498": "MD",
  "499": "ME", "500": "MS", "504": "MA", "508": "MZ", "512": "OM",
  "516": "NA", "520": "NR", "524": "NP", "528": "NL", "531": "CW",
  "533": "AW", "540": "NC", "548": "VU", "554": "NZ", "558": "NI",
  "562": "NE", "566": "NG", "570": "NU", "574": "NF", "578": "NO",
  "580": "MP", "583": "FM", "584": "MH", "585": "PW", "586": "PK",
  "591": "PA", "598": "PG", "600": "PY", "604": "PE", "608": "PH",
  "612": "PN", "616": "PL", "620": "PT", "624": "GW", "626": "TL",
  "630": "PR", "634": "QA", "638": "RE", "642": "RO", "643": "RU",
  "646": "RW", "652": "BL", "654": "SH", "659": "KN", "660": "AI",
  "662": "LC", "663": "MF", "666": "PM", "670": "VC", "674": "SM",
  "678": "ST", "682": "SA", "686": "SN", "688": "RS", "690": "SC",
  "694": "SL", "702": "SG", "703": "SK", "704": "VN", "705": "SI",
  "706": "SO", "710": "ZA", "716": "ZW", "720": "YE", "724": "ES",
  "728": "SS", "729": "SD", "732": "EH", "736": "SD", "740": "SR",
  "744": "SJ", "748": "SZ", "752": "SE", "756": "CH", "760": "SY",
  "762": "TJ", "764": "TH", "768": "TG", "772": "TK", "776": "TO",
  "780": "TT", "784": "AE", "788": "TN", "792": "TR", "795": "TM",
  "796": "TC", "798": "TV", "800": "UG", "804": "UA", "807": "MK",
  "818": "EG", "826": "GB", "831": "GG", "832": "JE", "833": "IM",
  "834": "TZ", "840": "US", "850": "VI", "854": "BF", "858": "UY",
  "860": "UZ", "862": "VE", "876": "WF", "882": "WS", "887": "YE",
  "894": "ZM",
  // Also handle string IDs that might come as numbers without leading zeros
  "4": "AF", "8": "AL", "12": "DZ", "16": "AS", "20": "AD",
  "24": "AO", "28": "AG", "32": "AR", "36": "AU", "40": "AT",
  "44": "BS", "48": "BH", "50": "BD", "51": "AM", "52": "BB",
  "56": "BE", "60": "BM", "64": "BT", "68": "BO", "70": "BA",
  "72": "BW", "76": "BR", "84": "BZ", "90": "SB", "92": "VG",
  "96": "BN",
};

// Country display names
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
  RS: "Serbia", AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AO: "Angola",
  BD: "Bangladesh", BY: "Belarus", BA: "Bosnia and Herzegovina", BG: "Bulgaria",
  MM: "Myanmar", KH: "Cambodia", CM: "Cameroon", TD: "Chad", CD: "DR Congo",
  CG: "Congo", CR: "Costa Rica", CU: "Cuba", CY: "Cyprus", DO: "Dominican Republic",
  EC: "Ecuador", SV: "El Salvador", EE: "Estonia", ET: "Ethiopia", GA: "Gabon",
  GE: "Georgia", GT: "Guatemala", HN: "Honduras", IS: "Iceland", IQ: "Iraq",
  IR: "Iran", JO: "Jordan", KZ: "Kazakhstan", KW: "Kuwait", LB: "Lebanon",
  LY: "Libya", LT: "Lithuania", LV: "Latvia", MG: "Madagascar", MY: "Malaysia",
  ML: "Mali", MN: "Mongolia", MZ: "Mozambique", NA: "Namibia", NP: "Nepal",
  NI: "Nicaragua", PK: "Pakistan", PA: "Panama", PY: "Paraguay", QA: "Qatar",
  SA: "Saudi Arabia", SN: "Senegal", SG: "Singapore", SK: "Slovakia",
  SI: "Slovenia", SO: "Somalia", SS: "South Sudan", SD: "Sudan", SR: "Suriname",
  SY: "Syria", TJ: "Tajikistan", TN: "Tunisia", TM: "Turkmenistan",
  UG: "Uganda", AE: "United Arab Emirates", UY: "Uruguay", UZ: "Uzbekistan",
  VE: "Venezuela", ZW: "Zimbabwe", ZM: "Zambia", BF: "Burkina Faso",
  LK: "Sri Lanka", TT: "Trinidad and Tobago", SZ: "Eswatini", LS: "Lesotho",
  BW: "Botswana", MK: "North Macedonia", ME: "Montenegro",
};

const WORLD_TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function WorldMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<CountryStat[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryStat | null>(null);
  const [loading, setLoading] = useState(true);

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

  const statsLookup = useCallback(() => {
    const map = new Map<string, CountryStat>();
    stats.forEach((s) => map.set(s.country_code, s));
    return map;
  }, [stats]);

  // Get ISO2 code from a TopoJSON feature
  const getIso2 = useCallback((feature: { id?: string | number; properties?: { name?: string } }) => {
    const id = String(feature.id || "");
    return NUMERIC_TO_ISO2[id] || null;
  }, []);

  useEffect(() => {
    if (loading || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll("*").remove();

    const lookup = statsLookup();

    const maxTracks = Math.max(...stats.map((s) => s.track_count));
    const colorScale = d3
      .scaleSequentialLog(d3.interpolateOrRd)
      .domain([1, maxTracks]);

    const projection = d3
      .geoNaturalEarth1()
      .fitSize([width, height], { type: "Sphere" } as d3.GeoPermissibleObjects);

    const path = d3.geoPath().projection(projection);

    d3.json(WORLD_TOPO_URL).then((world: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const worldData = world as any;
      const countries = topojson.feature(
        worldData,
        worldData.objects.countries
      );

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
          const iso2 = getIso2(d);
          const stat = iso2 ? lookup.get(iso2) : null;
          if (stat) {
            return colorScale(stat.track_count);
          }
          return "#1e293b";
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("mouseover", function (event: MouseEvent, d: any) {
          const iso2 = getIso2(d);
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
                <div class="text-slate-400 text-sm mt-1">No data yet</div>
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
          const iso2 = getIso2(d);
          const stat = iso2 ? lookup.get(iso2) : null;
          if (stat) {
            setSelectedCountry(stat);
          }
        });

      // Zoom
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
          svg.select("g").attr("transform", event.transform);
        });

      svg.call(zoom);
    });
  }, [loading, stats, statsLookup, getIso2]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-lg">Loading map data...</div>
      </div>
    );
  }

  const totalTracks = stats.reduce((sum, s) => sum + s.track_count, 0);
  const totalArtists = stats.reduce((sum, s) => sum + s.artist_count, 0);

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
            Total: {totalTracks.toLocaleString()} tracks across {stats.length} countries
          </div>
        </div>

        {/* Stats bar */}
        <div className="absolute top-4 left-6 flex gap-4">
          <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold text-orange-400">
              {totalTracks.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Total tracks</div>
          </div>
          <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold text-orange-400">
              {totalArtists.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Artists affected</div>
          </div>
          <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold text-orange-400">{stats.length}</div>
            <div className="text-xs text-slate-400">Countries</div>
          </div>
        </div>
      </div>

      {/* Side panel */}
      {selectedCountry && (
        <CountryPanel
          country={selectedCountry}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </div>
  );
}
