import WorldMap from "./components/WorldMap";
import ListenButton from "./components/ListenButton";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              AI Music Training Data Map
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Tracks from the LAION-DISCO-12M dataset, mapped by artist country of origin
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Based on <a href="https://www.theatlantic.com/technology/2026/06/dataset-laion-disco-12m/687508/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">The Atlantic&apos;s AI Watchdog</a> investigation</p>
            <p className="mt-1">Country data via <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">MusicBrainz</a></p>
          </div>
        </div>
      </header>

      {/* Progress banner */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="text-xs text-slate-400">Processing dataset</span>
          </div>
          <div className="flex-1 max-w-xs">
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: "3.4%" }} />
            </div>
          </div>
          <span className="text-xs text-slate-500">~417,000 tracks mapped across 73 countries (2,206 artists) — processing continues</span>
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
