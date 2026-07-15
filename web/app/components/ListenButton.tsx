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

interface IdentifyResult {
  status: { code: number; msg: string };
  metadata?: {
    music?: MusicMatch[];
    humming?: MusicMatch[];
    custom_files?: MusicMatch[];
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

      if (data.status?.code === 0) {
        const matches = data.metadata?.music
          || data.metadata?.humming
          || data.metadata?.custom_files
          || [];
        if (matches.length > 0) {
          setResults(matches);
          setState("result");
        } else {
          setError("Audio recognized but no matching original tracks found.");
          setState("error");
        }
      } else if (data.status?.code === 1001) {
        setError("No match found. Try a different song or upload a clearer audio file.");
        setState("error");
      } else if (data.status?.code === 2004) {
        setError("Could not process the audio. Try uploading an MP3 or WAV file instead.");
        setState("error");
      } else {
        setError(`ACRCloud response: ${data.status?.msg} (code ${data.status?.code}). Try uploading an MP3 file.`);
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

      // Auto-stop after 12 seconds
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 12000);
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
    setResults([]);
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
    setResults([]);
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
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
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
                  <p className="text-slate-500 text-sm mt-1">Recording for 12 seconds...</p>
                  <button
                    onClick={stopListening}
                    className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white"
                  >
                    Stop early
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
              {state === "result" && results.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400 mb-3">
                    This audio matches the following original works:
                  </p>
                  {results.map((match, i) => (
                    <div
                      key={i}
                      className="bg-slate-800 rounded-xl p-4 border border-slate-700"
                    >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-white truncate">{match.title}</h4>
                          <p className="text-orange-400 text-sm">
                            {match.artists?.map((a) => a.name).join(", ")}
                          </p>
                          {match.album && (
                            <p className="text-slate-400 text-xs mt-1">
                              Album: {match.album.name}
                            </p>
                          )}
                          {match.release_date && (
                            <p className="text-slate-500 text-xs">
                              Released: {match.release_date}
                            </p>
                          )}
                          {match.label && (
                            <p className="text-slate-500 text-xs">
                              Label: {match.label}
                            </p>
                          )}
                        </div>

                      {/* External links */}
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {match.external_metadata?.spotify?.track?.id && (
                          <a
                            href={`https://open.spotify.com/track/${match.external_metadata.spotify.track.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-400 hover:text-green-300 underline"
                          >
                            Spotify
                          </a>
                        )}
                        {match.external_metadata?.youtube?.vid && (
                          <a
                            href={`https://youtube.com/watch?v=${match.external_metadata.youtube.vid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-red-400 hover:text-red-300 underline"
                          >
                            YouTube
                          </a>
                        )}
                        {match.external_ids?.isrc && (
                          <span className="text-xs text-slate-500">
                            ISRC: {match.external_ids.isrc}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setState("idle");
                        setResults([]);
                        startListening();
                      }}
                      className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-sm font-medium"
                    >
                      Listen again
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium"
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
