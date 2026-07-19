"use client";

import { useState, useRef, useCallback } from "react";

interface MusicMatch {
  title?: string;
  artists?: { name: string }[];
  album?: { name: string };
  label?: string;
  release_date?: string;
  genres?: { name: string }[];
  score?: number;
  external_ids?: { isrc?: string };
  external_metadata?: {
    spotify?: { track?: { id?: string } };
    youtube?: { vid?: string };
  };
}

interface IdentifyResult {
  status: { code: number; msg: string };
  metadata?: {
    music?: MusicMatch[];
    humming?: MusicMatch[];
  };
}

type ListenState = "idle" | "listening" | "processing" | "result" | "error";

export default function ListenButton() {
  const [state, setState] = useState<ListenState>("idle");
  const [results, setResults] = useState<MusicMatch[]>([]);
  const [error, setError] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const identifyAudio = useCallback(async (blob: Blob, filename: string) => {
    setState("processing");
    const formData = new FormData();
    formData.append("audio", blob, filename);

    try {
      const response = await fetch("/api/identify", { method: "POST", body: formData });
      const data: IdentifyResult = await response.json();

      if (data.status?.code === 0) {
        const matches = data.metadata?.music || data.metadata?.humming || [];
        if (matches.length > 0) {
          setResults(matches);
          setState("result");
        } else {
          setError("No song identified. Try playing the music louder.");
          setState("error");
        }
      } else if (data.status?.code === 1001) {
        setError("No match found. Try again with clearer audio.");
        setState("error");
      } else {
        setError(data.status?.msg || "Recognition failed.");
        setState("error");
      }
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError("");
      setResults([]);
      setState("listening");
      setShowPanel(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus" : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await identifyAudio(blob, "recording.webm");
      };

      mediaRecorder.start(1000);
    } catch {
      setError("Microphone access denied.");
      setState("error");
      setShowPanel(true);
    }
  }, [identifyAudio]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResults([]);
    setShowPanel(true);
    await identifyAudio(file, file.name);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [identifyAudio]);

  const closePanel = useCallback(() => {
    setShowPanel(false);
    setState("idle");
    setResults([]);
    setError("");
  }, []);

  return (
    <>
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />

      {/* Buttons */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#1a1a1a] border border-[#2a2a2a] text-[#a1a1a1] hover:text-white hover:border-[#444] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload audio
        </button>
        <button
          onClick={state === "listening" ? stopListening : startListening}
          className={`flex items-center gap-2 px-5 py-3 rounded-full font-medium transition-all ${
            state === "listening"
              ? "bg-red-600 text-white animate-pulse"
              : "bg-white text-black hover:bg-white/90"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {state === "listening" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
            )}
          </svg>
          {state === "listening" ? "Stop" : "Identify song"}
        </button>
      </div>

      {/* Results panel */}
      {showPanel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={closePanel}>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
              <h3 className="text-lg font-semibold text-white">
                {state === "listening" && "Listening..."}
                {state === "processing" && "Identifying..."}
                {state === "result" && "Song Identified"}
                {state === "error" && "Result"}
              </h3>
              <button onClick={closePanel} className="text-[#6b6b6b] hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {state === "listening" && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-1 bg-white rounded-full animate-pulse" style={{ height: `${20 + Math.random() * 30}px`, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <p className="text-[#a1a1a1]">Play a song near your microphone</p>
                  <p className="text-[#6b6b6b] text-sm mt-1">Press stop when ready</p>
                  <button onClick={stopListening} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white font-medium">
                    Stop recording
                  </button>
                </div>
              )}

              {state === "processing" && (
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-[#a1a1a1]">Identifying song...</p>
                </div>
              )}

              {state === "result" && results.length > 0 && (
                <div className="space-y-4">
                  {results.slice(0, 3).map((match, i) => (
                    <div key={i} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                      <h4 className="font-bold text-white">{match.title}</h4>
                      <p className="text-[#a1a1a1] text-sm">{match.artists?.map(a => a.name).join(", ")}</p>
                      {match.album && <p className="text-[#6b6b6b] text-xs mt-1">Album: {match.album.name}</p>}
                      {match.release_date && <p className="text-[#6b6b6b] text-xs">Released: {match.release_date}</p>}
                      {match.label && <p className="text-[#6b6b6b] text-xs">Label: {match.label}</p>}
                      <div className="flex gap-3 mt-3">
                        {match.external_metadata?.spotify?.track?.id && (
                          <a href={`https://open.spotify.com/track/${match.external_metadata.spotify.track.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:text-green-300 underline">Spotify</a>
                        )}
                        {match.external_metadata?.youtube?.vid && (
                          <a href={`https://youtube.com/watch?v=${match.external_metadata.youtube.vid}`} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:text-red-300 underline">YouTube</a>
                        )}
                        {match.external_ids?.isrc && <span className="text-xs text-[#6b6b6b] font-mono">ISRC: {match.external_ids.isrc}</span>}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => { setState("idle"); setResults([]); startListening(); }} className="flex-1 py-2 bg-white hover:bg-white/90 rounded-lg text-black text-sm font-medium">Listen again</button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 bg-[#2a2a2a] hover:bg-[#333] rounded-lg text-white text-sm font-medium">Upload file</button>
                  </div>
                </div>
              )}

              {state === "error" && (
                <div className="text-center">
                  <p className="text-[#a1a1a1]">{error}</p>
                  <div className="flex gap-2 mt-4 justify-center">
                    <button onClick={() => { setState("idle"); startListening(); }} className="px-4 py-2 bg-white hover:bg-white/90 rounded-lg text-black text-sm font-medium">Try again</button>
                    <button onClick={() => { setState("idle"); fileInputRef.current?.click(); }} className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] rounded-lg text-white text-sm font-medium">Upload file</button>
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
