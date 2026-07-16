"use client";

import { useState, useRef, useCallback } from "react";

interface MusicMatch {
  title: string;
  artists: { name: string }[];
  album?: { name: string };
  label?: string;
  release_date?: string;
  genres?: { name: string }[];
  score: number;
  external_ids?: {
    isrc?: string;
  };
  external_metadata?: {
    spotify?: { track?: { id: string } };
    youtube?: { vid?: string };
  };
}

interface AiDetection {
  start: number;
  end: number;
  prediction: string;
  likely_source: string;
  ai_probability: number;
  duration: number;
  stem: string;
  source_probabilities?: { source: string; probability: number }[];
  model_id?: string;
  segments?: { start: number; end: number; prediction: string; likely_source: string; ai_probability: number }[];
}

interface IdentifyResult {
  status: { code: number; msg: string };
  file_id?: string;
  duration?: number;
  results?: {
    ai_detection?: AiDetection[];
    music?: MusicResult[];
  };
  error?: string;
}

interface MusicResult {
  offset?: number;
  played_duration?: number;
  result?: {
    title?: string;
    artists?: { name: string }[];
    album?: { name: string };
    label?: string;
    release_date?: string;
    genres?: { name: string }[];
    score?: number;
    duration_ms?: number;
    external_ids?: { isrc?: string; upc?: string };
    external_metadata?: {
      spotify?: { track?: { id?: string; name?: string }; artists?: { name: string }[] };
      youtube?: { vid?: string };
    };
  };
}

type ListenState = "idle" | "listening" | "processing" | "result" | "error";

