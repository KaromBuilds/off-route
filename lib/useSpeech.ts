"use client";

import { useCallback, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useSpeech(lang: string) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<any>(null);
  const supported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const start = useCallback((onText: (t: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Voice is not supported in this browser. Type the report when stopped."); return; }
    const r = new SR();
    r.lang = lang;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => onText(String(e.results[0][0].transcript));
    r.onerror = (e: any) => setError(e.error === "not-allowed" ? "Microphone permission is off." : "Didn't catch that. Try again.");
    r.onend = () => setListening(false);
    rec.current = r;
    setError(null);
    setListening(true);
    r.start();
  }, [lang]);

  const stop = useCallback(() => { rec.current?.stop(); setListening(false); }, []);
  return { supported, listening, error, start, stop };
}
