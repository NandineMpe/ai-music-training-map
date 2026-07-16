import WorldMap from "./components/WorldMap";
import ListenButton from "./components/ListenButton";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1f1f1f] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              AI Music Training Data Map
            </h1>
            <p className="text-sm text-[#6b6b6b] mt-0.5">
              Tracks from the LAION-DISCO-12M dataset, mapped by artist country of origin
            </p>
          </div>
          <div className="text-right text-xs text-[#6b6b6b]">
            <p>Based on <a href="https://www.theatlantic.com/technology/2026/06/dataset-laion-disco-12m/687508/" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white underline underline-offset-2">The Atlantic&apos;s AI Watchdog</a></p>
            <p className="mt-0.5">Country data via <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white underline underline-offset-2">MusicBrainz</a></p>
          </div>
        </div>
      </header>

      {/* Dataset info banner */}
      <div className="border-b border-[#1f1f1f] px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-white/40"></span>
            <span className="text-xs text-[#6b6b6b]">Coverage</span>
          </div>
          <div className="flex-1 max-w-xs">
            <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div className="h-full bg-white/30 rounded-full transition-all" style={{ width: "3.4%" }} />
            </div>
          </div>
          <span className="text-xs text-[#6b6b6b]">460,000 of 12.3M tracks mapped across 77 countries (2,683 artists)</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <WorldMap />
      </div>

      {/* Listen for AI button */}
      <ListenButton />
    </main>
  );
}