export default function ListenButton() {
  const [state, setState] = useState<ListenState>("idle");
  const [aiResults, setAiResults] = useState<AiDetection[]>([]);
  const [musicResults, setMusicResults] = useState<MusicResult[]>([]);
  const [error, setError] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const identifyAudio = useCallback(async (blob: Blob, filename: string) => {
    setState("processing");

    const formData = new FormData();
    formData.append("audio", blob, filename);

    try {
      const response = await fetch("/api/identify", {
        method: "POST",
        body: formData,
      });

      const data: IdentifyResult = await response.json();

      if (data.status?.code === 0 && data.results?.ai_detection?.length) {
        setAiResults(data.results.ai_detection);
        setMusicResults(data.results.music || []);
        setState("result");
      } else if (data.status?.code === 2 && data.file_id) {
        // Still processing — poll the status endpoint
        await pollForResults(data.file_id);
      } else if (data.status?.code === 1001) {
        setError("Could not analyze this audio. Try a longer or clearer clip.");
        setState("error");
      } else if (data.error) {
        setError(data.error);
        setState("error");
      } else {
        setError(data.status?.msg || "Analysis failed. Please try again.");
        setState("error");
      }
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    }
  }, []);

  const pollForResults = useCallback(async (fileId: string) => {
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        const r = await fetch(`/api/identify-status?file_id=${fileId}`);
        const data = await r.json();

        if (data.state === 1 && data.results?.ai_detection?.length) {
          setAiResults(data.results.ai_detection);
          setMusicResults(data.results.music || []);
          setState("result");
          return;
        } else if (data.state === -1) {
          setError("Audio could not be analyzed. Upload the original file directly from Suno/Udio (full-length, 2+ minutes, no re-encoding).");
          setState("error");
          return;
        }
        // state === 0: still processing, keep polling
      } catch {
        // Network error, keep trying
      }
    }

    setError("Analysis is taking longer than expected. Please try again with a shorter clip.");
    setState("error");
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError("");
      setAiResults([]);
      setState("listening");
      setShowPanel(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await identifyAudio(blob, "recording.webm");
      };

      mediaRecorder.start(1000);

      // No auto-stop — user controls when to stop
    } catch {
      setError("Microphone access denied. Please allow microphone access or upload a file instead.");
      setState("error");
      setShowPanel(true);
    }
  }, [identifyAudio]);

  const stopListening = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setAiResults([]);
    setShowPanel(true);

    // Check file size (ACRCloud recommends < 1MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Please upload a file under 10MB.");
      setState("error");
      return;
    }

    await identifyAudio(file, file.name);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [identifyAudio]);

  const closePanel = useCallback(() => {
    setShowPanel(false);
    setState("idle");
    setAiResults([]);
    setMusicResults([]);
    setError("");
  }, []);

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.wma,.webm"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Floating action buttons */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full font-medium shadow-lg bg-slate-700 hover:bg-slate-600 text-white transition-all text-sm"
          aria-label="Upload audio file"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload audio
        </button>

        {/* Listen button */}
        <button
          onClick={state === "listening" ? stopListening : startListening}
          className={`flex items-center gap-2 px-5 py-3 rounded-full font-medium shadow-lg transition-all ${
            state === "listening"
              ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          }`}
          aria-label={state === "listening" ? "Stop listening" : "Listen to identify music"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {state === "listening" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
            )}
          </svg>
          {state === "listening" ? "Listening..." : "Listen for AI"}
        </button>
      </div>

      {/* Results panel */}
      {showPanel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
              <h3 className="text-lg font-bold text-white">
                {state === "listening" && "Listening..."}
                {state === "processing" && "Identifying..."}
                {state === "result" && "Original Works Found"}
                {state === "error" && "Result"}
              </h3>
              <button
                onClick={closePanel}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Listening animation */}
              {state === "listening" && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-orange-500 rounded-full animate-pulse"
                        style={{
                          height: `${20 + Math.random() * 30}px`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-slate-300">Play a song near your microphone</p>
                  <p className="text-slate-500 text-sm mt-1">Press stop when ready</p>
                  <button
                    onClick={stopListening}
                    className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm text-white font-medium"
                  >
                    Stop recording
                  </button>
                </div>
              )}

              {/* Processing */}
              {state === "processing" && (
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-slate-300">Analyzing audio fingerprint...</p>
                  <p className="text-slate-500 text-sm mt-1">Checking against millions of tracks</p>
                </div>
              )}

              {/* Results */}
              {state === "result" && aiResults.length > 0 && (
                <div className="space-y-4">
                  {/* Main verdict */}
                  {(() => {
                    const original = aiResults.find(r => r.stem === "original") || aiResults[0];
                    const isAI = original.prediction === "ai_generated";
                    const isNoVocals = original.prediction === "no_vocals";
                    return (
                      <div className={`text-center p-5 rounded-xl border ${
                        isAI ? "bg-red-500/10 border-red-500/30" :
                        isNoVocals ? "bg-slate-500/10 border-slate-500/30" :
                        "bg-green-500/10 border-green-500/30"
                      }`}>
                        <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide ${
                          isAI ? "bg-red-500/20 text-red-400" :
                          isNoVocals ? "bg-slate-500/20 text-slate-300" :
                          "bg-green-500/20 text-green-400"
                        }`}>
                          {isAI ? "AI Generated" : isNoVocals ? "No Vocals Detected" : "Human Created"}
                        </div>
                        <div className={`text-3xl font-bold mt-3 ${
                          isAI ? "text-red-400" : isNoVocals ? "text-slate-300" : "text-green-400"
                        }`}>
                          {original.ai_probability.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">AI probability</div>
                        {isAI && (
                          <div className="mt-2 inline-block px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30">
                            <span className="text-sm text-orange-400 font-medium">
                              Likely source: {original.likely_source}
                            </span>
                          </div>
                        )}
                        {!isAI && !isNoVocals && (
                          <div className="text-sm text-slate-400 mt-2">
                            This audio appears to be human-created
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Duration */}
                  {(() => {
                    const original = aiResults.find(r => r.stem === "original") || aiResults[0];
                    const dur = original.duration;
                    const minutes = Math.floor(dur / 60);
                    const seconds = Math.round(dur % 60);
                    return (
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Analyzed clip: {minutes > 0 ? `${minutes}m ` : ""}{seconds}s</span>
                      </div>
                    );
                  })()}

                  {/* Source probabilities bar chart - collapsible */}
                  {(() => {
                    const original = aiResults.find(r => r.stem === "original") || aiResults[0];
                    if (!original.source_probabilities?.length) return null;
                    const sorted = [...original.source_probabilities].sort((a, b) => b.probability - a.probability);
                    const maxProb = sorted[0]?.probability || 100;
                    return (
                      <details className="bg-slate-800 rounded-xl border border-slate-700">
                        <summary className="p-4 cursor-pointer text-xs text-slate-400 font-medium uppercase tracking-wide hover:text-slate-300 transition-colors">
                          Source Probabilities
                        </summary>
                        <div className="px-4 pb-4 space-y-2.5">
                          {sorted.map((sp) => (
                            <div key={sp.source}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-300 font-medium">{sp.source}</span>
                                <span className="text-xs text-slate-400 font-mono">{sp.probability.toFixed(1)}%</span>
                              </div>
                              <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    sp.probability === maxProb ? "bg-orange-500" : "bg-orange-500/50"
                                  }`}
                                  style={{ width: `${Math.max(sp.probability, 1)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    );
                  })()}

                  {/* Stem analysis cards - collapsible */}
                  {aiResults.length > 1 && (
                    <details className="bg-slate-800 rounded-xl border border-slate-700">
                      <summary className="p-4 cursor-pointer text-xs text-slate-400 font-medium uppercase tracking-wide hover:text-slate-300 transition-colors">
                        Stem Analysis
                      </summary>
                      <div className="px-4 pb-4 space-y-2">
                        {aiResults.map((r) => {
                          const stemIsAI = r.prediction === "ai_generated";
                          const stemIsNoVocals = r.prediction === "no_vocals";
                          return (
                            <div key={r.stem} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    stemIsAI ? "bg-red-400" : stemIsNoVocals ? "bg-slate-400" : "bg-green-400"
                                  }`} />
                                  <span className="text-sm text-white font-medium capitalize">{r.stem}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    stemIsAI ? "bg-red-500/20 text-red-400" :
                                    stemIsNoVocals ? "bg-slate-500/20 text-slate-400" :
                                    "bg-green-500/20 text-green-400"
                                  }`}>
                                    {stemIsAI ? "AI" : stemIsNoVocals ? "No Vocals" : "Human"}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono">
                                    {r.ai_probability.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              {stemIsAI && r.likely_source && (
                                <div className="text-xs text-slate-500 mt-1.5 ml-4">
                                  Source: {r.likely_source}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}

                  {/* Timeline segments - collapsible */}
                  {aiResults.some(r => r.segments && r.segments.length > 0) && (
                    <details className="bg-slate-800 rounded-xl border border-slate-700">
                      <summary className="p-4 cursor-pointer text-xs text-slate-400 font-medium uppercase tracking-wide hover:text-slate-300 transition-colors">
                        Timeline Segments
                      </summary>
                      <div className="px-4 pb-4 space-y-3">
                        {aiResults.filter(r => r.segments && r.segments.length > 0).map((r) => {
                          const totalDuration = r.duration || r.end - r.start || 1;
                          return (
                            <div key={`timeline-${r.stem}`} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                              <div className="text-xs text-slate-300 font-medium capitalize mb-2">{r.stem}</div>
                              {/* Timeline bar */}
                              <div className="relative h-6 bg-slate-700 rounded-full overflow-hidden flex">
                                {r.segments!.map((seg, i) => {
                                  const segDuration = seg.end - seg.start;
                                  const widthPct = (segDuration / totalDuration) * 100;
                                  const segIsAI = seg.prediction === "ai_generated";
                                  const segIsNoVocals = seg.prediction === "no_vocals";
                                  return (
                                    <div
                                      key={i}
                                      className={`h-full ${
                                        segIsAI ? "bg-red-500/70" :
                                        segIsNoVocals ? "bg-slate-500/70" :
                                        "bg-green-500/70"
                                      } ${i > 0 ? "border-l border-slate-900/50" : ""}`}
                                      style={{ width: `${widthPct}%` }}
                                      title={`${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s: ${seg.prediction} (${seg.ai_probability}%)`}
                                    />
                                  );
                                })}
                              </div>
                              {/* Time markers */}
                              <div className="flex justify-between mt-1">
                                <span className="text-[10px] text-slate-500">0s</span>
                                {totalDuration > 10 && (
                                  <span className="text-[10px] text-slate-500">{Math.round(totalDuration / 2)}s</span>
                                )}
                                <span className="text-[10px] text-slate-500">{Math.round(totalDuration)}s</span>
                              </div>
                              {/* Legend */}
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-red-500/70" />
                                  <span className="text-[10px] text-slate-500">AI</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-green-500/70" />
                                  <span className="text-[10px] text-slate-500">Human</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-slate-500/70" />
                                  <span className="text-[10px] text-slate-500">No Vocals</span>
                                </div>
                              </div>
                              {/* Segment details */}
                              <div className="mt-2 space-y-1">
                                {r.segments!.map((seg, i) => (
                                  <div key={i} className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-500">
                                      {seg.start.toFixed(1)}s – {seg.end.toFixed(1)}s
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`${
                                        seg.prediction === "ai_generated" ? "text-red-400" :
                                        seg.prediction === "no_vocals" ? "text-slate-400" :
                                        "text-green-400"
                                      }`}>
                                        {seg.prediction === "ai_generated" ? "AI" : seg.prediction === "no_vocals" ? "No Vocals" : "Human"}
                                      </span>
                                      {seg.likely_source && seg.prediction === "ai_generated" && (
                                        <span className="text-slate-500">({seg.likely_source})</span>
                                      )}
                                      <span className="text-slate-500 font-mono">{seg.ai_probability}%</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}

                  {/* Model version footer */}
                  {(() => {
                    const modelId = aiResults.find(r => r.model_id)?.model_id;
                    if (!modelId) return null;
                    return (
                      <div className="text-center pt-2 border-t border-slate-700/50">
                        <span className="text-[10px] text-slate-500">
                          Model: {modelId}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Music identification (Shazam-like) */}
                  {musicResults.length > 0 && (
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                      <h4 className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">
                        🎵 Song Identified
                      </h4>
                      {musicResults.slice(0, 3).map((m, i) => {
                        const r = m.result;
                        if (!r) return null;
                        return (
                          <div key={i} className={`${i > 0 ? "mt-3 pt-3 border-t border-slate-700/50" : ""}`}>
                            <div className="font-bold text-white text-sm">{r.title}</div>
                            <div className="text-orange-400 text-sm">
                              {r.artists?.map(a => a.name).join(", ")}
                            </div>
                            {r.album && (
                              <div className="text-xs text-slate-400 mt-1">Album: {r.album.name}</div>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                              {r.label && (
                                <span className="text-xs text-slate-500">Label: {r.label}</span>
                              )}
                              {r.release_date && (
                                <span className="text-xs text-slate-500">Released: {r.release_date}</span>
                              )}
                              {r.genres && r.genres.length > 0 && (
                                <span className="text-xs text-slate-500">Genre: {r.genres.map(g => g.name).join(", ")}</span>
                              )}
                              {r.external_ids?.isrc && (
                                <span className="text-xs text-slate-500 font-mono">ISRC: {r.external_ids.isrc}</span>
                              )}
                            </div>
                            {/* Links */}
                            <div className="flex gap-3 mt-2">
                              {r.external_metadata?.spotify?.track?.id && (
                                <a
                                  href={`https://open.spotify.com/track/${r.external_metadata.spotify.track.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-green-400 hover:text-green-300 underline"
                                >
                                  Open in Spotify
                                </a>
                              )}
                              {r.external_metadata?.youtube?.vid && (
                                <a
                                  href={`https://youtube.com/watch?v=${r.external_metadata.youtube.vid}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-red-400 hover:text-red-300 underline"
                                >
                                  YouTube
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setState("idle");
                        setAiResults([]);
                        startListening();
                      }}
                      className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      Listen again
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      Upload file
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {state === "error" && (
                <div className="text-center">
                  <p className="text-slate-300">{error}</p>
                  <div className="flex gap-2 mt-4 justify-center">
                    <button
                      onClick={() => {
                        setState("idle");
                        startListening();
                      }}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-sm"
                    >
                      Try mic again
                    </button>
                    <button
                      onClick={() => {
                        setState("idle");
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm"
                    >
                      Upload file instead
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
