"use client";

import { useState, useEffect, useCallback } from "react";

interface ArtistData {
  name: string;
  track_count: number;
  total_recordings?: number;
  label?: string;
  type?: string;
  country_code: string;
}

interface ArtistEvidencePopoverProps {
  artist: ArtistData;
  onClose: () => void;
}

const DATASET_INFO = {
  name: "LAION-DISCO-12M",
  repo_url: "https://huggingface.co/datasets/laion/LAION-DISCO-12M",
  commit_sha: "a1b2c3d4e5f6", // Short placeholder — would be real in production
  retrieved_at: "2026-07-15T09:00:00Z",
  total_tracks: 12_320_916,
  manifest_note: "Parquet metadata indexed from Hugging Face dataset viewer",
};

const DISCLAIMER = `What this record shows: these tracks were listed in a publicly circulating AI training dataset at the date shown, in a collection distributed to and downloaded by AI developers. What it does not show: that any specific AI company or model trained on these tracks. Presence establishes availability and circulation — evidence of access, not proof of use. This is information, not legal advice.`;

export default function ArtistEvidencePopover({ artist, onClose }: ArtistEvidencePopoverProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "provenance">("summary");
  const [copied, setCopied] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Deep link
  useEffect(() => {
    const slug = artist.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const url = new URL(window.location.href);
    url.searchParams.set("artist", slug);
    window.history.replaceState({}, "", url.toString());
    return () => {
      const restoreUrl = new URL(window.location.href);
      restoreUrl.searchParams.delete("artist");
      window.history.replaceState({}, "", restoreUrl.toString());
    };
  }, [artist.name]);

  const pctInclusion = artist.total_recordings && artist.total_recordings > 0
    ? Math.min(Math.round((artist.track_count / artist.total_recordings) * 100), 100)
    : null;

  const generateCitation = useCallback(() => {
    const date = new Date(DATASET_INFO.retrieved_at).toISOString().split("T")[0];
    return `"${artist.name}" — ${artist.track_count} tracks in ${DATASET_INFO.name} (commit ${DATASET_INFO.commit_sha}), archived ${date}, https://ai-music-training-map.vercel.app`;
  }, [artist]);

  const copyCitation = useCallback(() => {
    navigator.clipboard.writeText(generateCitation());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generateCitation]);

  const downloadEvidence = useCallback(() => {
    const evidence = {
      generated_at: new Date().toISOString(),
      generator: {
        site: "https://ai-music-training-map.vercel.app",
        version: "1.0.0",
      },
      artist: {
        display_name: artist.name,
        country: artist.country_code,
        type: artist.type || "Unknown",
        label: artist.label || "Unknown",
      },
      stats: {
        tracks_in_dataset: artist.track_count,
        total_catalog_recordings: artist.total_recordings || null,
        catalog_inclusion_pct: pctInclusion,
      },
      snapshots: [{
        dataset: DATASET_INFO.name,
        repo_url: DATASET_INFO.repo_url,
        commit_sha: DATASET_INFO.commit_sha,
        retrieved_at: DATASET_INFO.retrieved_at,
        manifest_note: DATASET_INFO.manifest_note,
      }],
      disclaimer: DISCLAIMER,
    };

    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence_${artist.name.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [artist, pctInclusion]);

  const downloadCSV = useCallback(() => {
    const BOM = "\uFEFF";
    const headers = ["Artist", "Country", "Tracks in Dataset", "Total Catalog", "Catalog %", "Label", "Type", "Dataset", "Repo URL", "Retrieved At"];
    const row = [
      artist.name,
      artist.country_code,
      artist.track_count.toString(),
      artist.total_recordings?.toString() || "",
      pctInclusion !== null ? `${pctInclusion}%` : "",
      artist.label || "",
      artist.type || "",
      DATASET_INFO.name,
      DATASET_INFO.repo_url,
      DATASET_INFO.retrieved_at,
    ];

    const csv = BOM + headers.join(",") + "\n" + row.map(v => `"${v}"`).join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence_${artist.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [artist, pctInclusion]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="evidence-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="evidence-title" className="text-xl font-bold text-white">{artist.name}</h2>
              <p className="text-sm text-slate-400 mt-0.5">Evidence Record</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 -mt-1 -mr-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "summary" ? "bg-orange-500/20 text-orange-400" : "text-slate-400 hover:text-white"
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab("provenance")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "provenance" ? "bg-orange-500/20 text-orange-400" : "text-slate-400 hover:text-white"
              }`}
            >
              Provenance
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "summary" && (
            <div className="space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <div className="text-lg font-bold text-orange-400">{artist.track_count.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">Tracks in dataset</div>
                </div>
                {pctInclusion !== null && (
                  <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                    <div className="text-lg font-bold text-orange-400">{pctInclusion}%</div>
                    <div className="text-xs text-slate-400">Catalog included</div>
                  </div>
                )}
                {artist.total_recordings && (
                  <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                    <div className="text-lg font-bold text-white">{artist.total_recordings.toLocaleString()}</div>
                    <div className="text-xs text-slate-400">Total recordings (MusicBrainz)</div>
                  </div>
                )}
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <div className="text-lg font-bold text-white">1</div>
                  <div className="text-xs text-slate-400">Datasets containing</div>
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Label</span>
                  <span className="text-white">{artist.label || "Unknown"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Type</span>
                  <span className="text-white">{artist.type || "Unknown"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Country</span>
                  <span className="text-white">{artist.country_code}</span>
                </div>
              </div>

              {/* Dataset chip */}
              <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  <span className="text-xs text-orange-400 font-medium">{DATASET_INFO.name}</span>
                </span>
                <span className="text-xs text-slate-500">Retrieved {new Date(DATASET_INFO.retrieved_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {activeTab === "provenance" && (
            <div className="space-y-4">
              {/* Dataset source */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3">
                <h4 className="text-xs text-slate-400 font-medium uppercase tracking-wide">Source</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Repository</span>
                    <a href={DATASET_INFO.repo_url} target="_blank" rel="noopener noreferrer nofollow" className="text-orange-400 hover:text-orange-300 underline text-right max-w-[200px] truncate">
                      huggingface.co/datasets/laion/LAION-DISCO-12M
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Commit</span>
                    <code className="text-xs text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">{DATASET_INFO.commit_sha}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Retrieved</span>
                    <span className="text-slate-300">{new Date(DATASET_INFO.retrieved_at).toUTCString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total tracks in dataset</span>
                    <span className="text-slate-300">{DATASET_INFO.total_tracks.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Integrity */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3">
                <h4 className="text-xs text-slate-400 font-medium uppercase tracking-wide">Integrity</h4>
                <div className="text-sm text-slate-300">
                  <p>Manifest indexed from Parquet metadata via Hugging Face datasets API.</p>
                  <p className="mt-2 text-xs text-slate-500">Country attribution via MusicBrainz (musicbrainz.org), queried at ingest time.</p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  {DISCLAIMER}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={downloadEvidence}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download JSON
            </button>
            <button
              onClick={downloadCSV}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download CSV
            </button>
          </div>
          <button
            onClick={copyCitation}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-slate-600 hover:border-slate-500 rounded-lg text-slate-300 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? "Copied!" : "Copy citation"}
          </button>
        </div>
      </div>
    </div>
  );
}
