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

      {/* Map */}
      <div className="flex-1">
        <WorldMap />
      </div>

      {/* Listen for AI button */}
      <ListenButton />
    </main>
  );
}
